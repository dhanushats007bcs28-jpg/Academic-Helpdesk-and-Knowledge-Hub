# Academic Helpdesk & Knowledge Hub

A full-stack **MERN** (MongoDB · Express · React · Node) academic support platform with
**NLP text-analytics query matching**, **bottom-up ticket assignment** and a
**24-working-hour SLA engine** with automatic escalation.

Built for **Mepco Schlenk Engineering College** — but fully generic and re-brandable.

---

## Table of Contents
1. [Highlights](#highlights)
2. [Screens & Roles](#screens--roles)
3. [The Four Roles](#the-four-roles)
4. [Text Analytics Engine](#text-analytics-engine)
5. [Bottom-Up Assignment](#bottom-up-assignment)
6. [24-Working-Hour SLA](#24-working-hour-sla)
7. [Tech Stack](#tech-stack)
8. [Project Structure](#project-structure)
9. [Data Models](#data-models)
10. [API Reference](#api-reference)
11. [Getting Started](#getting-started)
12. [Demo Accounts](#demo-accounts)
13. [Environment Variables](#environment-variables)
14. [Production Build & Deploy](#production-build--deploy)
15. [Not Yet Implemented / Next Steps](#not-yet-implemented--next-steps)

---

## Highlights

- **Real MongoDB persistence** via Mongoose — no in-memory or file-based storage.
- **Text-analytics pipeline**: normalization → tokenization → **stop-word removal** →
  **lemmatization** → **TF-IDF** vectors → **cosine similarity** ranking of the knowledge base.
- **Instant auto-resolution**: if a student's query strongly matches a KB article, they can
  resolve it in one click — no ticket needed.
- **Bottom-up assignment ladder**: junior faculty → senior faculty → HOD, chosen by subject
  affinity, department match and current workload.
- **24-working-hour SLA** (Mon–Fri, 09:00–17:00) — weekends and off-hours are skipped.
  Warns at 80%, then auto-escalates one rung on breach and notifies everyone involved.
- **Admin as a first-class role** managing students, faculty and HODs, with full visibility of
  every query, the live SLA board, system analytics and an audit trail.
- **Professional, readable UI** — 15px base type, Sora/Inter typography, accessible contrast,
  responsive from mobile to widescreen.
- Role-aware dashboards for **Student, Faculty, HOD and Admin**, plus email-style notifications
  and threaded ticket conversations.

---

## Screens & Roles

| Modal / Page | Student | Faculty | HOD | Admin |
|---|:---:|:---:|:---:|:---:|
| Login / Register | ✅ | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Ask a Query (live KB matching) | ✅ | — | — | — |
| Knowledge Base | ✅ | ✅ | ✅ | ✅ (CRUD) |
| My Tickets / Assigned Tickets | ✅ | ✅ | ✅ | ✅ |
| Ticket Detail + Conversation + Escalate | ✅ | ✅ | ✅ | ✅ |
| Academic Info | ✅ | — | — | — |
| Availability & Load | — | ✅ | — | — |
| My Reports / Students | — | ✅ | — | — |
| Department Overview / Recurring Queries | — | — | ✅ | ✅ |
| All Queries (institution-wide) | — | — | — | ✅ |
| SLA Monitor | — | — | — | ✅ |
| User Management (students/faculty/HODs) | — | — | — | ✅ |
| Analytics / Activity Log | — | — | — | ✅ |

---

## The Four Roles

### 🎓 Student
Raise queries, get **instant knowledge-base answers** for common questions, track ticket status,
chat with faculty, and rate resolutions. Sees only their own tickets and academic info.

### 👩‍🏫 Faculty
Two escalation tiers:
- **Level 1 (junior)** — first rung, receives newly assigned tickets.
- **Level 2 (senior)** — receives escalations from level-1 faculty.

Faculty set their **availability**, manage their **teaching subjects** (which drive routing),
toggle a **capacity limit**, reply to students, add internal notes, escalate upward, and view
personal reports.

### 🏛️ HOD (Head of Department)
Department-wide oversight: all department tickets, faculty workload distribution, **escalations
that reach the HOD**, and **recurring-query detection** — NLP keyword clustering that surfaces
questions frequently asked, suggesting new knowledge-base articles. HOD is the **top of the
bottom-up ladder (level 3)**.

### 🛡️ Admin
Manages the entire institution:
- **CRUD over students, faculty and HODs** (create, edit, deactivate, delete, reset passwords).
- Views **every query ever asked**, filterable by status, priority, category and escalation level.
- **Live SLA monitor** with worked/remaining hours and an on-demand SLA sweep trigger.
- **System analytics**: resolution rate, average rating, KB auto-resolution count, category
  distribution, escalation-level distribution, department workload, faculty load ranking.
- **Audit trail** of every administrative and system action.
- Manages knowledge-base articles (with automatic NLP re-indexing on save) and can broadcast
  notifications to any role.

---

## Text Analytics Engine

Located in `server/src/services/nlp/`.

```
raw student query
      │
      ▼
1. Normalize        lowercase · strip punctuation/digits → clean tokens
2. Tokenize         split on non-letters, drop 1-char tokens
3. Stop-word removal  ~180 English stop-words (incl. "please", "kindly", "sir")
4. Lemmatize        rule-based reducer (plural, -ing, -ed, -ly, irregulars)
5. Term Frequency   normalized TF per document
6. IDF              log((N+1)/(df+1)) + 1 across the corpus
7. TF-IDF vectors   sparse weight vectors
8. Cosine similarity  rank every KB article against the query
9. Overlap boost    +up to 0.25 for exact term overlap
      │
      ▼
ranked KB matches with confidence (high ≥ 0.55 · medium ≥ 0.35 · low)
```

### Example
Query: `"How do I normalize a relation into 3NF and what are the normal forms?"`

```
Extracted keywords : normalize, relation, nf, normal, form
Result #1  → 56.5%  (high)   DBMS Normalization Rules and Normal Forms
Result #2  → 50.4%  (medium) Reading a Normalization Exercise: Decomposing a Relation
```

The same engine also powers **category suggestion** for new tickets and **recurring-query
clustering** for HODs.

Files:
- `server/src/services/nlp/stopwords.js` — stop-word set + `lemmatize()`
- `server/src/services/nlp/engine.js` — full pipeline, `matchKnowledgeBase()`, `suggestCategory()`

---

## Bottom-Up Assignment

When a student raises a ticket, `server/src/services/assignment.js` walks the ladder from the
**lowest rung upward** and picks the best handler:

```
Level 1  junior faculty   ← new tickets land here first
   │  (explicit escalation, or automatic on SLA breach)
   ▼
Level 2  senior faculty
   │
   ▼
Level 3  HOD              ← final rung
```

Within each level, candidates are scored by:

| Factor | Weight |
|---|---|
| Subject affinity (faculty subjects ↔ ticket category) | 0.45 |
| Department match | 0.25 |
| Has capacity (load < max open tickets) | 0.20 |
| High/critical priority bonus | 0.15 |
| Workload penalty (higher load → lower score) | −0.30 |

Availability is respected — faculty who set themselves *unavailable* are skipped. Escalation
enforces `minLevel = current level + 1`, so a ticket **never bounces sideways** to a same-level peer.

---

## 24-Working-Hour SLA

Implemented in `server/src/utils/workingHours.js` and `server/src/services/sla.js`.

- The SLA clock counts **only working hours** — Monday–Friday, 09:00–17:00 (configurable).
- A ticket raised **Friday 16:00** has its deadline **Monday afternoon**, not over the weekend.
- **80% of the window** → an `sla_warning` notification is sent to the handler (once).
- **100% of the window** → the ticket is marked `slaBreached`, **auto-escalated one rung up**
  the bottom-up ladder, the clock resets for the new handler, and everyone involved is notified.
- A `node-cron` job runs the sweep **every 15 minutes on weekdays**; admins can also trigger
  it manually from the SLA Monitor page.

### Verified working-hours maths
```
Created: Wed 23 Sep 2026 16:06
Due    : Mon 28 Sep 2026 16:06   ✅ exactly 24 working hours
   Wed 16:06→17:00 = 0.9h  +  Thu 8h  +  Fri 8h  +  (Sat/Sun skipped)  +  Mon 8:00→16:06 = 7.1h
```

---

## Tech Stack

**Backend**
- Node.js 18+ · Express 4 · Mongoose 8 (MongoDB)
- JWT auth (`jsonwebtoken`) · bcrypt password hashing (`bcryptjs`, 12 rounds)
- `helmet`, `cors`, `compression`, `morgan`, `express-rate-limit`
- `node-cron` for the SLA sweep

**Frontend**
- React 18 · Vite 5 · React Router 6
- Recharts (analytics charts) · Lucide React (icons) · react-hot-toast (notifications)
- Axios with auth interceptors
- Hand-written CSS design system (no bulky UI framework)

**Database**
- MongoDB (tested against MongoDB Community Server 8.0)

---

## Project Structure

```
webapp/
├── package.json                 # root scripts (install:all, dev, production)
├── README.md
├── .gitignore
├── ecosystem.config.cjs         # PM2 process config
│
├── server/                      # ── BACKEND ──
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js             # Express app + cron + static SPA serving
│       ├── config/db.js         # Mongoose connection with retries
│       ├── models/
│       │   ├── User.js          # students, faculty, HODs, admin (one collection)
│       │   ├── Ticket.js        # lifecycle, escalation history, SLA, KB matches
│       │   ├── TicketMessage.js # threaded conversation
│       │   ├── KbArticle.js     # KB + NLP index (tokens, lemmas, termFreq)
│       │   ├── Notification.js
│       │   └── ActivityLog.js
│       ├── middleware/auth.js   # requireAuth, requireRole, signToken
│       ├── services/
│       │   ├── nlp/
│       │   │   ├── engine.js    # tokenize → stopwords → lemmatize → TF-IDF → cosine
│       │   │   └── stopwords.js # stop-word set + lemmatizer
│       │   ├── assignment.js    # bottom-up assignment + SLA deadline + notify
│       │   └── sla.js           # warn / breach / auto-escalate sweep
│       ├── routes/
│       │   ├── index.js         # auth, notifications, student academics
│       │   ├── tickets.js       # tickets, KB match/search, escalation, feedback
│       │   ├── faculty.js       # workload, availability, HOD department views
│       │   └── admin.js         # user CRUD, all queries, SLA, analytics, KB CRUD
│       ├── utils/
│       │   ├── workingHours.js  # 24-working-hour arithmetic
│       │   └── helpers.js       # asyncHandler, activity logging
│       └── seed/seed.js         # realistic seed data
│
└── client/                      # ── FRONTEND ──
    ├── package.json
    ├── vite.config.js           # dev proxy /api → :3000
    ├── index.html
    └── src/
        ├── main.jsx · App.jsx
        ├── api/client.js        # axios instance + interceptors
        ├── context/AuthContext.jsx
        ├── layouts/Layout.jsx   # topbar + role-aware sidebar
        ├── components/ui.jsx    # StatCard, StatusPill, Modal, ConfidenceBar…
        ├── styles/global.css    # design system
        └── pages/
            ├── auth/Login.jsx · auth/CreateAccount.jsx
            ├── student/  (Dashboard, AskQuery, KnowledgeBase, MyTickets, AcademicInfo)
            ├── faculty/  (Dashboard, Tickets, Availability, Reports, Students)
            ├── hod/      (Dashboard, Tickets, Faculty, Recurring)
            ├── admin/    (Dashboard, Users, Queries, Sla, Analytics, Activity, Knowledge)
            ├── TicketDetail.jsx · Profile.jsx · Notifications.jsx
            └── KnowledgeShared.jsx
```

---

## Data Models

### `User` (single collection, discriminated by `role`)
| Field | Notes |
|---|---|
| `name`, `email`, `password`, `role` | `role ∈ {student, faculty, hod, admin}` |
| `rollNumber`, `year`, `semester`, `section`, `cgpa`, `attendance` | student fields |
| `employeeId`, `designation`, `subjects[]`, `level`, `maxOpenTickets`, `currentLoad`, `isAvailable` | faculty/HOD fields |
| `department`, `hodOf` | department & HOD's headed department |
| `advisor`, `isActive`, `avatarColor`, `phone`, `lastLoginAt` | misc |

### `Ticket`
`ticketCode`, `student`, `subject`, `description`, `category`, `priority`, `status`,
`assignedTo`, `assignedAt`, `assignmentLevel`, `escalationHistory[]`, `slaHours`, `slaDueAt`,
`slaBreached`, `firstResponseAt`, `kbMatches[]`, `autoResolvedByKb`, `resolution{summary,resolvedBy,resolvedAt}`,
`feedback{rating,comment}`, `queryTokens[]`, `queryLemmas[]`, `resolvedFromKb`.

`status ∈ {open, assigned, in_progress, waiting_student, escalated, resolved, closed}`

### `KbArticle`
`title`, `question`, `answer`, `category`, `department`, `subject`, `tags[]`, `tokenized[]`,
`lemmas[]`, `termFreq`, `views`, `helpful`, `source`, full-text index.

Plus `TicketMessage`, `Notification`, `ActivityLog`.

---

## API Reference

All routes are prefixed with `/api`. Authenticated routes require `Authorization: Bearer <token>`.

### Auth & Account
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/auth/login` | public | Sign in, returns JWT |
| POST | `/auth/register` | public | Student self-registration |
| GET | `/auth/me` | any | Current user |
| PATCH | `/auth/me` | any | Update name/phone/availability |
| POST | `/auth/change-password` | any | Change own password |

### Knowledge Base & NLP
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/kb/match` | any | **Live text-analytics match** for a query |
| GET | `/kb` | any | Search / browse articles (`?q=&category=`) |
| GET | `/kb/categories` | any | Category counts |
| GET | `/kb/:id` | any | Single article (increments views) |

### Tickets
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/tickets` | student | Create ticket (or auto-resolve from KB) |
| GET | `/tickets` | any | List, role-scoped (`?status=&category=&priority=&q=&page=`) |
| GET | `/tickets/stats/summary` | any | Dashboard stats |
| GET | `/tickets/:id` | any (authorised) | Ticket + conversation |
| PATCH | `/tickets/:id/status` | faculty/hod/admin | Update status / resolve |
| POST | `/tickets/:id/messages` | any (authorised) | Reply / internal note |
| POST | `/tickets/:id/escalate` | faculty/hod/admin | Escalate up the ladder |
| POST | `/tickets/:id/feedback` | student | Rate resolution |
| GET | `/tickets/mine/history` | student | Personal ticket history |

### Faculty & HOD
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/faculty/workload` | faculty/hod | Queue + SLA context |
| PATCH | `/faculty/availability` | faculty/hod | Toggle availability |
| PATCH | `/faculty/subjects` | faculty/hod | Update teaching subjects |
| GET | `/faculty/department/overview` | hod | Department-wide view |
| GET | `/faculty/department/recurring` | hod | NLP recurring-query clusters |

### Admin
| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/admin/users` | List / create users (any role) |
| PATCH/DELETE | `/admin/users/:id` | Edit / delete a user |
| POST | `/admin/users/:id/reset-password` | Reset a password |
| PATCH | `/admin/users/:id/toggle-active` | Activate / deactivate |
| GET | `/admin/queries` | Every query, filterable |
| GET | `/admin/sla` | Live SLA board |
| POST | `/admin/sla/run` | Trigger SLA sweep now |
| GET | `/admin/analytics/overview` | System-wide analytics |
| GET | `/admin/activity` | Audit log |
| POST/PATCH/DELETE | `/admin/kb` `/admin/kb/:id` | Knowledge-base CRUD |
| POST | `/admin/broadcast` | Broadcast a notification |

---

## Getting Started

### Prerequisites
- **Node.js** 18 or newer
- **MongoDB** 6 or newer, running locally (or a MongoDB Atlas connection string)

### 1. Install dependencies
```bash
# from the project root
npm run install:all
```

### 2. Configure environment
```bash
cd server
cp .env.example .env
# edit .env and set JWT_SECRET to a long random string
```

### 3. Start MongoDB
```bash
# macOS (Homebrew)
brew services start mongodb-community

# Ubuntu / Debian
sudo systemctl start mongod

# or run a throwaway instance
mongod --dbpath ./data
```

### 4. Seed realistic data
```bash
npm run seed:fresh      # wipes & reseeds (16 users, 12 KB articles, 10 tickets)
# or
npm run seed            # idempotent upsert
```

### 5. Run in development
```bash
npm run dev             # starts API (:3000) + Vite client (:5173) together
```
- Frontend: http://localhost:5173  (proxies `/api` to the backend)
- API:      http://localhost:3000/api/health

### 6. Production-style run (single port)
```bash
npm run production      # builds the client, then serves everything from :3000
```
Open http://localhost:3000.

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| 🎓 Student | `student@mepcoeng.ac.in` | `student123` |
| 🎓 Student | `ananya.l@mepcoeng.ac.in` | `student123` |
| 👩‍🏫 Faculty (Level 1, junior) | `selvam.m@mepcoeng.ac.in` | `faculty123` |
| 👩‍🏫 Faculty (Level 2, senior) | `nithya.v@mepcoeng.ac.in` | `faculty123` |
| 🏛️ HOD (CSE) | `hod.cse@mepcoeng.ac.in` | `hod123` |
| 🏛️ HOD (ECE) | `hod.ece@mepcoeng.ac.in` | `hod123` |
| 🛡️ Admin | `admin@mepcoeng.ac.in` | `admin123` |

> The login page has role tabs that auto-fill these credentials.

Seeded data: **1 admin · 2 HODs · 5 faculty (3 junior, 2 senior) · 8 students · 12 KB articles · 10 tickets.**

---

## Environment Variables

`server/.env`:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | API port |
| `NODE_ENV` | `development` | Environment |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/academic_helpdesk` | MongoDB connection string |
| `JWT_SECRET` | *(set this!)* | JWT signing secret |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `SLA_HOURS` | `24` | SLA window in **working** hours |
| `WORKDAY_START` | `09:00` | Working-hours window start |
| `WORKDAY_END` | `17:00` | Working-hours window end |

---

## Production Build & Deploy

```bash
npm run production
```

This builds the React client into `client/dist`, which the Express server serves as static
assets with an SPA fallback, so the whole app runs from a single origin.

For production:
1. Set a strong `JWT_SECRET` and a real `MONGO_URI`.
2. Put the Node process behind a reverse proxy (nginx/Caddy) with TLS.
3. Run it with PM2: `pm2 start ecosystem.config.cjs`.
4. Point MongoDB at a managed instance (Atlas) with authentication enabled.

---

## Not Yet Implemented / Next Steps

- 📎 File attachments on tickets (schema supports `attachments[]`, upload not wired up).
- 📧 Email delivery — notifications are currently **in-app only**; add an SMTP/transactional
  provider (e.g. Resend, SendGrid) to the `notify()` helper.
- 🔁 Real-time updates via WebSockets / SSE (the UI polls every 30–60s today).
- 🧠 Embedding-based semantic search (sentence-transformers) to complement the TF-IDF matcher.
- 📊 Exportable reports (CSV/PDF) from the analytics pages.
- 🗓️ Business-calendar awareness for SLA (holidays, exam weeks).
- 🔐 Refresh tokens, 2FA, and SSO/LDAP integration for institutional accounts.
- 🧪 Automated test suite (Jest + Supertest for the API, Vitest/RTL for the client).
- ♿ Accessibility audit to WCAG 2.1 AA and full keyboard-navigation pass.

---

## License & Attribution

Built as an academic project. Re-brand freely by changing the name in
`client/src/layouts/Layout.jsx`, `client/index.html`, `client/src/pages/auth/Login.jsx`,
and the seed data in `server/src/seed/seed.js`.
