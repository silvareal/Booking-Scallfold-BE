import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { Schedule, Session } from '@prisma/client';
import { addHours, getDay, getDaysInMonth, toDate } from 'date-fns';
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz';
import { PrismaService } from 'src/prisma/prisma.service';

enum SessionSlotStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
}

enum SessionStatus {
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
}

enum ScheduleRuleType {
  DATE = 'DATE',
  WEEK_DAY = 'WEEK_DAY',
}

enum ScheduleRuleWeekDays {
  monday = 'monday',
  tuesday = 'tuesday',
  wednesday = 'wednesday',
  thursday = 'wednesday',
  friday = 'wednesday',
  saturday = 'saturday',
}

interface SessionParams {
  status: SessionStatus;
  timeZone: string;
  slots: {
    time: Date;
    status: SessionSlotStatus;
  }[];
}

interface ScheduleParams {
  name: string;
  timeZone: string;
  rules: {
    day: string;
    weekDay: ScheduleRuleWeekDays;
    type: ScheduleRuleType;
    intervals: any;
  }[];
}

export const isValidTimeZone = (tz: unknown): boolean => {
  try {
    if (!Intl || !Intl.DateTimeFormat().resolvedOptions().timeZone) {
      return false;
    }

    if (typeof tz !== 'string') {
      return false;
    }

    // throws an error if timezone is not valid
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (error) {
    return false;
  }
};

@Injectable()
export class SessionService {
  constructor(private readonly prismaService: PrismaService) {}

  async bookSession({ status, timeZone, slots }: SessionParams) {
    if (!isValidTimeZone(timeZone)) {
      throw new BadRequestException('Validation Error', {
        cause: new Error(),
        description:
          'TimeZone is Invalid - https://www.ibm.com/docs/en/cloudpakw3700/2.3.0.0?topic=SS6PD2_2.3.0/doc/psapsys_restapi/time_zone_list.htm',
      });
    }

    const session = await this.prismaService.session.create({
      data: {
        status,
        timeZone,
      },
      include: {
        slots: true,
      },
    });

    const sessionSlots = slots.map((slot) => {
      return { ...slot, sessionId: session.id };
    });

    await this.prismaService.sessionSlot.createMany({
      data: [...sessionSlots],
    });
    return { session };
  }

  async findAll(): Promise<Session[]> {
    return this.prismaService.session.findMany({
      include: {
        slots: true,
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async scheduleSession({ name, timeZone, rules }: ScheduleParams) {
    const schedule = await this.prismaService.schedule.create({
      data: {
        name,
        timeZone,
        rules: {
          createMany: {
            data: [
              ...rules.map((rule) => ({
                ...rule,
                intervals: [...rule.intervals],
              })),
            ],
          },
        },
      },
      include: {
        rules: true,
      },
    });
    return { schedule };
  }

  async findAllSchedules(): Promise<Schedule[]> {
    return this.prismaService.schedule.findMany({
      include: {
        rules: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findAllSchedule(id, timeZone, yearMonth): Promise<any> {
    const schedule = await this.prismaService.schedule.findFirst({
      where: {
        id,
      },
      include: {
        rules: true,
      },
    });
    if (schedule === null) {
      throw new BadRequestException('Validation Error', {
        cause: new Error(),
        description: `Schedule with ID ${id} does not exists`,
      });
    }

    if (!isValidTimeZone(timeZone)) {
      throw new BadRequestException('Validation Error', {
        cause: new Error(),
        description: 'yearMonth is not valid (2023-01) - (year-month) ',
      });
    }

    if (!isValidTimeZone(timeZone)) {
      throw new BadRequestException('Validation Error', {
        cause: new Error(),
        description:
          'TimeZone is Invalid - https://www.ibm.com/docs/en/cloudpakw3700/2.3.0.0?topic=SS6PD2_2.3.0/doc/psapsys_restapi/time_zone_list.htm',
      });
    }

    function getProviderToUserTimezone(yearMonthDay, currentTime) {
      const date = new Date(addHours(new Date(yearMonthDay), currentTime));
      const providerDate = zonedTimeToUtc(date, schedule.timeZone);
      // console.log('providerDate', providerDate, currentTime);

      // const clientDateTime = zonedTimeToUtc(providerDate, timeZone);
      // console.log(
      //   'providerDate',
      //   date,
      //   providerDate,
      //   clientDateTime,
      //   '--,',

      //   formatInTimeZone(providerDate, timeZone, 'yyyy-MM-dd HH:mm:ssXXX'),
      //   currentTime,
      //   new Date(
      //     formatInTimeZone(providerDate, timeZone, 'yyyy-MM-dd HH:mm:ssXXX'),
      //   ),
      // );
      return providerDate;
    }

    async function getAvailabityFromTimeRage(
      timeRange: number[],
      yearMonthDay,
      prismaService,
    ): Promise<any[]> {
      const availableBooking = timeRange.map(async (currentTime) => {
        // Exclude booked sessions from available sessions
        const bookedSession = await prismaService.sessionSlot.findFirst({
          where: {
            time: getProviderToUserTimezone(yearMonthDay, currentTime),
          },
        });

        return {
          status: bookedSession === null ? 'available' : 'unavailable',
          slots: getProviderToUserTimezone(yearMonthDay, currentTime),
        };
      });
      return await Promise.all(availableBooking);
    }
    const numberOfDaysInMonth = getDaysInMonth(new Date(yearMonth));

    const availabilities: any[] = [];
    for (let dayIndex = 0; dayIndex < numberOfDaysInMonth; dayIndex++) {
      const day = dayIndex + 1;
      const yearMonthDay = `${yearMonth}-${day}`;
      const dayOfWeek = daysOfWeekEnum[getDay(new Date(yearMonthDay))];

      for (const rulesIndex in schedule.rules) {
        const scheduleIntervals = [
          ...(schedule.rules[rulesIndex].intervals as any[]),
        ];

        // Reduce Rules intervals - get range of intervals and check for availability
        const intervals = await scheduleIntervals.reduce(
          async (promisedAcc, curr: any) => {
            // Get the time Range for current date
            const timeRange = Range(
              Number(`${curr.startDate}`?.split(':')?.[0]),
              Number(`${curr.endDate}`?.split(':')?.[0]),
            );

            const availableTime = await getAvailabityFromTimeRage(
              timeRange,
              yearMonthDay,
              this.prismaService,
            );

            return await availableTime;
          },
          [],
        );

        // Check if rules day of the week (e.g monday) is equal to current
        // or year equal to day - used during date override
        if (
          dayOfWeek === schedule.rules[rulesIndex].weekDay ||
          yearMonthDay === schedule.rules[rulesIndex].day
        ) {
          const availabilityIndex = availabilities.findIndex(
            (availability) => availability.date === yearMonthDay,
          );
          const date =
            schedule.rules[rulesIndex].type === 'DATE'
              ? schedule.rules[rulesIndex].day
              : yearMonthDay;

          if (
            availabilityIndex >= 0 ||
            schedule.rules[rulesIndex].type === 'DATE'
          ) {
            availabilities[availabilityIndex] = {
              date,
              intervals,
            };
          } else {
            availabilities.push({
              date,
              intervals,
            });
          }
        }
      }
    }

    // console.log('test', availabilities);

    return availabilities;
  }
}

const daysOfWeekEnum = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'sunday',
};

function Range(start: number, end: number): number[] {
  try {
    return new Array(end - start).fill(start).map((d, i) => i + start);
  } catch (error) {
    return [];
  }
}
