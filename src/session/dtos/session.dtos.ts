import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  ValidateNested,
  IsArray,
  isDateString,
  IsDateString,
  IsDate,
  IsOptional,
  isNotEmpty,
  ValidateIf,
} from 'class-validator';

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
  thursday = 'thursday',
  friday = 'friday',
  saturday = 'saturday',
}

// SESSION DTO
export class SlotDto {
  @IsDate()
  @IsNotEmpty()
  time: Date;

  @IsEnum(SessionSlotStatus)
  status: SessionSlotStatus;
}

export class SessionDto {
  @IsString()
  @IsNotEmpty()
  timeZone: string;

  @IsEnum(SessionStatus)
  status: SessionStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlotDto)
  slots: SlotDto[];
}

//SCHEDULE DTO
export class ScheduleRuleIntervals {
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  endDate: string;
}

export class ScheduleRuleDTO {
  @ValidateIf((o) => o.type === ScheduleRuleType.DATE)
  @IsString()
  @IsNotEmpty()
  day: string;

  @ValidateIf((o) => o.type === ScheduleRuleType.WEEK_DAY)
  @IsEnum(ScheduleRuleWeekDays)
  @IsNotEmpty()
  weekDay: ScheduleRuleWeekDays;

  @IsNotEmpty()
  @IsEnum(ScheduleRuleType)
  type: ScheduleRuleType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleRuleIntervals)
  intervals: ScheduleRuleIntervals[];
}

export class ScheduleDTO {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  timeZone: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleRuleDTO)
  rules: ScheduleRuleDTO[];
}

export class getScheduleDTO {
  @IsString()
  @IsNotEmpty()
  timeZone: string;

  @IsString()
  @IsNotEmpty()
  yearMonth: string;
}
