# PROJECT CONTRACT — IT Asset & Support Desk Management System (assetdesk)

## 1. Project identity
- Title: IT Asset & Support Desk Management System
- Code name / repo name: assetdesk
- Domain: Web application / Enterprise IT management
- One line: A web system where an IT team tracks hardware assets, software licenses and support tickets, with role-based access, an audit trail, license-expiry alerts and CSV reports.
- Problem (generic, no statistics): IT teams often manage devices, software licenses and employee support requests in spreadsheets, e-mail and chat. This causes outdated records, no history of who held a device, missed license renewals, and support requests with no tracking number or status.
- Objectives:
  1. Keep one central, searchable record of hardware assets with a status life-cycle.
  2. Track software licenses, seats and expiry dates, and warn before expiry.
  3. Provide a support ticket system with priority, due time, assignment and comments.
  4. Protect data with login, role-based access and password hashing.
  5. Record every important change in an audit log.
  6. Give simple dashboards and CSV reports.

## 2. Technology (fixed versions; use latest patch of these majors)
- Frontend: React 18, Vite 5, React Router 6, Axios, plain CSS in `src/styles/`. JavaScript (JSX), not TypeScript.
- Backend: Node.js 20 LTS, Express 4, Mongoose 8, CommonJS modules.
- Database: MongoDB 7 (local or Atlas).
- Libraries (backend): jsonwebtoken, bcryptjs (10 salt rounds), helmet, cors, morgan, express-rate-limit, express-validator, dotenv, node-cron, nodemailer, nodemon (dev).
- Testing: Jest, Supertest, mongodb-memory-server (backend); Playwright (system tests + screenshots).
- Quality: ESLint + Prettier (basic config).
- Deployment targets: Render (API), Vercel (client), MongoDB Atlas.

## 3. Folder structure (create exactly)
```
assetdesk/
  PROJECT_CONTRACT.md  BUILD_LOG.md  README.md  .gitignore
  server/
    package.json  .env.example
    src/
      app.js  server.js
      config/        db.js  env.js
      models/        User.js Asset.js License.js Ticket.js AuditLog.js Counter.js
      middleware/    auth.js  roles.js  validate.js  errorHandler.js  audit.js
      controllers/   auth.js users.js assets.js licenses.js tickets.js dashboard.js reports.js auditLogs.js
      routes/        index.js auth.js users.js assets.js licenses.js tickets.js dashboard.js reports.js auditLogs.js
      services/      auditService.js  mailService.js  csv.js  ticketRules.js
      jobs/          licenseExpiryJob.js
      utils/         ApiError.js  asyncHandler.js  dates.js
      seed/          seed.js
    tests/
      unit/          csv.test.js  ticketRules.test.js  dates.test.js  models.test.js
      integration/   auth.test.js  users.test.js  assets.test.js  licenses.test.js  tickets.test.js  audit.test.js  reports.test.js
      helpers/       setup.js
  client/
    package.json  vite.config.js  index.html
    src/
      main.jsx  App.jsx
      api/           http.js  auth.js  assets.js  licenses.js  tickets.js  users.js  dashboard.js  reports.js  audit.js
      context/       AuthContext.jsx
      components/    Layout.jsx  Sidebar.jsx  Topbar.jsx  ProtectedRoute.jsx  DataTable.jsx  StatusBadge.jsx  Pagination.jsx  ConfirmDialog.jsx  FormField.jsx  Toast.jsx  EmptyState.jsx  Loader.jsx
      pages/         Login.jsx Dashboard.jsx AssetList.jsx AssetForm.jsx AssetDetail.jsx MyAssets.jsx LicenseList.jsx LicenseForm.jsx LicenseDetail.jsx TicketList.jsx TicketForm.jsx TicketDetail.jsx Users.jsx AuditLogs.jsx Reports.jsx Profile.jsx NotFound.jsx
      styles/        base.css  layout.css  components.css  pages.css
  e2e/
    playwright.config.js  tests/system.spec.js  screenshots.spec.js
  docs/
    assets/diagrams  assets/screenshots  build/ (document engine)  output/
```

## 4. Roles and permissions
| Action | ADMIN | IT_SUPPORT | EMPLOYEE |
|---|---|---|---|
| Login, view/edit own profile, change own password | yes | yes | yes |
| Manage users (create, edit, activate/deactivate) | yes | no | no |
| View user lookup list (names for dropdowns) | yes | yes | no |
| View all assets / create / edit / assign / change status | yes | yes | no |
| View own assigned assets (`/assets/mine`) | yes | yes | yes |
| View licenses, create/edit, allocate seats | yes | yes | no |
| View full license key | yes | no (masked) | no |
| Create ticket | yes | yes | yes |
| View tickets | all | all | own only |
| Assign ticket, change status | yes | yes | no (may add comments on own; may reopen own RESOLVED ticket) |
| Dashboard | full | full | personal (own assets + own tickets) |
| Reports (CSV): assets, licenses, tickets | yes | yes | no |
| Audit log + audit CSV | yes | no | no |

## 5. Enumerations (exact spelling)
- Role: ADMIN | IT_SUPPORT | EMPLOYEE
- Asset.category: LAPTOP | DESKTOP | MONITOR | PRINTER | NETWORK | MOBILE | OTHER
- Asset.status: AVAILABLE | ASSIGNED | MAINTENANCE | RETIRED
- Ticket.category: HARDWARE | SOFTWARE | NETWORK | ACCESS | OTHER
- Ticket.priority: LOW | MEDIUM | HIGH | CRITICAL  (due times: CRITICAL 4h, HIGH 24h, MEDIUM 48h, LOW 72h)
- Ticket.status: OPEN | IN_PROGRESS | RESOLVED | CLOSED
- License status (computed, not stored): ACTIVE | EXPIRING (expiry within 30 days) | EXPIRED
- AuditLog.entity: AUTH | USER | ASSET | LICENSE | TICKET
- AuditLog.action: LOGIN | LOGIN_FAILED | USER_CREATE | USER_UPDATE | USER_STATUS | PASSWORD_CHANGE | ASSET_CREATE | ASSET_UPDATE | ASSET_ASSIGN | ASSET_UNASSIGN | ASSET_STATUS | LICENSE_CREATE | LICENSE_UPDATE | LICENSE_ALLOCATE | LICENSE_RELEASE | LICENSE_EXPIRY_ALERT | TICKET_CREATE | TICKET_ASSIGN | TICKET_STATUS | TICKET_COMMENT | REPORT_EXPORT

## 6. Data model (Mongoose, all with timestamps)
- **User**: name (String, required, 2–100), email (String, required, unique, lowercase), passwordHash (String, required, select:false), role (Role, default EMPLOYEE), department (String, optional), isActive (Boolean, default true).
- **Asset**: assetTag (String, unique, auto `AST-<YEAR>-<0001>` from Counter), serialNumber (String, required, unique, trimmed), name (String, required — make and model), category (enum), status (enum, default AVAILABLE), assignedTo (ObjectId→User or null), purchaseDate (Date), warrantyExpiry (Date, optional), notes (String ≤ 500).
- **License**: softwareName (required), vendor (String), licenseKey (String, required), totalSeats (Number int ≥ 1), allocations [ { user: ObjectId→User, allocatedAt: Date } ], expiryDate (Date, required), notes. Virtuals: usedSeats = allocations.length, availableSeats, status (computed).
- **Ticket**: ticketCode (unique, `TCK-<YEAR>-<0001>` from Counter), title (5–150), description (required ≤ 2000), category, priority, status (default OPEN), createdBy (→User), assignedTo (→User or null), relatedAsset (→Asset or null), comments [ { author→User, message (≤ 1000), createdAt } ], resolutionNote, dueAt (Date, computed at creation), resolvedAt, closedAt.
- **AuditLog** (append-only; never update/delete; no routes for edit/delete): user (→User or null), userName (snapshot String), action, entity, entityId (String), details (String ≤ 300), ip (String), createdAt.
- **Counter**: key (String unique, e.g. `asset-2026`, `ticket-2026`), seq (Number). Use atomic `findOneAndUpdate` with `$inc` and upsert.

## 7. Business rules
1. serialNumber must be unique (HTTP 409 on duplicate).
2. Only an AVAILABLE asset can be assigned; assigning sets status ASSIGNED and assignedTo; unassign sets AVAILABLE and null. Setting status MAINTENANCE or RETIRED clears assignedTo. RETIRED assets cannot be assigned or edited except notes.
3. A license cannot get more allocations than totalSeats; one user cannot hold two seats of the same license; totalSeats cannot be set below current usedSeats.
4. License status: EXPIRED if expiryDate < today; EXPIRING if within next 30 days; else ACTIVE.
5. Ticket flow: OPEN → IN_PROGRESS (needs assignedTo) → RESOLVED (needs resolutionNote) → CLOSED. RESOLVED → IN_PROGRESS allowed (reopen). CLOSED is final: no edits, no comments.
6. Employees can only see/comment on their own tickets and see their own assets.
7. User with isActive=false cannot log in. Admin cannot deactivate or demote their own account.
8. Passwords: minimum 8 characters, at least one letter and one digit. Stored only as bcrypt hash. Never returned in any response.
9. Every create/update/assign/status/allocate/export/login action writes an AuditLog row (middleware or service call).
10. License expiry job runs daily at 08:00 server time and also on server start (once). For licenses expiring in exactly 30, 15 or 7 days (or already expired today), it sends an e-mail to all ADMIN users if SMTP env vars exist, otherwise prints to console; and writes a LICENSE_EXPIRY_ALERT audit row (no duplicate row for the same license + same day).

## 8. API (base `/api/v1`, JSON, JWT in `Authorization: Bearer <token>`)
Success envelope: `{ "success": true, "data": ..., "meta": { page, limit, total } }` (meta only for lists). Error envelope: `{ "success": false, "error": { "code": "STRING", "message": "Human readable", "details": [] } }`.
Codes: VALIDATION_ERROR(400) UNAUTHORIZED(401) FORBIDDEN(403) NOT_FOUND(404) CONFLICT(409) RATE_LIMITED(429) SERVER_ERROR(500).
- GET `/health` → full path `/api/v1/health` (public)
- Auth: POST `/auth/login` · GET `/auth/me` · POST `/auth/change-password`
- Users (ADMIN): GET `/users` (search, role, isActive, page, limit) · POST `/users` · GET `/users/:id` · PUT `/users/:id` · PATCH `/users/:id/status` · GET `/users/lookup` (ADMIN, IT_SUPPORT)
- Assets: GET `/assets` (ADMIN, IT_SUPPORT; q, category, status, assigned, page, limit, sort) · GET `/assets/mine` (any) · POST `/assets` · GET `/assets/:id` · PUT `/assets/:id` · PATCH `/assets/:id/assign` {userId} · PATCH `/assets/:id/unassign` · PATCH `/assets/:id/status` {status}
- Licenses (ADMIN, IT_SUPPORT): GET `/licenses` (q, status, page, limit) · POST `/licenses` · GET `/licenses/expiring?days=30` · GET `/licenses/:id` · PUT `/licenses/:id` · POST `/licenses/:id/allocate` {userId} · DELETE `/licenses/:id/allocate/:userId`
- Tickets: POST `/tickets` · GET `/tickets` (status, priority, category, assignedTo, q, page, limit; employees auto-filtered to own) · GET `/tickets/:id` · PATCH `/tickets/:id/assign` {assignedTo} · PATCH `/tickets/:id/status` {status, resolutionNote?} · POST `/tickets/:id/comments` {message}
- Dashboard: GET `/dashboard/summary` (role-aware)
  - ADMIN/IT_SUPPORT: assetsTotal, assetsByStatus, assetsByCategory, licensesExpiring, licensesExpired, ticketsByStatus, ticketsOverdue, recentTickets (5), recentAudit (5, admin only)
  - EMPLOYEE: myAssetsCount, myOpenTickets, myRecentTickets
- Reports (CSV download, `text/csv`): GET `/reports/assets` · `/reports/licenses` · `/reports/tickets` (ADMIN, IT_SUPPORT) · `/reports/audit` (ADMIN)
- Audit (ADMIN): GET `/audit-logs` (action, entity, user, from, to, page, limit)
Rate limit: login route 10 requests / 15 min / IP; general API 300 / 15 min / IP.

## 9. Frontend routes (React Router)
`/login` · `/` Dashboard · `/assets` · `/assets/new` · `/assets/:id` (detail + edit via `/assets/:id/edit`) · `/my-assets` · `/licenses` · `/licenses/new` · `/licenses/:id` · `/tickets` · `/tickets/new` · `/tickets/:id` · `/users` (ADMIN) · `/audit` (ADMIN) · `/reports` · `/profile` · `*` NotFound.
Sidebar items are shown by role. JWT stored in `localStorage` key `assetdesk_token`; Axios interceptor adds the header and redirects to `/login` on 401.
UI style: clean, light theme, navy primary `#1e3a8a`, success `#16a34a`, warning `#d97706`, danger `#dc2626`, background `#f8fafc`, font stack `Calibri, Carlito, Segoe UI, Arial, sans-serif`. Responsive for 1366×768 and 1920×1080 (and usable on tablet). Every list page: search, filters, pagination, empty state, loading state. Every form: inline validation messages.

## 10. Environment variables
server `.env.example`: PORT=5000, MONGODB_URI=mongodb://127.0.0.1:27017/assetdesk, JWT_SECRET=change_me_long_random, JWT_EXPIRES_IN=8h, CLIENT_ORIGIN=http://localhost:5173, SMTP_HOST=, SMTP_PORT=587, SMTP_USER=, SMTP_PASS=, MAIL_FROM=assetdesk@example.local, NODE_ENV=development
client `.env.example`: VITE_API_URL=http://localhost:5000/api/v1

## 11. Seed data (demo only, clearly fake; never real people/companies)
Command `npm run seed` (in server) clears and inserts: 1 ADMIN `admin@assetdesk.local`, 2 IT_SUPPORT `support1@assetdesk.local`, `support2@assetdesk.local`, 5 EMPLOYEE `emp1..emp5@assetdesk.local`; default password for all demo users `Demo@1234` (README must say: change in real use); 15 assets across categories/statuses (some assigned); 5 licenses (one expired, one expiring in 12 days, one in 25 days, two active); 12 tickets across statuses/priorities with a few comments. Department names generic (Engineering, QA, HR, Finance).

## 12. Security checklist
bcrypt hash; JWT with expiry; helmet; CORS restricted to CLIENT_ORIGIN; rate limits; express-validator on every body/query/param; Mongoose ObjectId validation; no password/hash in responses; generic login error message; role middleware on every protected route; license key masked for non-admin; escape output in React (no dangerouslySetInnerHTML); `.env` never committed; error handler hides stack traces in production.

## 13. Coding conventions
Backend: routes → controllers → services/models; async handler wrapper; one `ApiError` class; small functions; comment on every file top (purpose) and on non-obvious logic; ESLint clean; consistent 2-space indent; double quotes.
Frontend: function components + hooks; one API file per module; no global state library (Context only for auth); keep each page under ~250 lines by using small components.
Git: commit after each part with message `Part N: <summary>`.

## 14. Done means
`npm test` (server) passes; `npm run seed` works; client builds with `npm run build`; Playwright system tests pass; screenshots captured; no console errors in the browser on any page.
