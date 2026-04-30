# PRAGATI AI — Progress Tracking

## ✅ Phase 1: Backend Foundation (COMPLETE)

### Infrastructure
- [x] Next.js 15 scaffold with `serverExternalPackages` for native Node modules
- [x] Supabase SSR client (cookie-based auth, server-only admin client)
- [x] Auth middleware with session refresh, role-based route protection
- [x] Auth server actions (`login`, `signup`, `signout`) in `app/login/actions.ts`
- [x] `.env.local.example` with all required vars

### Intelligence Engines (`lib/` — 837 lines)
| Module | Lines | Purpose |
|--------|-------|---------|
| `claude.ts` | 145 | Anthropic wrapper: retry + backoff, 5 prompt templates |
| `schemes.ts` | 185 | Rule-based pre-filter for 10 schemes, returns eligible + excluded with reasons |
| `fraud.ts` | 189 | 5 parallel fraud checks: dup Aadhaar, amount anomaly, village cluster, dup land, dup scheme |
| `distress.ts` | 104 | Predictive distress scoring (4 signal types, 4 risk levels) |
| `ocr.ts` | 80 | PDF + image OCR with pdf-parse v2 → Tesseract fallback |
| `constants.ts` | 76 | SLA configs, 36 MH districts, dropdowns, ID generators |
| `audit.ts` | 58 | Fire-and-forget audit logging with pre-built action constructors |

### Type System (`types/index.ts` — 207 lines)
- [x] Full interfaces: Application, Grievance, Profile, Scheme, DistressScore, FarmerProfile
- [x] API response types: ClassifyDocument, Eligibility, GrievanceAnalysis, LegalAnalysis
- [x] AuditLogEntry, NewApplication, IrregularityResult, PreRejectionWarning

### API Routes (15 endpoints)
| Route | Method | Module | Status |
|-------|--------|--------|--------|
| `/api/classify-document` | POST | Doc Classification + OCR + Fraud + Audit | ✅ |
| `/api/check-eligibility` | POST | Scheme Matching (eligible + excluded with reasons) | ✅ |
| `/api/analyze-grievance` | POST | Grievance NLP + Auto-distress recompute + Audit | ✅ |
| `/api/legal-analysis` | POST | VakilSaathi Document Analysis | ✅ |
| `/api/fraud-check` | POST | Standalone Fraud Check | ✅ |
| `/api/dashboard` | GET | 9 KPIs + 5 charts + taluka heatmap + activity feed | ✅ |
| `/api/distress` | GET/POST/PATCH | Distress CRUD + officer acknowledge | ✅ |
| `/api/applications` | GET | List (paginated, filtered) | ✅ |
| `/api/applications/[id]` | GET/PATCH | Detail + Officer Actions + Audit | ✅ |
| `/api/applications/batch` | POST | Bulk approve/reject (up to 50) + Audit | ✅ |
| `/api/grievances` | GET | List (priority-sorted, overdue-enriched) | ✅ |
| `/api/grievances/[id]` | PATCH | Status Update + Audit | ✅ |
| `/api/constants` | GET | All dropdown values for frontend forms | ✅ |
| `/api/audit` | GET | Accountability trail viewer (officer-only) | ✅ |
| `/api/health` | GET | System health check (no auth) | ✅ |

### Database (`supabase/schema.sql`)
- [x] 6 tables: profiles, applications, grievances, eligibility_checks, distress_scores, audit_log
- [x] Row Level Security on all tables
- [x] 12 performance indexes
- [x] Auto-profile creation trigger on signup
- [x] Auto-update `updated_at` trigger
- [x] UNIQUE constraint on `distress_scores.farmer_identifier` for upsert

### Seed Data (`scripts/seed.js`)
- [x] 2 demo auth users (clerk + officer) via Supabase Admin API
- [x] 20 realistic applications (3 HIGH risk with irregularity flags)
- [x] 10 grievances (2 overdue, 1 escalated, bilingual Marathi+English)
- [x] 3 distress scores (1 CRITICAL, 2 HIGH)

### TypeScript Compilation: ✅ ZERO ERRORS

---

## 🔜 Phase 2: Frontend UI (PENDING — For Frontend Agent)

### Auth Pages
- [ ] Login page (`/login`) — email/password form using server actions
- [ ] Signup page with role selection (clerk vs officer)

### Clerk Dashboard (`/clerk`)
- [ ] Document upload form (drag-and-drop via react-dropzone → `POST /api/classify-document`)
- [ ] Classification result card with confidence indicators
- [ ] Pre-rejection warnings display
- [ ] Irregularity flags display (held applications)
- [ ] Grievance registration form (`POST /api/analyze-grievance`)
- [ ] **distressAlert** toast when grievance triggers CRITICAL/HIGH distress
- [ ] Scheme eligibility checker (`POST /api/check-eligibility`)
  - Show eligible schemes AND excluded schemes with exclusion reasons
- [ ] VakilSaathi legal document upload (`POST /api/legal-analysis`)

### Officer Dashboard (`/officer`)
- [ ] Command Center with 9 KPI cards (from `GET /api/dashboard`)
- [ ] Application queue table (filterable, sortable)
- [ ] Batch approve/reject button (`POST /api/applications/batch`)
- [ ] Application detail panel (`GET/PATCH /api/applications/[id]`)
- [ ] Grievance tracker with SLA countdown + overdue highlighting
- [ ] Distress Intelligence panel (`GET /api/distress?min_risk=HIGH`)
  - Pulsing indicator for `needs_immediate_attention` farmers
  - Officer "Acknowledge" action (`PATCH /api/distress`)
- [ ] Taluka heatmap visualization (data from dashboard API)
- [ ] Audit trail viewer (`GET /api/audit`)
- [ ] Charts: status, doc types, risk distribution, grievance categories, priorities

### Shared Components
- [ ] Navigation sidebar with role-based menu
- [ ] Status badge component (color-coded)
- [ ] Risk score indicator (LOW=green, MEDIUM=amber, HIGH=red)
- [ ] SLA countdown timer component
- [ ] Toast notifications (sonner) — hook into distressAlert responses

---

## Demo Credentials
```
Clerk:   clerk@pragati.demo / clerk123
Officer: officer@pragati.demo / officer123
```

## Setup Steps
1. Create Supabase project → copy URL, anon key, service role key to `.env.local`
2. Run `supabase/schema.sql` in SQL Editor
3. Create storage bucket named `documents` (public)
4. Add Anthropic API key to `.env.local`
5. Run `node scripts/seed.js` to populate demo data
6. Run `npm run dev` to start the app
