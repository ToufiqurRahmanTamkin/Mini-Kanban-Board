import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BoardRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddBoardMemberDto } from './dto/add-board-member.dto';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { UpdateBoardMemberDto } from './dto/update-board-member.dto';

const userPreview = { id: true, name: true, email: true } as const;

const memberSelect = {
  id: true,
  role: true,
  createdAt: true,
  user: { select: userPreview },
} satisfies Prisma.BoardMemberSelect;

const boardSummarySelect = {
  id: true,
  title: true,
  description: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: userPreview },
  members: {
    select: memberSelect,
    orderBy: [{ role: 'asc' as const }, { createdAt: 'asc' as const }],
  },
  _count: { select: { columns: true, members: true } },
} satisfies Prisma.BoardSelect;

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateBoardDto) {
    const board = await this.prisma.$transaction(async (tx) => {
      const created = await tx.board.create({
        data: {
          title: dto.title,
          description: dto.description ?? null,
          ownerId: userId,
        },
        select: { id: true },
      });

      await tx.boardMember.create({
        data: { boardId: created.id, userId, role: BoardRole.OWNER },
      });

      return created;
    });

    return this.summary(board.id, userId);
  }

  async findAllForUser(userId: string) {
    const boards = await this.prisma.board.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      select: boardSummarySelect,
      orderBy: { updatedAt: 'desc' },
    });

    return boards.map((board) => this.withViewerRole(board, userId));
  }

  async findOne(boardId: string, userId: string) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: {
        ...boardSummarySelect,
        columns: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            title: true,
            position: true,
            boardId: true,
            createdAt: true,
            updatedAt: true,
            tasks: {
              orderBy: { position: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                position: true,
                columnId: true,
                createdAt: true,
                updatedAt: true,
                assignee: { select: userPreview },
                createdBy: { select: userPreview },
              },
            },
          },
        },
      },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    return this.withViewerRole(board, userId);
  }

  async update(boardId: string, userId: string, dto: UpdateBoardDto) {
    if (dto.title === undefined && dto.description === undefined) {
      throw new BadRequestException('Nothing to update');
    }

    await this.prisma.board.update({
      where: { id: boardId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description ?? null }
          : {}),
      },
      select: { id: true },
    });

    return this.summary(boardId, userId);
  }

  async remove(boardId: string) {
    await this.prisma.board.delete({ where: { id: boardId } });
    return { id: boardId, deleted: true };
  }

  async listMembers(boardId: string) {
    return this.prisma.boardMember.findMany({
      where: { boardId },
      select: memberSelect,
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async addMember(boardId: string, dto: AddBoardMemberDto) {
    const invitee = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: userPreview,
    });

    if (!invitee) {
      throw new NotFoundException(
        'No account is registered with that email address',
      );
    }

    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: { ownerId: true },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    if (board.ownerId === invitee.id) {
      throw new ConflictException('This user already owns the board');
    }

    const existing = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: invitee.id } },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'This user already has access to the board. Change their role instead.',
      );
    }

    return this.prisma.boardMember.create({
      data: { boardId, userId: invitee.id, role: dto.role },
      select: memberSelect,
    });
  }

  async updateMemberRole(
    boardId: string,
    memberId: string,
    dto: UpdateBoardMemberDto,
  ) {
    const member = await this.requireMember(boardId, memberId);

    if (member.role === BoardRole.OWNER) {
      throw new ForbiddenException('The board owner role cannot be changed');
    }

    return this.prisma.boardMember.update({
      where: { id: memberId },
      data: { role: dto.role },
      select: memberSelect,
    });
  }

  async removeMember(boardId: string, memberId: string) {
    const member = await this.requireMember(boardId, memberId);

    if (member.role === BoardRole.OWNER) {
      throw new ForbiddenException(
        'The owner cannot be removed from their own board',
      );
    }

    await this.prisma.boardMember.delete({ where: { id: memberId } });
    return { id: memberId, deleted: true };
  }

  private async requireMember(boardId: string, memberId: string) {
    const member = await this.prisma.boardMember.findUnique({
      where: { id: memberId },
      select: { id: true, role: true, boardId: true },
    });

    if (!member || member.boardId !== boardId) {
      throw new NotFoundException('Member not found on this board');
    }

    return member;
  }

  private async summary(boardId: string, userId: string) {
    const board = await this.prisma.board.findUniqueOrThrow({
      where: { id: boardId },
      select: boardSummarySelect,
    });

    return this.withViewerRole(board, userId);
  }

  private withViewerRole<
    T extends {
      ownerId: string;
      members: { role: BoardRole; user: { id: string } }[];
    },
  >(board: T, userId: string) {
    const viewerRole =
      board.ownerId === userId
        ? BoardRole.OWNER
        : (board.members.find((member) => member.user.id === userId)?.role ??
          null);

    return { ...board, viewerRole };
  }
}
