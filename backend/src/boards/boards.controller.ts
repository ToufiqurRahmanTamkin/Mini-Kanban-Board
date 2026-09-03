import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { BoardsService } from './boards.service';
import { AddBoardMemberDto } from './dto/add-board-member.dto';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { UpdateBoardMemberDto } from './dto/update-board-member.dto';

@Controller('boards')
@UseGuards(BoardAccessGuard)
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateBoardDto) {
    return this.boardsService.create(userId, dto);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.boardsService.findAllForUser(userId);
  }

  @Get(':id')
  @RequireBoardAccess({ role: BoardRole.VIEWER })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.boardsService.findOne(id, userId);
  }

  @Patch(':id')
  @RequireBoardAccess({ role: BoardRole.EDITOR })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateBoardDto,
  ) {
    return this.boardsService.update(id, userId, dto);
  }

  @Delete(':id')
  @RequireBoardAccess({ role: BoardRole.OWNER })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.boardsService.remove(id);
  }

  @Get(':id/members')
  @RequireBoardAccess({ role: BoardRole.VIEWER })
  listMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.boardsService.listMembers(id);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  @RequireBoardAccess({ role: BoardRole.OWNER })
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddBoardMemberDto,
  ) {
    return this.boardsService.addMember(id, dto);
  }

  @Patch(':id/members/:memberId')
  @RequireBoardAccess({ role: BoardRole.OWNER })
  updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateBoardMemberDto,
  ) {
    return this.boardsService.updateMemberRole(id, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  @RequireBoardAccess({ role: BoardRole.OWNER })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.boardsService.removeMember(id, memberId);
  }
}
