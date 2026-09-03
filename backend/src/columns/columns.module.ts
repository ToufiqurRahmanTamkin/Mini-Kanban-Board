import { Module } from '@nestjs/common';
import { BoardAccessGuard } from '../common/guards/board-access.guard';
import { BoardColumnsController, ColumnsController } from './columns.controller';
import { ColumnsService } from './columns.service';

@Module({
  controllers: [BoardColumnsController, ColumnsController],
  providers: [ColumnsService, BoardAccessGuard],
  exports: [ColumnsService],
})
export class ColumnsModule {}
