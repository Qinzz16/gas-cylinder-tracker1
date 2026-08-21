# Gas Cylinder Tracker

A mobile-first internal web application for managing eight physical gas cylinders through working, reserve, empty, and supplier-replacement cycles.

## What is implemented

- Live 8-position dashboard divided into Upper / Working and Bottom / Reserve areas
- Large, phone-friendly ON, OFF, Almost Empty, and Swap actions
- Configurable maximum active-cylinder count (default 4)
- Permanent usage sessions with exact duration, side, ON/OFF operators, and final condition
- Physical cylinder identity independent from position
- Transactional two-cylinder swaps with linked movement events
- Supplier request, schedule, delivery, completion, and batch history
- Automatic prompt when all four bottom positions contain empty/waiting cylinders
- Per-cylinder activity timelines and full audit log
- Usage filters by dates, cylinder, operator, side, and final status
- Current status, cylinder usage, staff activity, and supplier-cycle reports
- Admin-managed operators, cylinder IDs/statuses/positions, and position configuration
- Admin corrections that record original value, new value, person, time, and reason
- Seed data for G01–G08, eight positions, Admin, Operator 1, and Operator 2

## Application structure

- `app/` — Next.js App Router pages and server-rendered UI
- `components/` — shared dashboard cards, badges, and notices
- `lib/actions.ts` — transactional server actions and validation
- `lib/rules.ts` — independently tested business rules
- `prisma/schema.prisma` — relational data model
- `prisma/seed.ts` — repeatable demo seed
- `tests/` — important workflow-rule tests

## Database design

`Cylinder` represents the physical cylinder and owns the stable cylinder code. Its `positionId` is only its current location.

`Position` represents one configurable physical slot. A unique relationship ensures no two cylinders occupy the same slot.

`UsageSession` opens when a cylinder is turned ON and closes when it is turned OFF. It stores both operators, timestamps, side, computed seconds, and final condition.

`CylinderEvent` is the append-only operational audit trail. It stores status and position snapshots, person, time, notes, linked transaction IDs, and JSON correction details.

`SupplierReplacement` and `SupplierReplacementItem` model a batch and its cylinders. `Operator` and `Setting` hold selectable staff and configurable limits.

Foreign keys use restrictive deletion for operational records, while event references can safely become null without deleting the historical event.

## Run locally

Requirements: Node.js 20.19+ and npm.

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

For schema prototyping instead of migrations, `npm run db:push` may be used on a disposable local database.

## Environment variables

```env
DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/DATABASE"
APP_TIME_ZONE="Asia/Kuala_Lumpur"
APP_TIMEZONE_OFFSET="+08:00"
```

`DATABASE_URL` is required. The time-zone values default to Malaysia time if omitted.

## Tests and verification

```bash
npm test
npx tsc --noEmit
npm run build
```

The workflow tests cover the four-cylinder overlap limit, duplicate ON/OFF prevention, almost-empty behavior, multi-day duration calculation, reversed timestamps, and valid/invalid rotations.

## Vercel + PostgreSQL deployment

This package is already configured for PostgreSQL and includes a production migration. See `VERCEL_DEPLOYMENT.md` for the exact Vercel + Prisma Postgres steps.

## Assumptions

- This MVP uses operator selection rather than authentication. Only names with the Admin role appear in correction forms; server actions also verify the Admin role.
- A cylinder must be OFF before a physical swap.
- A swap is an empty/almost-empty upper cylinder exchanged with a full/standby bottom cylinder.
- The outgoing bottom cylinder becomes Waiting for Supplier; the incoming upper cylinder becomes Standby.
- Supplier delivery marks the selected physical cylinder IDs Full without renaming them.
- Malaysia time is the default and can be changed with environment variables.
- The system records operations only and intentionally contains no gas-safety instructions.
