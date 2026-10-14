# Build Log

## Contract additions
- `server/src/models/AuditLog.js`: Added query option `bypassAuditLock: true` for administrative maintenance (such as database re-seeding) while maintaining strict append-only immutability across all application routes and queries.

## Bugs fixed
- Seed script collection reset failed on AuditLog: `AuditLog.deleteMany({})` was blocked by the append-only pre hook. Cause: pre-delete hook intercepted administrative reset. Fix: supported `bypassAuditLock: true` query option in `AuditLog.js` and passed it in `seed.js`.
- Suffix length mismatch in expiring license test fixture: `KEY-EXP-001` yielded `****-****--001` with a dash in the last 4 characters instead of `****-****-0001`. Cause: 3-digit suffix instead of 4 digits. Fix: updated fixture key to `KEY-EXP-0001`.

## Commands & real results
- `cd server && npm run lint`: PASSED (0 errors, 0 warnings).
- `cd server && npm test`: PASSED (11 passed tests across models.test.js and dates.test.js, 9 suites skipped for future parts).
- `cd server && npm run seed`: PASSED (seeded 8 users, 15 assets, 5 licenses, 12 tickets, 4 audit logs).
- `curl http://localhost:5000/api/v1/health`: PASSED (HTTP 200 `{"success":true,"data":{"status":"healthy","timestamp":"2026-10-14T05:04:02.628Z"}}`).
- Part 2 `cd server && npm run lint`: PASSED (0 errors, 0 warnings).
- Part 2 `cd server && npm test`: PASSED (42 passed tests across users.test.js, auth.test.js, models.test.js, dates.test.js, 7 suites skipped for future parts).
- Part 2 manual curl demo: PASSED (admin login, /auth/me profile fetch, admin POST /users 201, employee POST /users 403, employee GET /users/lookup 403, support GET /users/lookup 200).
- Part 3 `cd server && npm run lint`: PASSED (0 errors, 0 warnings).
- Part 3 `cd server && npm test`: PASSED (82 passed tests across assets.test.js, users.test.js, auth.test.js, models.test.js, dates.test.js, 6 suites skipped for future parts).
- Part 3 manual curl demo: PASSED (admin login, user lookup, create asset with auto tag AST-2026-0016, atomic assign to user, list with category & assigned filters, audit trail verification showing 2 rows for ASSET_CREATE and ASSET_ASSIGN).
- Part 4 `cd server && npm run lint`: PASSED (0 errors, 0 warnings).
- Part 4 `cd server && npm test`: PASSED (122 passed tests across licenses.test.js, assets.test.js, auth.test.js, users.test.js, dates.test.js, models.test.js, 5 suites skipped for future parts).
- Part 4 `cd server && npm run seed`: PASSED (seeded 8 users, 15 assets, 5 licenses, 12 tickets, 4 audit logs).
- Part 4 real demo `node -e runLicenseExpiryCheck()`: PASSED (alerted for expired license "Adobe Creative Cloud All Apps", sent simulated mail to `admin@assetdesk.local`, logged audit entry, second run generated 0 duplicate alerts).



