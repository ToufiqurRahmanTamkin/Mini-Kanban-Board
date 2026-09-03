import { BoardRole, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'Password123!';

const USERS = {
  alice: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'alice@example.com',
    name: 'Alice Owner',
  },
  bob: {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'bob@example.com',
    name: 'Bob Editor',
  },
  carol: {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'carol@example.com',
    name: 'Carol Viewer',
  },
} as const;

const BOARDS = {
  product: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    title: 'Product Roadmap',
    description: 'Everything the team is shipping this quarter.',
  },
  personal: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    title: 'Bob Personal Board',
    description: 'A private board owned by Bob, to prove board isolation.',
  },
} as const;

const STEP = 1024;

interface SeedColumn {
  id: string;
  title: string;
  tasks: SeedTask[];
}

interface SeedTask {
  id: string;
  title: string;
  description: string;
  assigneeId?: string;
}

const PRODUCT_COLUMNS: SeedColumn[] = [
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    title: 'Backlog',
    tasks: [
      {
        id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
        title: 'Audit onboarding funnel',
        description: 'Find where new users drop off before creating a board.',
        assigneeId: USERS.carol.id,
      },
      {
        id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
        title: 'Draft Q3 pricing page',
        description: 'Three tiers, annual toggle, FAQ section.',
      },
      {
        id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
        title: 'Investigate slow board load',
        description: 'Boards with 200+ tasks take over two seconds to render.',
        assigneeId: USERS.bob.id,
      },
    ],
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    title: 'In Progress',
    tasks: [
      {
        id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc4',
        title: 'Drag and drop task movement',
        description:
          'Fractional positions, optimistic UI, rollback when the API rejects.',
        assigneeId: USERS.alice.id,
      },
      {
        id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc5',
        title: 'Board sharing with roles',
        description: 'Invite by email as EDITOR or VIEWER.',
        assigneeId: USERS.bob.id,
      },
    ],
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
    title: 'In Review',
    tasks: [
      {
        id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc6',
        title: 'JWT auth flow',
        description: 'Register, login, token refresh on the client.',
        assigneeId: USERS.alice.id,
      },
    ],
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4',
    title: 'Done',
    tasks: [
      {
        id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc7',
        title: 'Set up Docker Compose',
        description: 'Postgres, API and web app on one command.',
        assigneeId: USERS.bob.id,
      },
      {
        id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc8',
        title: 'Prisma schema and migrations',
        description: 'Users, boards, members, columns, tasks.',
        assigneeId: USERS.alice.id,
      },
    ],
  },
];

const PERSONAL_COLUMNS: SeedColumn[] = [
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5',
    title: 'This Week',
    tasks: [
      {
        id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc9',
        title: 'Renew domain',
        description: 'Expires at the end of the month.',
        assigneeId: USERS.bob.id,
      },
    ],
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6',
    title: 'Done',
    tasks: [],
  },
];

async function seedColumns(
  boardId: string,
  authorId: string,
  columns: SeedColumn[],
): Promise<void> {
  for (const [columnIndex, column] of columns.entries()) {
    const position = (columnIndex + 1) * STEP;

    await prisma.column.upsert({
      where: { id: column.id },
      update: { title: column.title, position, boardId },
      create: { id: column.id, title: column.title, position, boardId },
    });

    for (const [taskIndex, task] of column.tasks.entries()) {
      const taskPosition = (taskIndex + 1) * STEP;
      const data = {
        title: task.title,
        description: task.description,
        position: taskPosition,
        columnId: column.id,
        assigneeId: task.assigneeId ?? null,
        createdById: authorId,
      };

      await prisma.task.upsert({
        where: { id: task.id },
        update: data,
        create: { id: task.id, ...data },
      });
    }
  }
}

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  for (const user of Object.values(USERS)) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { email: user.email, name: user.name, passwordHash },
      create: { ...user, passwordHash },
    });
  }

  await prisma.board.upsert({
    where: { id: BOARDS.product.id },
    update: { ...BOARDS.product, ownerId: USERS.alice.id },
    create: { ...BOARDS.product, ownerId: USERS.alice.id },
  });

  const memberships: Array<{ userId: string; role: BoardRole }> = [
    { userId: USERS.alice.id, role: BoardRole.OWNER },
    { userId: USERS.bob.id, role: BoardRole.EDITOR },
    { userId: USERS.carol.id, role: BoardRole.VIEWER },
  ];

  for (const membership of memberships) {
    await prisma.boardMember.upsert({
      where: {
        boardId_userId: {
          boardId: BOARDS.product.id,
          userId: membership.userId,
        },
      },
      update: { role: membership.role },
      create: { boardId: BOARDS.product.id, ...membership },
    });
  }

  await seedColumns(BOARDS.product.id, USERS.alice.id, PRODUCT_COLUMNS);

  await prisma.board.upsert({
    where: { id: BOARDS.personal.id },
    update: { ...BOARDS.personal, ownerId: USERS.bob.id },
    create: { ...BOARDS.personal, ownerId: USERS.bob.id },
  });

  await prisma.boardMember.upsert({
    where: {
      boardId_userId: { boardId: BOARDS.personal.id, userId: USERS.bob.id },
    },
    update: { role: BoardRole.OWNER },
    create: {
      boardId: BOARDS.personal.id,
      userId: USERS.bob.id,
      role: BoardRole.OWNER,
    },
  });

  await seedColumns(BOARDS.personal.id, USERS.bob.id, PERSONAL_COLUMNS);

  console.log('Seed complete. Demo accounts (password: %s):', SEED_PASSWORD);
  console.log('  %s  - OWNER of "Product Roadmap"', USERS.alice.email);
  console.log('  %s    - EDITOR on "Product Roadmap", owns a private board', USERS.bob.email);
  console.log('  %s  - VIEWER on "Product Roadmap" (read only)', USERS.carol.email);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
