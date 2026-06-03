# PR-Tracker

> PWA **offline-first** de acompanhamento de treino — funciona sem internet e sincroniza quando a conexão volta. Treinos, evolução de cargas, peso/bioimpedância, corridas com integração Strava e relatórios. Construído com React 19, Fastify, Prisma e PostgreSQL.

<p align="left">
  <img alt="React" src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white">
  <img alt="Fastify" src="https://img.shields.io/badge/Fastify-000000?logo=fastify&logoColor=white">
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white">
  <img alt="PWA" src="https://img.shields.io/badge/PWA-offline--first-5A0FC8?logo=pwa&logoColor=white">
  <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-green.svg">
</p>

🔗 **Demo ao vivo:** [pr-tracker-ecru.vercel.app](https://pr-tracker-ecru.vercel.app/) &nbsp;·&nbsp; 📦 **Código:** [github.com/pedrodalalio/PR-Tracker](https://github.com/pedrodalalio/PR-Tracker)

> 💡 Na tela de login, clique em **"Entrar como visitante"** para explorar o app com dados de exemplo, sem precisar criar conta.

## Screenshots

<!--
  TODO: adicione imagens em docs/screenshots/ e descomente a tabela abaixo.
  Dica: capture Home, Progresso (gráficos), Calendário e a corrida com mapa Strava.
-->
<!--
| Home | Progresso | Calendário | Corrida (Strava) |
|------|-----------|------------|------------------|
| ![Home](docs/screenshots/home.png) | ![Progresso](docs/screenshots/progresso.png) | ![Calendário](docs/screenshots/calendario.png) | ![Corrida](docs/screenshots/corrida.png) |
-->

> 📸 _Screenshots em breve._

## Estrutura do projeto

```
PR-Tracker/
├── frontend/   # PWA web (React 19 + Vite) — aplicação principal
├── backend/    # API REST (Fastify + Prisma + PostgreSQL)
└── mobile/     # Versão React Native (Expo) — experimental, em pausa
```

## Funcionalidades

**Treino**
- Criação e edição de treinos (Superior, Inferior, Cardio) com séries, repetições e carga
- Templates de treino reutilizáveis e indicação de progressão de carga/reps entre sessões
- Banco de exercícios com agrupamento por grupo muscular e exercícios personalizados
- Calendário mensal com histórico e heatmap de frequência
- Sequência de dias treinando (streak) e metas semanais configuráveis

**Acompanhamento corporal e corridas**
- Registro de peso e métricas de bioimpedância com gráfico de evolução e meta de peso
- Corridas com importação via **Strava** (OAuth) e visualização do trajeto em mapa
- Relatórios com tendências, top PRs, evolução de cargas e resumo mensal

**Conta e dados**
- Autenticação JWT (Bearer) + refresh token em cookie HttpOnly com rotação
- Verificação de e-mail e recuperação de senha
- Audit log de eventos de conta, soft delete com undo e exportação de dados (LGPD)

**Plataforma**
- Funciona **offline** (PWA + IndexedDB via Dexie) com sincronização automática
- Instalável no celular como app (PWA)

## Stack

**Frontend (web):** React 19, Vite, TypeScript, Tailwind 4, shadcn/ui, TanStack Query, react-router, react-hook-form, Zod, Dexie (offline), Recharts, vite-plugin-pwa.

**Backend:** Fastify, TypeScript, Prisma, PostgreSQL, JWT, Helmet, CORS.

**Qualidade:** testes unitários e de integração (Vitest) e e2e (Playwright — auth, workout, sync offline).

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

[MIT](LICENSE) © Pedro Dalalio
