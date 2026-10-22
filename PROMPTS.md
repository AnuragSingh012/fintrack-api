# Copilot Prompt Log — FinTrack API

## Prompt 1 — Initial Transaction Module

- **Copilot feature:** GitHub Copilot Chat
- **Prompting technique:** Low-specificity prompting
- **Purpose:** Generate the initial transaction model and service using a deliberately broad prompt, then review the generated code.

### Exact prompt

> Generate a Transaction model and a Transaction service with create, get-by-user, and delete-all functions. Use a database.

### Generated output

- `src/transactions/transaction.model.ts`
- `src/transactions/transaction.repository.ts`
- `src/transactions/transaction.service.ts`

### Review

I reviewed the generated files using Copilot Chat in Ask mode. Copilot reported no confirmed defects and identified unbounded transaction retrieval as a potential performance concern.

## Prompt 2 — Express Application Bootstrap

- **Copilot features:** Plan mode, then Agent mode
- **Prompting technique:** Requirements-based planning followed by one-shot implementation
- **Purpose:** Set up the Express application and server startup while keeping app creation separate from listener startup.

### Exact prompt used in Plan mode

Implement the Express application bootstrap in #app.ts and #server.ts

Requirements:
- In app.ts, create and export an Express app.
- Enable JSON request-body parsing.
- Add GET /health, returning HTTP 200 with { "status": "ok" }.
- Register a not-found handler for unmatched routes.
- In server.ts, load environment variables and start the app listening on the configured PORT, with a sensible default.
- Keep app creation separate from server startup so Supertest can import the app without opening a network listener.
- Do not add dependencies or modify unrelated files.
- Summarize the files changed and verification results.

### Exact prompt used in Agent mode

Implement the plan

### Implementation and verification

- Files changed: src/app.ts and src/server.ts.
- Added Express app creation, JSON body parsing, GET /health, and a JSON 404 response.
- Added environment loading and server startup using PORT with a default of 3000.
- Kept app import separate from listener startup.
- Verification reported by Copilot: npm run build, HTTP behavior checks, and git diff --check passed.
- Human review: I checked the changed files and confirmed they matched the intended requirements.

## Prompt 3 — Centralized Error Handling

- **Copilot features:** Plan mode, then Agent mode
- **Prompting technique:** Requirements-based planning with response-shape clarification, followed by implementation using the approved plan.
- **Purpose:** Add centralized Express error handling for validation, malformed JSON, invalid ObjectIds, and unexpected errors without exposing stack traces or internal details.

### Workflow

- In Plan mode, Copilot inspected the app and middleware conventions and confirmed the client-facing error response shape before proposing the implementation.
- The approved plan specified a nested JSON response: `{ "error": { "message": "...", "details": [...]? } }`, with sanitized field-level validation details.
- In Agent mode, implementation proceeded using that approved plan.

### Implementation and verification

- Files changed: `src/middleware/error.middleware.ts` and `src/app.ts`.
- Added centralized handling for Zod validation errors, Mongoose validation errors, invalid ObjectId casts, malformed JSON, and unexpected errors.
- Validation details contain field paths and generic messages, not submitted values. Unexpected errors return a generic message without stack traces or internal details.
- Verification passed: `npm run build`, targeted runtime checks for the requested error cases and safe responses, and `git diff --check`.