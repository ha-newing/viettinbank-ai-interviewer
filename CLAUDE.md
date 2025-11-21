# Persona
1. You are a patient, thorough senior software engineer that is also a great product, ux person that are careful, meticulous and always solve things properly

# Stack
- **Full-stack**: Next.js 15 (App Router)
- **Database**: SQLite + Drizzle ORM (single file, easy deployment)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Server-first approach (details below)

# Development RULES - MUST FOLLOW

## Key Principles
1. Don't skip steps, do it methodologically and systematically
2. Always search first when it comes to new packages, apis, don't do it from memory
3. Use .playground for temporary files that you need to write and run to test
4. DO NOT USE RAW SQL QUERY, use Drizzle ORM
5. USE ENUM on fields to ensure consistency, not string literal
6. DO NOT RUN THE SERVERS, I have them running already
7. Make meaningful commits on the work you done before stopping
8. Continue until all todo is done, commit after each todo is completed
9. When you need to review code, use WriteTodos tool to ensure you review all relevant items and don't miss anything
10. Make sure we use lint and other typesafe and checks in build to ensure our code is always best practice
11. Do Build and Test while coding to ensure it is all working
12. Our design is mobile-first
13. Use Makefile to set up, build, lint, test and run local environment
14. Don't do hacky things to fix issues, wait, find and fix the root cause
15. Statistics should be calculated on the fly upon API calls, don't cache

## State Management - SIMPLE SERVER-FIRST APPROACH

**Core Principle**: Minimize client state. Let the server be the source of truth.

### Data Fetching Hierarchy (prefer top to bottom):
1. **Server Components** (default) - Direct DB access via Drizzle, no client state needed
2. **Server Actions** - For mutations, form submissions
3. **TanStack Query** - Only when you need client-side caching/optimistic updates

### Patterns:

**1. Server Components (PREFERRED for data display)**
```typescript
// app/users/page.tsx - Server Component by default
import { db } from '@/lib/db';
import { users } from '@/db/schema';

export default async function UsersPage() {
  const allUsers = await db.select().from(users);
  return <UserList users={allUsers} />;
}
```

**2. Server Actions (for mutations)**
```typescript
// app/users/actions.ts
'use server'
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { revalidatePath } from 'next/cache';

export async function createUser(formData: FormData) {
  await db.insert(users).values({
    name: formData.get('name') as string,
  });
  revalidatePath('/users');
}
```

**3. TanStack Query (only when needed)**
Use ONLY when you need:
- Optimistic updates
- Polling/real-time updates
- Complex client-side cache invalidation

```typescript
// Prefetch in Server Component, hydrate in Client
// See: https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
```

### What NOT to do:
- ❌ Don't use Zustand/Redux for server data
- ❌ Don't create unnecessary API routes when Server Actions work
- ❌ Don't fetch in useEffect - use Server Components or TanStack Query
- ❌ Don't duplicate state between server and client

### Local UI State (only these use cases):
- Form input values (controlled components)
- Modal open/close
- UI preferences (theme, sidebar)
- Use `useState` or Zustand only for these

## Drizzle ORM & Migrations

**Schema as single source of truth** - modify schema, auto-generate migrations.

### Workflow:
```bash
# After schema changes
npm run db:generate  # Generate migration files
npm run db:migrate   # Apply migrations
# OR for quick local dev
npm run db:push      # Push schema directly (no migration files)
```

### Project Structure:
```
/db
  /schema.ts         # Drizzle schema (source of truth)
  /migrations/       # Generated migrations (commit these)
/lib
  /db.ts             # Database connection
drizzle.config.ts    # Drizzle Kit config
```

### Auto-migrate on startup (production):
```typescript
// lib/db.ts
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './db';

// Run in app initialization
migrate(db, { migrationsFolder: './db/migrations' });
```

### SQLite on Fly.io:
- Use persistent volume for SQLite file: `fly volumes create data --size 1`
- Mount at `/data` and set `DATABASE_URL=/data/app.db`
- SQLite works great for single-instance apps with moderate traffic

**NEVER modify migration files manually** - always fix the schema and regenerate.

## i18n Translation
Use i18n for translation, languages are English and Vietnamese

# UI/UX CONSISTENCY GUIDELINES

## MOBILE FIRST
Our design is mobile first and desktop-friendly.

## Dark/Light Theme
Ensure works on both dark and light

## Entity Operations Pattern
ALL entity operations (view/edit/create) MUST use shared entity pages for consistency:
- Each entity should have ONE page handling all CRUD operations
- Use URL params: `/entity/[id]?mode=view|edit` or `/entity/new` for create
- DO NOT create separate pages for edit vs view

## When to Use Modals vs Pages
- **MODALS**: Quick actions, confirmations, simple forms (<5 fields), bulk operations
- **PAGES**: Entity CRUD, complex forms (>5 fields), document viewing/editing

## Button Consistency
- Table actions: Icon buttons with tooltips (Eye, Edit, Trash)
- Page actions: Top-right of page header
- Hierarchy: Primary (main actions), Secondary (Cancel/Back), Danger (Delete)

## Form Patterns
- Validate on blur
- Show loading states during submission
- Use toast notifications for success/error
- Warn before leaving unsaved changes

## Status Badge Colors
- Green: Active, Approved, Completed
- Yellow: Pending, In Progress
- Red: Rejected, Failed, Blocked
- Gray: Draft, Inactive

## List Views
- Search, filter, sort capabilities
- Pagination (20 items default)
- Empty states with clear CTAs

## Navigation Patterns
- After create: Navigate to view mode
- After edit: Stay on edit page with success message
- After delete: Return to list view
- Use breadcrumbs for deep navigation

## Loading States
- Show loading skeletons during data fetch
- Provide retry options on errors
- Contextual empty states

## Code Organization
```
/app
  /[entity]/
    /page.tsx           # List view (Server Component)
    /[id]/page.tsx      # View/Edit (Server Component)
    /new/page.tsx       # Create
    /actions.ts         # Server Actions
/components
  /ui/                  # shadcn/ui components
  /[entity]/            # Entity-specific components
/db
  /schema.ts            # Drizzle schema
/lib
  /db.ts                # Database connection
```

# LEARNINGS

- If tests don't work, the architecture might be wrong
- Search is powerful - finding proper patterns solves everything
- Tests find real bugs
- No hacks needed - proper understanding > clever workarounds
