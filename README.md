# Mini Kanban Board

A collaborative Kanban board: multi-user boards with per-board roles, columns
and tasks ordered by fractional indices, and drag-and-drop that updates
optimistically and rolls back when the API refuses a move.

Monorepo:

| Path        | Stack                                                  |
| ----------- | ------------------------------------------------------ |
| `backend/`  | NestJS 11, TypeScript, Prisma 6, PostgreSQL 16, JWT     |
| `frontend/` | Next.js 15 (App Router), TypeScript, Tailwind CSS       |

---

## Quick start (Docker)

```bash
cp .env.example .env          # adjust JWT_SECRET before anything public
docker compose up --build
```

That brings up three services and runs migrations plus the seed automatically:

| Service    | URL                                            |
| ---------- | ---------------------------------------------- |
| Frontend   | <http://localhost:3000>                        |
| Backend    | <http://localhost:4000> (health: `/health`)    |
| PostgreSQL | `localhost:5432`                               |

Sign in with any seeded account — password `Password123!`:

| Email               | Access                                                          |
| ------------------- | --------------------------------------------------------------- |
| `alice@example.com` | **OWNER** of *Product Roadmap*                                    |
| `bob@example.com`   | **EDITOR** on *Product Roadmap*, owner of a second private board  |
| `carol@example.com` | **VIEWER** on *Product Roadmap* — read-only, drag disabled        |

Signing in as Carol is the quickest way to see role enforcement: the UI hides
mutation controls, and the API rejects the same operations independently.

Tear down (keeping data): `docker compose down`.
Tear down (wiping the database volume): `docker compose down -v`.

---

## Architecture

```
┌──────────────────────────┐        ┌──────────────────────────┐
│ Next.js App Router       │        │ NestJS API               │
│                          │        │                          │
│  middleware.ts ──────────┼──┐     │  JwtAuthGuard (global)   │
│   route protection       │  │     │        │                 │
│                          │  │     │        ▼                 │
│  AuthProvider            │  │     │  BoardAccessGuard        │
│  axios interceptors ─────┼──┼────▶│   board resolution +     │
│   Authorization header   │  │ JWT │   role enforcement       │
│   401 → /login           │  │     │        │                 │
│                          │  │     │        ▼                 │
│  BoardView               │  │     │  Boards / Columns / Tasks│
│   @hello-pangea/dnd      │  │     │        │                 │
│   optimistic + rollback  │  │     │     Prisma               │
└──────────────────────────┘  │     └──────────┬───────────────┘
                              │                │
                        cookie: kanban_token   ▼
                                        ┌─────────────┐
                                        │ PostgreSQL  │
                                        └─────────────┘
```

### Request flow

1. The browser sends `Authorization: Bearer <jwt>`, attached by an axios
   request interceptor that reads the token cookie.
2. A **global** `JwtAuthGuard` authenticates every route; `@Public()` opts out
   (`/auth/register`, `/auth/login`, `/health`). `JwtStrategy` re-reads the user
   on each request, so a deleted account cannot ride an unexpired token.
3. `BoardAccessGuard` resolves which board the request touches, verifies the
   caller belongs to it, and enforces the role.
4. Controllers stay thin; services own the data rules and transactions.

### `BoardAccessGuard` — one choke point for authorisation

Routes declare their needs with `@RequireBoardAccess({ source, param, role })`.
The guard then:

- **Resolves the board** from the route: directly (`/boards/:id`), through a
  column (`/columns/:id/...`), or through a task (`/tasks/:id/...`). Nested
  entities are walked back to their board, so nothing is trusted from the body.
- **Verifies membership.** A non-member gets **404, never 403** — a 403 would
  confirm the board exists and turn ids into an oracle. Board ids are therefore
  not probeable.
- **Enforces the role.** When a route does not name one, the guard infers it
  from the HTTP verb: `GET`/`HEAD` need `VIEWER`, everything else needs
  `EDITOR`. That single default is what keeps `VIEWER`s read-only across every
  current and future mutation route. Sharing and deleting a board require
  `OWNER` explicitly.
- **Publishes the result** as `{ boardId, role }` on the request, readable via
  the `@BoardContext()` decorator.

Cross-board isolation has a second layer in `TasksService.move`: even with valid
access to the source board, a `targetColumnId` on a different board is rejected
with a 400 before anything is written.

---

## Database design

```
User ──1:N──▶ Board (owner)
  │              │
  └──N:M─────────┘   via BoardMember { role: OWNER | EDITOR | VIEWER }

Board ──1:N──▶ Column ──1:N──▶ Task ──N:1──▶ User (assignee, nullable)
```

| Model         | Notes                                                                 |
| ------------- | --------------------------------------------------------------------- |
| `User`        | `email` unique, `passwordHash` (bcrypt, cost 12). Never serialised.    |
| `Board`       | `ownerId` FK. Deleting a board cascades to members, columns and tasks. |
| `BoardMember` | Unique on `(boardId, userId)`. Creator also gets an `OWNER` row.       |
| `Column`      | `position Float`, indexed on `(boardId, position)`.                    |
| `Task`        | `position Float`, indexed on `(columnId, position)`. Assignee is `SET NULL` on user delete so history survives. |

Two deliberate choices:

**The owner is stored twice** — as `Board.ownerId` and as a `BoardMember` row
with role `OWNER`. The denormalised column makes ownership checks and cascades
cheap; the membership row means member listings, avatars and access checks all
read from one uniform shape instead of special-casing the owner everywhere.

**Positions are `Float`, not `Int`.** See below.

### Fractional indexing

Ordering uses fractional indices rather than contiguous integers. Dropping a
card between two neighbours assigns the **midpoint** of their positions, so a
reorder writes exactly **one row** — no renumbering, no write amplification on a
column with hundreds of cards, and no lost-update races between collaborators
reordering different cards at once.

The three cases (identical in `backend/src/common/position.util.ts` and
`frontend/src/lib/positions.ts`, so the optimistic update and the request
payload always agree):

| Drop location        | New position          |
| -------------------- | --------------------- |
| Between two cards    | `(prev + next) / 2`   |
| At the top           | `first / 2`           |
| At the bottom        | `last + 1024`         |
| Into an empty column | `1024`                |

Halving has a limit: repeatedly dropping into the same gap eventually reaches
the resolution of a `double`. The server therefore checks the affected column
after every move, and if any two neighbours are closer than `1e-6` it renumbers
that column back onto a clean 1024-step grid **inside the same transaction**.
The response carries `rebalanced: true`, which tells the client its local
positions are stale and the board should be refetched. Readers never see a
half-renumbered list.

---

## API

All routes except the three marked *public* require
`Authorization: Bearer <token>`.

### Auth

| Method | Route            | Notes                                       |
| ------ | ---------------- | ------------------------------------------- |
| `POST` | `/auth/register` | *public* — returns `{ accessToken, user }`  |
| `POST` | `/auth/login`    | *public* — same shape                       |
| `GET`  | `/auth/me`       | Validates a stored token on client boot     |
| `GET`  | `/health`        | *public* — liveness probe                   |

### Boards

| Method   | Route                            | Minimum role |
| -------- | -------------------------------- | ------------ |
| `POST`   | `/boards`                        | any user     |
| `GET`    | `/boards`                        | any user     |
| `GET`    | `/boards/:id`                    | `VIEWER`     |
| `PATCH`  | `/boards/:id`                    | `EDITOR`     |
| `DELETE` | `/boards/:id`                    | `OWNER`      |
| `GET`    | `/boards/:id/members`            | `VIEWER`     |
| `POST`   | `/boards/:id/members`            | `OWNER`      |
| `PATCH`  | `/boards/:id/members/:memberId`  | `OWNER`      |
| `DELETE` | `/boards/:id/members/:memberId`  | `OWNER`      |

`GET /boards/:id` returns the board with nested `columns` and their `tasks`,
both ordered by `position ASC`, plus `viewerRole` so the client can gate its UI.

`POST /boards/:id/members` takes `{ email, role }` where role is `EDITOR` or
`VIEWER`; `OWNER` is not assignable.

### Columns

| Method   | Route                       | Minimum role |
| -------- | --------------------------- | ------------ |
| `POST`   | `/boards/:boardId/columns`  | `EDITOR`     |
| `GET`    | `/boards/:boardId/columns`  | `VIEWER`     |
| `GET`    | `/columns/:id`              | `VIEWER`     |
| `PATCH`  | `/columns/:id`              | `EDITOR`     |
| `PATCH`  | `/columns/:id/move`         | `EDITOR`     |
| `DELETE` | `/columns/:id`              | `EDITOR`     |

### Tasks

| Method   | Route                        | Minimum role |
| -------- | ---------------------------- | ------------ |
| `POST`   | `/columns/:columnId/tasks`   | `EDITOR`     |
| `GET`    | `/columns/:columnId/tasks`   | `VIEWER`     |
| `GET`    | `/tasks/:id`                 | `VIEWER`     |
| `PATCH`  | `/tasks/:id`                 | `EDITOR`     |
| `PATCH`  | `/tasks/:id/move`            | `EDITOR`     |
| `DELETE` | `/tasks/:id`                 | `EDITOR`     |

`PATCH /tasks/:id/move` takes `{ targetColumnId, targetPosition }` and, in one
transaction: loads the task and target column, refuses the move if they are on
different boards, writes the new column and position, and renumbers either
column if precision has run out.

```jsonc
// 200 OK
{
  "task": { "id": "…", "columnId": "…", "position": 1536, "assignee": { … } },
  "sourceColumnId": "…",
  "targetColumnId": "…",
  "rebalanced": false      // true → refetch the board
}
```

Validation is a global `ValidationPipe` with `whitelist` and
`forbidNonWhitelisted`, so an unknown or misspelled field is a `400` rather than
a silent no-op. A `PrismaExceptionFilter` maps the client-caused Prisma errors
(`P2002`, `P2003`, `P2025`) onto `409` / `400` / `404` instead of leaking a 500
with internal table names.

---

## Frontend

- **Route protection** — `src/middleware.ts` runs at the edge and redirects
  anonymous visitors to `/login?next=…`, and signed-in visitors away from
  `/login` and `/register`. It only checks that the cookie is *present*;
  signature verification stays in the API, and a forged cookie still gets a 401
  on the first request.
- **API client** — one axios instance. A request interceptor attaches the bearer
  token; a response interceptor clears the session and bounces to `/login` on
  any 401.
- **Drag and drop** — `@hello-pangea/dnd`, with columns as a horizontal
  droppable (`type="COLUMN"`) and each column as a vertical one (`type="TASK"`).
  `onDragEnd` handles same-column reordering and cross-column moves through the
  same path:
  1. compute the next state and the fractional position locally
     (`src/lib/board-state.ts` — pure functions, no DOM),
  2. paint it immediately,
  3. `PATCH` the move,
  4. on failure, restore the snapshot taken before the mutation so the card
     visibly returns, and surface the API message,
  5. on `rebalanced: true`, refetch the board.

  Optimistic-then-rollback is used for every mutation on the board, not just
  drags: renaming a column, deleting a card, deleting a board.
- **Role gating** — `viewerRole` from the API drives the UI. A `VIEWER` sees a
  banner, no composers, no delete buttons, and `isDragDisabled` /
  `isDropDisabled` set. This is convenience only; the API enforces the same
  rules independently.

---

## Environment variables

Copy `.env.example` to `.env` at the repo root. Docker Compose reads it, and
its values are the same ones the manual setup needs.

| Variable                        | Default                     | Purpose                                                |
| ------------------------------- | --------------------------- | ------------------------------------------------------ |
| `POSTGRES_USER` / `_PASSWORD` / `_DB` | `kanban`              | Credentials for the `postgres` service                 |
| `POSTGRES_PORT`                 | `5432`                      | Host port mapping                                      |
| `DATABASE_URL`                  | `postgresql://kanban:kanban@localhost:5432/kanban?schema=public` | Prisma connection string. Compose overrides the host to `postgres` |
| `BACKEND_PORT`                  | `4000`                      | Host port for the API                                  |
| `JWT_SECRET`                    | dev placeholder             | **Change this outside local dev**                      |
| `JWT_EXPIRES_IN`                | `7d`                        | Access-token lifetime                                  |
| `CORS_ORIGIN`                   | `http://localhost:3000`     | Comma-separated allowed origins                        |
| `FRONTEND_PORT`                 | `3000`                      | Host port for the web app                              |
| `NEXT_PUBLIC_API_URL`           | `http://localhost:4000`     | API base URL **as the browser sees it**                |
| `SEED_PASSWORD`                 | `Password123!`              | Password given to every seeded demo user               |

`backend/.env.example` and `frontend/.env.example` hold the same values scoped
to a single app, for running them outside Docker.

> `NEXT_PUBLIC_*` variables are inlined into the client bundle at **build**
> time, which is why `NEXT_PUBLIC_API_URL` is a Docker build arg rather than
> only a runtime variable. Point it at the API's public address when deploying.

---

## Manual setup (without Docker)

You still need a PostgreSQL 16 instance. The compose file can supply just that:

```bash
docker compose up -d postgres          # or use your own PostgreSQL
```

**Backend**

```bash
cd backend
cp .env.example .env                   # set DATABASE_URL and JWT_SECRET
npm install
npm run prisma:generate
npm run prisma:migrate                 # applies migrations, creates the DB schema
npm run prisma:seed                    # optional demo data
npm run dev                            # http://localhost:4000
```

**Frontend** (second terminal)

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                            # http://localhost:3000
```

Both apps are npm workspaces, so a single `npm install` at the repo root also
installs everything.

### Useful commands

```bash
npm run build            --workspace=backend    # nest build + compile the seed
npm test                 --workspace=backend    # unit tests
npm run prisma:studio    --workspace=backend    # browse the database
npm run prisma:deploy    --workspace=backend    # apply migrations without prompts
npm run build            --workspace=frontend
```

---

## Containerization notes

Both images are multi-stage.

**`backend/Dockerfile`** — a builder stage installs the full dependency tree,
runs `prisma generate` and builds both the Nest app and the seed script; the
runtime stage installs production dependencies only and copies in the generated
Prisma client and compiled output. `docker-entrypoint.sh` runs
`prisma migrate deploy` (retrying while Postgres finishes starting), seeds when
`RUN_SEED=true`, then `exec`s the API so it runs as PID 1 and receives signals.
The seed uses fixed uuids and `upsert`, so booting repeatedly is harmless.

**`frontend/Dockerfile`** — builds with Next's `output: 'standalone'`, so the
runtime image carries a self-contained server bundle instead of `node_modules`.
Both images run as a non-root user.

Two things worth knowing:

- The images install with `npm install` rather than `npm ci`, because each
  builds from its own subdirectory while the lockfile lives at the monorepo
  root. Switching to `npm ci` means building with the repo root as context.
- `prisma` is a runtime dependency of the backend (not a dev dependency)
  because the container applies migrations on boot.

---

## Trade-offs and known limitations

- **Token storage.** The JWT lives in a JS-readable cookie. A cookie (rather
  than `localStorage`) is what lets Next.js middleware protect routes on the
  server, but because the axios interceptor must read it for the `Authorization`
  header it cannot be `httpOnly` — so it carries the same XSS exposure
  `localStorage` would. The production fix is a same-origin route handler that
  sets an `httpOnly` cookie and proxies to the API.
- **No refresh tokens.** A single 7-day access token; expiry means signing in
  again.
- **No realtime.** Two people on one board will not see each other's changes
  until a refetch. The fractional-index scheme is deliberately friendly to a
  future WebSocket layer, since each move is a single-row update.
- **Last-write-wins on concurrent drags.** Two users dropping the same card at
  the same moment both succeed; the later write is the one that sticks.
- **Sharing requires an existing account.** `POST /boards/:id/members` looks the
  invitee up by email and 404s if there is no such user; there is no email
  invitation flow.

## Tests

`npm test --workspace=backend` covers the parts most likely to break silently:
the fractional-index arithmetic (midpoint ordering across repeated
subdivisions, prepend/append, rebalance detection, position validation) and
`TasksService.move` against a stubbed Prisma client — including that a
cross-board `targetColumnId` is rejected **before** any write, and that a
collapsed position range triggers a renumber inside the transaction.
