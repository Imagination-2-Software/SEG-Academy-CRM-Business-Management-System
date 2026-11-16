# SEG Academy CRM

Enterprise Customer Relationship & Academic Management Platform for SEG Academy.

---

## Architecture Overview

This project is organized as a **Modular Monolith** using **npm workspaces** and **Turborepo**:

- **`apps/web`**: Next.js App Router, React 19, Tailwind CSS, shadcn/ui foundation.
- **`apps/api`**: NestJS REST API with OpenAPI/Swagger, Argon2id security, Nodemailer SMTP, and private storage integration.
- **`packages/database`**: Central Prisma ORM configuration targeting Supabase PostgreSQL.
- **`packages/types`**: Shared TypeScript types, enums, and API contracts.

---

## Brand Identity Tokens

- **Deep Plum**: `--seg-plum-deep` (`hsl(284 45% 20%)`)
- **Academy Orange**: `--seg-orange-academy` (`hsl(21 90% 54%)`)
- **Golden Yellow**: `--seg-yellow-golden` (`hsl(43 96% 52%)`)

---

## Prerequisites

- **Node.js**: `>= 20.x` (Tested on Node.js `26.13.1`)
- **npm**: `>= 10.x` (Tested on npm `11.20.0`)
- **Git**: `>= 2.40.x`
- **Supabase Account**: With a PostgreSQL instance ready

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
# Copy example environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```
Update `apps/api/.env` with your Supabase PostgreSQL credentials and SMTP settings.

### 3. Generate Database Client
```bash
npm run db:generate
```

### 4. Run Development Servers
```bash
npm run dev
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **API**: [http://localhost:4000/api/v1](http://localhost:4000/api/v1)
- **Swagger Documentation**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

---

## Monorepo Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Run all applications in development mode |
| `npm run build` | Build all packages and applications via Turborepo |
| `npm run type-check` | Run TypeScript validation across all workspaces |
| `npm run db:generate` | Generate Prisma client from schema |
| `npm run db:push` | Push Prisma schema directly to Supabase |
| `npm run db:studio` | Open Prisma Studio database viewer |
