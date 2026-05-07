# PR-Tracker

Aplicativo de acompanhamento de treinos com PWA web (React + Vite), backend Node.js (Fastify + Prisma + PostgreSQL) e versão experimental em React Native.

## Estrutura do projeto

```
PR-Tracker/
├── frontend/   # PWA web (React 19 + Vite) — aplicação principal
├── backend/    # API REST (Fastify + Prisma + PostgreSQL)
└── mobile/     # Versão React Native (Expo) — em pausa
```

## Funcionalidades

- Cadastro e login com autenticação JWT (Bearer token)
- Criação e edição de treinos (Superior, Inferior, Cardio)
- Banco de exercícios com agrupamento por grupo muscular
- Progresso com gráficos de evolução de cargas
- Calendário mensal com histórico de treinos
- Sequência de dias treinando (streak)
- Metas configuráveis por usuário
- Funciona offline (PWA + IndexedDB via Dexie)
- Instalável no celular como app

## Stack

**Frontend (web):** React 19, Vite, TypeScript, Tailwind 4, shadcn/ui, TanStack Query, react-router, react-hook-form, Zod, Dexie (offline), Recharts, vite-plugin-pwa.

**Backend:** Fastify, TypeScript, Prisma, PostgreSQL, JWT, Helmet, CORS.

**Mobile (legado):** React Native, Expo, React Navigation, React Native Chart Kit.

## Setup local

### Pré-requisitos
- Node.js 20+
- pnpm
- PostgreSQL rodando (local ou Docker)

### Backend

```bash
cd backend
pnpm install
cp .env.example .env   # ajustar DATABASE_URL, JWT_SECRET, COOKIE_SECRET
pnpm prisma migrate dev
pnpm prisma db seed    # opcional
pnpm dev               # http://localhost:3000
```

Variáveis de ambiente (ver `.env.example` pra detalhes):

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | Connection string do Postgres |
| `JWT_SECRET` | sim | Segredo pra assinar access tokens |
| `COOKIE_SECRET` | sim | Segredo do `@fastify/cookie` |
| `NODE_ENV` | em prod | `production` ativa `SameSite=None; Secure` no refresh cookie e CORS estrito |
| `ALLOWED_ORIGINS` | em prod | Domínios do front, separados por vírgula |

### Frontend (web)

```bash
cd frontend
pnpm install
pnpm dev               # http://localhost:5173
```

| Variável | Default | Descrição |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | URL completa do backend |

### Mobile (Expo)

```bash
cd mobile
pnpm install
pnpm start             # abre Metro
pnpm ios               # macOS apenas
pnpm android
```

## API

Autenticação via header `Authorization: Bearer <token>`. Refresh token em cookie HttpOnly (`pr_refresh_token`).

### Auth

| Método | Path | Auth | Descrição |
|---|---|---|---|
| POST | `/auth/register` | público | Cria conta. Retorna `{ user, token }` |
| POST | `/auth/login` | público | Login. Retorna `{ user, token }` |
| GET | `/auth/me` | Bearer | Dados do usuário autenticado |
| POST | `/auth/refresh` | refresh cookie | Rotaciona access token. Retorna `{ user, token }` |
| POST | `/auth/logout` | — | Revoga refresh token |

### Workouts (Bearer)

| Método | Path | Descrição |
|---|---|---|
| GET | `/workouts` | Lista treinos do usuário |
| GET | `/workouts/:id` | Detalhe de um treino |
| POST | `/workouts` | Cria treino |
| PUT | `/workouts/:id` | Edita treino |
| DELETE | `/workouts/:id` | Remove treino |

### Exercises (Bearer)

| Método | Path | Descrição |
|---|---|---|
| GET | `/exercises` | Lista exercícios |
| POST | `/exercises` | Cria exercício |
| PUT | `/exercises/:id` | Edita exercício |
| DELETE | `/exercises/:id` | Remove exercício |

### Goals (Bearer)

| Método | Path | Descrição |
|---|---|---|
| GET | `/goals` | Metas e progresso do usuário |
| POST | `/goals/update-streak` | Atualiza streak após criar treino |

## Deploy

**Frontend — Vercel**
- Root directory: `frontend/`
- Build command: padrão (`pnpm build`)
- Env: `VITE_API_URL=https://seu-backend.onrender.com`

**Backend — Render (Web Service)**
- Root directory: `backend/`
- Build: `pnpm install && pnpm prisma generate && pnpm build`
- Start: `pnpm start`
- Env vars:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `COOKIE_SECRET`
  - `NODE_ENV=production`
  - `ALLOWED_ORIGINS=https://seu-front.vercel.app`

## Scripts

**Backend**
- `pnpm dev` — server com hot reload (nodemon + ts-node)
- `pnpm build` — compila TypeScript pra `dist/`
- `pnpm start` — server de produção
- `pnpm test` — vitest
- `pnpm prisma studio` — UI do banco

**Frontend**
- `pnpm dev` — Vite dev server
- `pnpm build` — bundle de produção
- `pnpm preview` — preview do build
- `pnpm test` — vitest
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` — ESLint

## Licença

ISC.
