import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SessionService } from './session.service';
import { ScheduleDTO, SessionDto, getScheduleDTO } from './dtos/session.dtos';
import { Schedule, Session } from '@prisma/client';

@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post('/')
  bookSession(@Body() sessionDto: SessionDto): any {
    return this.sessionService.bookSession(sessionDto);
  }

  @Get('/')
  async getSession(): Promise<Session[]> {
    const sessions = await this.sessionService.findAll();
    return sessions;
  }

  @Post('/schedule')
  scheduleSchedule(@Body() scheduleDto: ScheduleDTO) {
    return this.sessionService.scheduleSession(scheduleDto);
  }

  @Get('/schedule')
  async getSchedules(): Promise<Schedule[]> {
    const schedule = await this.sessionService.findAllSchedules();
    return schedule;
  }

  @Post('/schedule/:id')
  async getSchedule(
    @Param('id') id: number,
    @Body() scheduleDto: getScheduleDTO,
  ): Promise<Schedule> {
    const schedule = await this.sessionService.findAllSchedule(
      id,
      scheduleDto.timeZone,
      scheduleDto.yearMonth,
    );
    return schedule;
  }
}
