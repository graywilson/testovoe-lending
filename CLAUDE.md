# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all dependencies (root + server + client)
npm run setup

# Start dev servers (frontend on :5173, backend on :41321)
npm run dev

# Build for production (Vite client + tsc server)
npm run build

# Run production build
npm start

# Type-check both workspaces
npm run typecheck
```

## Architecture

Monorepo with a TypeScript frontend (`client/`) and a Node.js/Express backend (`server/`). In production, Express serves Vite's static output and handles API routes. In development, Vite's dev server runs on :5173 with a `/api` proxy to the backend at :41321.

### Client (`client/`)

Entry point is `src/main.ts`, which imports and initializes modules. Business logic lives in `src/modules/`: navigation, scroll-reveal animations, contact form, AI assistant, DOM utilities, and rendering. Page content (copy, projects list) lives in `src/data/`. SCSS uses `@use`/`@forward` with no global imports — each file imports what it needs. Vite bundles everything; TypeScript is checked separately via `tsc --noEmit`.

### Server (`server/src/`)

`index.ts` registers middleware, mounts routes, and adds the SPA fallback (serving `index.html` for non-API 404s). `config.ts` centralizes environment variable access with defaults. Route files in `routes/` use `asyncHandler` from `utils/` for error propagation. Services in `services/` wrap Groq API calls and nodemailer.

### AI Integration

Three Groq-powered features (all use the OpenAI-compatible Groq API):
- **Text polish** — rewrites a draft message to formal language (non-streaming)
- **Lead analysis** — auto-triages a submitted form to summary/category/priority (non-streaming)
- **Chat assistant** — streaming chat with SSE; client in `src/api/` parses the event stream

### Environment Variables

Copy `.env.example` to `.env` in the repo root. Key variables: `GROQ_API_KEY`, `SMTP_HOST/PORT/USER/PASS`, `MAIL_FROM`, `MAIL_TO`, `CORS_ORIGIN`. Secrets never reach the client bundle — all AI and SMTP calls happen server-side.

### Docker

Multi-stage `Dockerfile`: stage 1 builds the client with Vite, stage 2 builds the server with `tsc`, final stage runs `node dist/index.js` with only prod dependencies. `docker-compose.yml` exposes port 41321.
