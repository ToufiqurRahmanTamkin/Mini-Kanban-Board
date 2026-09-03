import { SetMetadata } from '@nestjs/common';
import { BoardAccessOptions } from '../board-access.types';

export const BOARD_ACCESS_KEY = 'boardAccess';

export const RequireBoardAccess = (options: BoardAccessOptions = {}) =>
  SetMetadata(BOARD_ACCESS_KEY, options);
