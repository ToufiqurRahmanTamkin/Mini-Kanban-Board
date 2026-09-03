import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BoardRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireBoardAccess } from '../common/decorators/board-access.decorator';
import { BoardAccessGuard } from '../common/guards/board-access.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('columns/:columnId/tasks')
@UseGuards(BoardAccessGuard)
export class ColumnTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @RequireBoardAccess({ source: 'column', param: 'columnId', role: BoardRole.EDITOR })
  create(
    @Param('columnId', ParseUUIDPipe) columnId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(columnId, userId, dto);
  }

  @Get()
  @RequireBoardAccess({ source: 'column', param: 'columnId', role: BoardRole.VIEWER })
  findAll(@Param('columnId', ParseUUIDPipe) columnId: string) {
    return this.tasksService.findAllInColumn(columnId);
  }
}

@Controller('tasks')
@UseGuards(BoardAccessGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get(':id')
  @RequireBoardAccess({ source: 'task', param: 'id', role: BoardRole.VIEWER })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  @RequireBoardAccess({ source: 'task', param: 'id', role: BoardRole.EDITOR })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto);
  }

  @Patch(':id/move')
  @RequireBoardAccess({ source: 'task', param: 'id', role: BoardRole.EDITOR })
  move(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MoveTaskDto) {
    return this.tasksService.move(id, dto);
  }

  @Delete(':id')
  @RequireBoardAccess({ source: 'task', param: 'id', role: BoardRole.EDITOR })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.remove(id);
  }
}
