import { Module } from '@nestjs/common';
import { BoardAccessGuard } from '../common/guards/board-access.guard';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';

@Module({
  controllers: [BoardsController],
  providers: [BoardsService, BoardAccessGuard],
  exports: [BoardsService],
})
export class BoardsModule {}
