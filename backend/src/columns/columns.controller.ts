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
import { RequireBoardAccess } from '../common/decorators/board-access.decorator';
import { BoardAccessGuard } from '../common/guards/board-access.guard';
import { ColumnsService } from './columns.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { MoveColumnDto } from './dto/move-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

@Controller('boards/:boardId/columns')
@UseGuards(BoardAccessGuard)
export class BoardColumnsController {
  constructor(private readonly columnsService: ColumnsService) {}

  @Post()
  @RequireBoardAccess({ source: 'board', param: 'boardId', role: BoardRole.EDITOR })
  create(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Body() dto: CreateColumnDto,
  ) {
    return this.columnsService.create(boardId, dto);
  }

  @Get()
  @RequireBoardAccess({ source: 'board', param: 'boardId', role: BoardRole.VIEWER })
  findAll(@Param('boardId', ParseUUIDPipe) boardId: string) {
    return this.columnsService.findAll(boardId);
  }
}

@Controller('columns')
@UseGuards(BoardAccessGuard)
export class ColumnsController {
  constructor(private readonly columnsService: ColumnsService) {}

  @Get(':id')
  @RequireBoardAccess({ source: 'column', param: 'id', role: BoardRole.VIEWER })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.columnsService.findOne(id);
  }

  @Patch(':id')
  @RequireBoardAccess({ source: 'column', param: 'id', role: BoardRole.EDITOR })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateColumnDto) {
    return this.columnsService.update(id, dto);
  }

  @Patch(':id/move')
  @RequireBoardAccess({ source: 'column', param: 'id', role: BoardRole.EDITOR })
  move(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MoveColumnDto) {
    return this.columnsService.move(id, dto);
  }

  @Delete(':id')
  @RequireBoardAccess({ source: 'column', param: 'id', role: BoardRole.EDITOR })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.columnsService.remove(id);
  }
}
