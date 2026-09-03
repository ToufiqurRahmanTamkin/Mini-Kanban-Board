import type {
  AuthResponse,
  BoardDetail,
  BoardMember,
  BoardSummary,
  Column,
  MoveColumnResponse,
  MoveTaskResponse,
  ShareableRole,
  Task,
  User,
} from '@/types';
import { api } from './api-client';

export async function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', input);
  return data;
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', input);
  return data;
}

export async function fetchProfile(): Promise<User> {
  const { data } = await api.get<User>('/auth/me');
  return data;
}

export async function fetchBoards(): Promise<BoardSummary[]> {
  const { data } = await api.get<BoardSummary[]>('/boards');
  return data;
}

export async function fetchBoard(boardId: string): Promise<BoardDetail> {
  const { data } = await api.get<BoardDetail>(`/boards/${boardId}`);
  return data;
}

export async function createBoard(input: {
  title: string;
  description?: string | null;
}): Promise<BoardSummary> {
  const { data } = await api.post<BoardSummary>('/boards', input);
  return data;
}

export async function updateBoard(
  boardId: string,
  input: { title?: string; description?: string | null },
): Promise<BoardSummary> {
  const { data } = await api.patch<BoardSummary>(`/boards/${boardId}`, input);
  return data;
}

export async function deleteBoard(boardId: string): Promise<void> {
  await api.delete(`/boards/${boardId}`);
}

export async function shareBoard(
  boardId: string,
  input: { email: string; role: ShareableRole },
): Promise<BoardMember> {
  const { data } = await api.post<BoardMember>(
    `/boards/${boardId}/members`,
    input,
  );
  return data;
}

export async function updateMemberRole(
  boardId: string,
  memberId: string,
  role: ShareableRole,
): Promise<BoardMember> {
  const { data } = await api.patch<BoardMember>(
    `/boards/${boardId}/members/${memberId}`,
    { role },
  );
  return data;
}

export async function removeMember(
  boardId: string,
  memberId: string,
): Promise<void> {
  await api.delete(`/boards/${boardId}/members/${memberId}`);
}

export async function createColumn(
  boardId: string,
  input: { title: string; position?: number },
): Promise<Omit<Column, 'tasks'>> {
  const { data } = await api.post<Omit<Column, 'tasks'>>(
    `/boards/${boardId}/columns`,
    input,
  );
  return data;
}

export async function renameColumn(
  columnId: string,
  title: string,
): Promise<Omit<Column, 'tasks'>> {
  const { data } = await api.patch<Omit<Column, 'tasks'>>(
    `/columns/${columnId}`,
    { title },
  );
  return data;
}

export async function moveColumn(
  columnId: string,
  targetPosition: number,
): Promise<MoveColumnResponse> {
  const { data } = await api.patch<MoveColumnResponse>(
    `/columns/${columnId}/move`,
    { targetPosition },
  );
  return data;
}

export async function deleteColumn(columnId: string): Promise<void> {
  await api.delete(`/columns/${columnId}`);
}

export async function createTask(
  columnId: string,
  input: {
    title: string;
    description?: string | null;
    assigneeId?: string | null;
    position?: number;
  },
): Promise<Task> {
  const { data } = await api.post<Task>(`/columns/${columnId}/tasks`, input);
  return data;
}

export async function updateTask(
  taskId: string,
  input: {
    title?: string;
    description?: string | null;
    assigneeId?: string | null;
  },
): Promise<Task> {
  const { data } = await api.patch<Task>(`/tasks/${taskId}`, input);
  return data;
}

export async function moveTask(
  taskId: string,
  input: { targetColumnId: string; targetPosition: number },
): Promise<MoveTaskResponse> {
  const { data } = await api.patch<MoveTaskResponse>(
    `/tasks/${taskId}/move`,
    input,
  );
  return data;
}

export async function deleteTask(taskId: string): Promise<void> {
  await api.delete(`/tasks/${taskId}`);
}
