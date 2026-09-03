import { BoardRole } from '@prisma/client';

export type BoardIdSource = 'board' | 'column' | 'task';

export interface BoardAccessOptions {
  role?: BoardRole;
  source?: BoardIdSource;
  param?: string;
}

export interface BoardAccessContext {
  boardId: string;
  role: BoardRole;
}

export const ROLE_RANK: Record<BoardRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  OWNER: 3,
};

export const hasAtLeastRole = (actual: BoardRole, required: BoardRole) =>
  ROLE_RANK[actual] >= ROLE_RANK[required];

export interface BoardAccessRequest {
  user?: { id: string; email: string; name: string };
  params: Record<string, string>;
  body?: Record<string, unknown>;
  method: string;
  boardAccess?: BoardAccessContext;
}
