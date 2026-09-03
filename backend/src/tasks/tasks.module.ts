import { Module } from '@nestjs/common';
import { BoardAccessGuard } from '../common/guards/board-access.guard';
import { ColumnTasksController, TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  controllers: [ColumnTasksController, TasksController],
  providers: [TasksService, BoardAccessGuard],
  exports: [TasksService],
})
export class TasksModule {}
