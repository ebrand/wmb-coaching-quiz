# Culture Coach Wendy - Quiz Platform

A full-stack quiz platform for creating, managing, and distributing branded personality/assessment quizzes. Built with Next.js 16, Supabase, Stytch OAuth, and Resend.

## Architecture Overview

```
┌───────────────────────────────────────────────────────────┐
│                      Next.js App                          │
│                                                           │
│  ┌───────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │  Public Quiz  │  │ Admin Dashboard│  │  API Routes  │  │
│  │   /q/[slug]   │  │  /admin/*      │  │  /api/*      │  │
│  └──────┬────────┘  └──────┬─────────┘  └──────┬───────┘  │
│         │                  │                   │          │
│         │          ┌───────┴───────┐           │          │
│         │          │  Middleware   │           │          │
│         │          │ (cookie gate) │           │          │
│         │          └───────┬───────┘           │          │
│         │                  │                   │          │
│  ┌──────┴──────────────────┴───────────────────┴──────┐   │
│  │              Stytch OAuth + RBAC                   │   │
│  │  Quiz-takers: optional Google login                │   │
│  │  Admins: required Google login + quiz_admin role   │   │
│  └────────────────────────────────────────────────────┘   │
│                          │                                │
│  ┌───────────────────────┴─────────────────────────────┐  │
│  │                    Supabase                         │  │
│  │  PostgreSQL (data) + Storage (images)               │  │
│  └─────────────────────────────────────────────────────┘  │
│                          │                                │
│  ┌───────────────────────┴─────────────────────────────┐  │
│  │                    Resend                           │  │
│  │  Transactional email delivery (quiz results)        │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.6 (App Router, Turbopack) |
| Language | TypeScript 5, React 19 |
| Styling | Tailwind CSS 4 |
| Database | Supabase (PostgreSQL + Row-Level Security) |
| File Storage | Supabase Storage |
| Auth | Stytch (Google OAuth + RBAC) |
| Email | Resend |
| UI Components | Radix UI, Lucide icons |
| Forms | React Hook Form + Zod validation |
| Charts | Recharts |
| Rich Text | Tiptap |
| Drag & Drop | dnd-kit |

## Project Structure

```
src/
├── app/
│   ├── admin/
│   │   ├── (dashboard)/          # Authenticated admin pages (route group)
│   │   │   ├── layout.tsx        # Sidebar + requireAdminPage() auth gate
│   │   │   ├── page.tsx          # Dashboard
│   │   │   ├── leads/            # Leads management
│   │   │   └── quizzes/          # Quiz CRUD, analytics
│   │   ├── login/page.tsx        # Admin login (outside auth gate)
│   │   └── layout.tsx            # Passthrough layout
│   ├── api/
│   │   ├── admin/auth/           # Admin OAuth callback + logout
│   │   ├── auth/                 # Quiz-taker OAuth
│   │   ├── sessions/             # Public quiz session endpoints
│   │   ├── quizzes/              # Protected quiz CRUD
│   │   ├── questions/            # Protected question CRUD
│   │   ├── answers/              # Protected answer CRUD
│   │   ├── quiz-results/         # Protected result CRUD
│   │   ├── answer-weights/       # Protected answer-to-result wiring
│   │   ├── analytics/            # Protected analytics data
│   │   └── upload/               # Protected image upload
│   ├── q/[slug]/                 # Public quiz-taking page
│   ├── auth-complete/            # Post-OAuth landing for quiz-takers
│   └── auth-error/               # OAuth error page
├── components/
│   ├── admin/                    # Admin dashboard components
│   ├── quiz/                     # Quiz-taking components
│   └── ui/                       # Reusable UI primitives (Radix-based)
├── lib/
│   ├── auth/
│   │   ├── admin.ts              # withAdminAuth() API route wrapper
│   │   └── admin-page.ts         # requireAdminPage() server component helper
│   ├── stytch/                   # Stytch client + server SDK setup
│   ├── supabase/                 # Supabase client + admin client setup
│   └── email/resend.ts           # Email sending via Resend
├── types/database.ts             # TypeScript types for all entities
└── middleware.ts                 # Cookie-presence gatekeeper
```

## Database Schema

```
quizzes
├── id, title, slug, description, image_url
├── is_published, settings (JSONB)
│
├── quiz_results (possible outcomes)
│   ├── id, title, description, image_url
│   ├── email_content (rich HTML), is_lead, min_score
│   └── display_order
│
├── questions
│   ├── id, question_text, image_url, display_order
│   │
│   └── answers
│       ├── id, answer_text, display_order
│       │
│       └── answer_result_weights
│           ├── answer_id → answers.id
│           ├── result_id → quiz_results.id
│           └── weight (vote count, typically 1)

quiz_sessions (tracks quiz attempts)
├── id, quiz_id, user_id (nullable), anonymous_token
├── status: viewed → started → completed
├── entered_at, started_at, completed_at
├── is_lead, lead_score
│
├── quiz_responses (individual answers)
│   └── id, session_id, question_id, answer_id, answered_at
│
└── session_results (calculated outcomes)
    └── id, session_id, result_id, score, is_primary

users (OAuth-authenticated quiz-takers)
└── id, stytch_user_id, google_id, email, name, profile_picture_url
```

**Quiz Settings (JSONB):**
```json
{
  "primaryColor": "#3b82f6",
  "backgroundColor": "#ffffff",
  "buttonStyle": "rounded",
  "logoUrl": null,
  "randomizeAnswers": false
}
```

## Authentication & Authorization

### Two separate auth flows

**Quiz-takers (public):**
- Optional Google OAuth via Stytch
- Used to capture email/name for lead tracking and result delivery
- Quiz can be completed anonymously (skipping auth)

**Admins:**
- Required Google OAuth via Stytch with RBAC role check
- Must have the `quiz_admin` role assigned in the Stytch Dashboard
- Three-layer protection:

| Layer | Location | Purpose |
|-------|----------|---------|
| Middleware | `src/middleware.ts` | Lightweight cookie-presence check (Edge runtime) |
| `withAdminAuth()` | `src/lib/auth/admin.ts` | API routes: validates session with Stytch, checks role |
| `requireAdminPage()` | `src/lib/auth/admin-page.ts` | Server components: same validation, redirects on failure |

### Session management

- Cookie: `stytch_session_token` (httpOnly, secure in production, sameSite=lax, 24hr TTL)
- Role extraction: Stytch's `sessions.authenticate()` REST response returns `session.roles: []` (empty). Actual roles are embedded in the JWT under the `https://stytch.com/session` claim. Both auth helpers decode the JWT to read roles after Stytch validates it.

### Route classification

**Public (no auth):**
- `/` — homepage
- `/q/*` — quiz taking
- `/api/sessions/*` — quiz session create/respond/complete
- `/api/auth/*` — quiz-taker OAuth callbacks
- `/api/admin/auth/*` — admin login/logout endpoints
- `/admin/login` — admin login page
- `/auth-complete`, `/auth-error` — post-auth pages

**Protected (require Stytch session + admin role):**
- `/admin/*` (except `/admin/login`)
- `/api/quizzes/*`, `/api/questions/*`, `/api/answers/*`
- `/api/quiz-results/*`, `/api/answer-weights/*`
- `/api/analytics`, `/api/upload`

## Quiz-Taking Flow

```
1. User visits /q/[slug]
   └─ Server loads quiz data, checks is_published

2. Intro Screen
   └─ Shows title, description, image
   └─ "Start Quiz" → POST /api/sessions (creates session, status: "viewed")

3. Questions Screen
   └─ Displays questions one at a time with progress bar
   └─ Answers randomized per-session (if enabled in settings)
   └─ Each answer → POST /api/sessions/[id]/respond (status: "started")

4. Auth Screen (optional)
   └─ "Sign in with Google" or "Skip"
   └─ OAuth via Stytch → creates/updates user record

5. Results Calculation — POST /api/sessions/[id]/complete
   └─ Tallies answer_result_weights per result (vote counting)
   └─ Highest vote count wins (ties: first by display_order)
   └─ Sets is_lead flag if winning result.is_lead = true
   └─ Sends email via Resend (if user has email + API key configured)

6. Results Screen
   └─ Displays winning result: title, description, image
```

## Admin Features

- **Quiz CRUD** — create, edit, publish/unpublish, delete quizzes
- **Result Management** — define possible outcomes with descriptions, images, rich HTML email content, and lead-flagging
- **Question & Answer Management** — add/edit/delete with drag-and-drop reordering
- **Answer-Result Wiring** — connect answers to results with weights (vote system)
- **Image Uploads** — quiz headers, question images, result images (JPEG/PNG/GIF/WebP, max 5MB, stored in Supabase Storage)
- **Analytics Dashboard** — funnel metrics (viewed/started/completed/leads), completions by date, result distribution charts
- **Leads Table** — view all leads with name, email, quiz result, completion date
- **Embed Code Generator** — generate iframe HTML for embedding quizzes on external sites
- **Branding** — custom colors, button styles, logo per quiz

## API Routes

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/sessions` | Public | Create quiz session |
| GET | `/api/sessions/[id]` | Public | Get session data |
| PATCH | `/api/sessions/[id]` | Public | Update session (attach user) |
| POST | `/api/sessions/[id]/respond` | Public | Submit answer |
| POST | `/api/sessions/[id]/complete` | Public | Complete quiz + calculate results |
| GET | `/api/auth/callback` | Public | Quiz-taker OAuth callback |
| POST | `/api/auth/exchange` | Public | Exchange OAuth token for user |
| GET | `/api/admin/auth/callback` | Public | Admin OAuth callback |
| POST | `/api/admin/auth/logout` | Cookie | Admin logout |
| GET/POST | `/api/quizzes` | Admin | List / create quizzes |
| GET/PATCH/DELETE | `/api/quizzes/[id]` | Admin | Read / update / delete quiz |
| POST | `/api/questions` | Admin | Create question |
| PATCH/DELETE | `/api/questions/[id]` | Admin | Update / delete question |
| PUT | `/api/questions/reorder` | Admin | Reorder questions |
| POST | `/api/answers` | Admin | Create answer |
| PATCH/DELETE | `/api/answers/[id]` | Admin | Update / delete answer |
| PUT | `/api/answers/reorder` | Admin | Reorder answers |
| POST | `/api/quiz-results` | Admin | Create result |
| PATCH/DELETE | `/api/quiz-results/[id]` | Admin | Update / delete result |
| POST/DELETE | `/api/answer-weights` | Admin | Wire/unwire answer to result |
| GET | `/api/analytics` | Admin | Quiz analytics data |
| POST | `/api/upload` | Admin | Upload image |

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Stytch (OAuth)
NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN=xxx
STYTCH_PROJECT_ID=xxx
STYTCH_SECRET=xxx

# Admin Auth (Stytch RBAC)
# Must match a role ID in Stytch Dashboard > Authorization
STYTCH_ADMIN_ROLE=quiz_admin

# App URL (used for OAuth callback URLs)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Resend (transactional email)
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=Quiz Results
```

## Stytch Dashboard Setup

1. **Enable Google OAuth** — Dashboard > Authentication > OAuth
2. **Enable RBAC** — Dashboard > Authorization
3. **Create role** — role ID: `quiz_admin`
4. **Assign role** to admin user(s)
5. **Register redirect URLs:**
   - Quiz-taker: `{APP_URL}/auth-complete`
   - Admin: `{APP_URL}/api/admin/auth/callback`

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project (with schema applied from `supabase/schema.sql`)
- Stytch project (with Google OAuth + RBAC configured)
- Resend account (for email delivery)

### Install & Run

```bash
npm install
cp .env.example .env.local  # fill in all values
npm run dev
```

### Build

```bash
npm run build
npm start
```

### Deploy

Standard Next.js deployment — works with Vercel, Railway, Docker, or any Node.js host. Set all environment variables listed above in your hosting provider's settings.
