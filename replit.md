# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (dev), Supabase (EduLab app)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

### EduLab (artifacts/edulab)
- React + Vite frontend at `/`
- Educational platform with teacher panel and student interface
- Uses Supabase (realtime DB) + Groq/Llama AI for evaluation
- Config served via `/api/config` endpoint (Express server)
- Libraries: @supabase/supabase-js, groq-sdk, jspdf, jspdf-autotable, xlsx, react-markdown

### API Server (artifacts/api-server)
- Express server providing `/api/config` endpoint
- Exposes SUPABASE_URL, SUPABASE_ANON_KEY, GROQ_API_KEY to frontend safely

## EduLab Features
- Teacher login (admin/1234, changeable)
- Activity management with 6-char access codes
- Question builder (6 types including file upload)
- AI-powered rubric generator (Groq/Llama)
- AI-powered evaluation with detailed feedback
- Real-time grade center with Excel/PDF export
- Student interface with group support

## Supabase Setup
Run `artifacts/edulab/SUPABASE_SETUP.sql` in the Supabase SQL Editor to create tables.
Required secrets: SUPABASE_URL, SUPABASE_ANON_KEY, GROQ_API_KEY

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
