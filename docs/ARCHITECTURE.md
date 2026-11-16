# SEG Academy CRM - System Architecture

## 1. Architectural Style: Modular Monolith

SEG Academy CRM is built as a **Modular Monolith** with a clear separation of concerns:
- **Frontend (`apps/web`)**: Next.js App Router providing server and client rendered views, strictly consuming the backend REST API.
- **Backend (`apps/api`)**: NestJS application containing modular domain slices (Auth, Users, Students, Leads, Mail, Storage).
- **Contracts (`packages/types`)**: Central source of truth for DTOs, Enums, and API interfaces.
- **Data Layer (`packages/database`)**: Prisma ORM schema strictly targeting Supabase PostgreSQL.

```
                  ┌──────────────────────┐
                  │ Next.js Web Frontend │
                  │     (apps/web)       │
                  └──────────┬───────────┘
                             │ HTTP / JSON REST
                             ▼
                  ┌──────────────────────┐
                  │   NestJS Core API    │
                  │     (apps/api)       │
                  └──────────┬───────────┘
                             │ Prisma ORM
                             ▼
         ┌───────────────────────────────────────┐
         │       Supabase Cloud Infrastructure   │
         │  - PostgreSQL (Port 6543 / 5432)      │
         │  - Private Document Storage           │
         └───────────────────────────────────────┘
```

## 2. Core Architectural Rules

1. **Database Isolation**: Supabase PostgreSQL is the sole relational database. Prisma ORM governs migrations and queries.
2. **Security Boundary**: The frontend never connects directly to PostgreSQL and never stores database service keys. All requests route through the NestJS backend.
3. **Authentication & Cryptography**: Passwords must be hashed using Argon2id. Tokens use standard JWT with refresh token rotation.
4. **Storage & Assets**: Document uploads (transcripts, identity proofs, admissions data) are stored in private Supabase storage buckets and served only via signed, time-limited URLs.
5. **Deployment Target**: Prepared for containerized or PM2 execution on Ubuntu VPS behind an Nginx reverse proxy.

## 3. Brand Identity Tokens

- **Deep Plum** (`#471c4c` / `hsl(284 45% 20%)`): Primary brand color for navigational elements, headings, and primary interactive states.
- **Academy Orange** (`#f26522` / `hsl(21 90% 54%)`): Vibrant accent for call-to-actions, conversion highlights, and primary status indicators.
- **Golden Yellow** (`#fbb019` / `hsl(43 96% 52%)`): Accent highlight for badges, active alerts, and progress states.
