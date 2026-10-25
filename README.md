# Shipshape — Release Checklist

A responsive single-page release checklist application with a GraphQL API and PostgreSQL persistence.

## Features
- List, search, create, and delete releases.
- Ten shared checklist steps; checkbox changes update status automatically.
- Edit optional release notes.
- Responsive frontend.
- PostgreSQL migration and automated tests for status rules.

## Status rules
- `planned`: no steps completed
- `ongoing`: at least one, but not all, steps completed
- `done`: all ten steps completed

## Run locally
This repository includes Docker Compose for PostgreSQL and a small Node.js API server.

```bash
docker compose up --build
```

Open http://localhost:8080. GraphQL endpoint: http://localhost:4000/graphql

## GraphQL operations
- `releases`: list releases
- `createRelease(name, date, additionalInfo)`: create a release
- `updateRelease(id, completedSteps, additionalInfo)`: update checklist and/or notes
- `deleteRelease(id)`: delete a release

Example query:
```graphql
query { releases { id name date status additionalInfo completedSteps } }
```

## Database schema
Table `releases`:
- `id UUID PRIMARY KEY`
- `name TEXT NOT NULL`
- `release_date TIMESTAMPTZ NOT NULL`
- `additional_info TEXT NOT NULL DEFAULT ''`
- `completed_steps JSONB NOT NULL DEFAULT '[]'`
- `created_at`, `updated_at` timestamps

## Tests
Run `npm test`.

## Load testing
Use k6 against the deployed GraphQL endpoint. Ramp through 1, 5, 10, 25, 50 and 100 virtual users; record throughput, p95 latency and error rate. Repeat after any optimizations. This repository does not include fabricated capacity numbers; measure on the target deployment and record actual results in your demo.
