export type BoardRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export type ShareableRole = Extract<BoardRole, 'EDITOR' | 'VIEWER'>;

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface BoardMember {
  id: string;
  role: BoardRole;
  createdAt: string;
  user: User;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  position: number;
  columnId: string;
  createdAt: string;
  updatedAt: string;
  assignee: User | null;
  createdBy: User | null;
}

export interface Column {
  id: string;
  title: string;
  position: number;
  boardId: string;
  createdAt: string;
  updatedAt: string;
  tasks: Task[];
}

export interface BoardSummary {
  id: string;
  title: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  owner: User;
  members: BoardMember[];
  viewerRole: BoardRole | null;
  _count: { columns: number; members: number };
}

export interface BoardDetail extends BoardSummary {
  columns: Column[];
}

export interface MoveTaskResponse {
  task: Task;
  sourceColumnId: string;
  targetColumnId: string;
  rebalanced: boolean;
}

export interface MoveColumnResponse {
  column: Omit<Column, 'tasks'>;
  rebalanced: boolean;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}
