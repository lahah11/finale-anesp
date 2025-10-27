# ANESP Mission Management Platform

This repository contains the unified backend (Express) and frontend (Next.js) for the ANESP order of mission platform. The application covers the full workflow from mission creation to archival, including document generation, logistics assignment, multilingual UI, and secure document handling.

## Prerequisites

- Node.js 18+
- npm 9+
- Docker & Docker Compose (for the recommended setup)

## Getting started locally

```bash
# install dependencies
cd backend && npm install
cd ../frontend && npm install

# run database migrations
cd ../backend
npm run migrate

# start backend and frontend in parallel (two terminals)
cd backend && npm run dev
cd frontend && npm run dev
```

Environment variables can be configured by copying `.env.example` to `.env` and adjusting the values.

## Docker Compose setup

A `docker-compose.yml` file is provided to orchestrate PostgreSQL, the backend API, and the frontend application.

```bash
docker-compose up --build
```

- Backend API: <http://localhost:5000>
- Frontend UI: <http://localhost:3000>

## Testing

Placeholder scripts are available:

```bash
cd backend && npm test
cd ../frontend && npm test
```

Replace the placeholder commands with actual unit or integration tests as they are implemented.

## Internationalisation (FR/AR)

The frontend uses a lightweight dictionary available in `frontend/src/i18n/dictionary.ts`. Use the `useTranslation()` hook from `src/app/providers.tsx` to retrieve the translation function `t(key)` and the layout direction.

## Key features

- Unified mission workflow stored in `missions_unified`
- Logistics assignment for terrestrial and aerial missions with secure ticket uploads
- Mission closure and archiving with document history
- Full validation timeline and audit trail display
- Advanced mission list filters and search
- Dedicated support page with procedures and contacts

For more information on architecture or development guidelines, consult the source files and inline comments.
