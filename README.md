# IT Asset & Support Desk Management System (assetdesk)

A web system where an IT team tracks hardware assets, software licenses and support tickets, with role-based access, an audit trail, license-expiry alerts and CSV reports.

## Overview
assetdesk is an enterprise IT management platform designed to replace ad-hoc spreadsheets, email threads, and informal chat requests. It provides centralized asset tracking, seat-based license monitoring with expiry alerts, an SLA-aware ticket management workflow, comprehensive audit logs, and CSV reporting.

## Tech Stack
- **Frontend**: React 18, Vite 5, React Router 6, Axios, Vanilla CSS
- **Backend**: Node.js 20 LTS, Express 4, Mongoose 8 (CommonJS)
- **Database**: MongoDB 7 (Local or Atlas)
- **Security**: JSON Web Token (JWT), bcryptjs, helmet, cors, express-rate-limit, express-validator
- **Testing**: Jest, Supertest, mongodb-memory-server, Playwright
- **Jobs & Utilities**: node-cron, nodemailer

## Setup
1. Clone the repository and navigate to the root directory.
2. Ensure Node.js (v20+ LTS) and MongoDB are installed and running.
3. Install backend dependencies:
   ```bash
   cd server
   npm install
   ```
4. Copy the environment variables:
   ```bash
   cp .env.example .env
   ```

## Run
Start the backend server in development mode:
```bash
cd server
npm run dev
```
The server will start on `http://localhost:5000`.

## Seed Data
Populate the database with standard demo users, hardware assets, software licenses, and support tickets:
```bash
cd server
npm run seed
```

## Tests
Run backend unit and integration test suites:
```bash
cd server
npm test
```

## Deployment
- **API**: Render
- **Client**: Vercel
- **Database**: MongoDB Atlas

## Folder Structure
```
assetdesk/
  PROJECT_CONTRACT.md   # Single source of truth specifications
  BUILD_LOG.md          # Log of additions, fixes, and command verification
  README.md             # Project documentation and setup guide
  server/               # Express + Mongoose API backend
    src/
      app.js            # Express application setup
      server.js         # Server entrypoint and DB connection
      config/           # Environment and DB connection configuration
      models/           # Mongoose schemas (User, Asset, License, Ticket, AuditLog, Counter)
      middleware/       # Auth, role check, validation, and error handling
      controllers/      # Request handlers
      routes/           # API route definitions
      services/         # Audit, mail, CSV, and ticket business logic
      jobs/             # Scheduled cron jobs (license expiry alerts)
      utils/            # Custom errors, async wrapper, date helpers
      seed/             # Demo data seeding script
    tests/              # Unit, integration, and memory DB helpers
  client/               # React + Vite frontend application
  e2e/                  # Playwright system and screenshot tests
  docs/                 # Project documentation and report generator
```
