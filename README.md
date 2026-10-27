# Iso

Event-driven AI engineering platform. CI Failure Investigator using NVIDIA Nemotron via Nebius Token Factory.

## Features (v0.1)
- GitHub App integration with webhook support
- CI failure investigation workflow
- Evidence-backed diagnosis using Nebius Token Factory
- DB-backed job queue
- Dashboard for run inspection

## Setup

1. Install dependencies
```bash
npm install
```

2. Configure environment
```bash
cp .env.example .env
```

3. Set up database
```bash
npx prisma db update
```

4. Run development server
```bash
npm run dev
```

5. Run worker (separate process)
```bash
npm run worker:dev
```

## Environment Variables
See `.env.example` for required variables.

## Notes
- Uses GitHub Actions for execution (no Nebius AI Cloud credits required)
- Control plane does not execute repository code
- Model hypotheses are clearly labeled as such
