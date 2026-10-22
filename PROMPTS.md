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

### Exact review prompt

> Review the transaction module in #transaction.model.ts, #transaction.repository.ts, and #transaction.service.ts.
>
> Identify only genuine, verifiable issues. For each finding, explain its location, evidence, impact, and recommended fix. Distinguish confirmed defects from potential concerns

## Transaction Pagination Request

- **Chronology:** This request followed the initial Transaction module review and preceded the Express bootstrap work.
- **Prompt record:** The exact request is available in the conversation history and is reproduced verbatim.

### Exact prompt

> #transaction.repository.ts, #transaction.service.ts
> Implement pagination for `findTransactionsByUser()` so clients can retrieve transactions in manageable pages. Validate that page and page-size values are positive integers, set sensible defaults and a maximum page size, preserve filtering by user ID, sort consistently by transaction date and `_id`, and return pagination metadata such as the current page, page size, total records, and total pages.

- **Technique and rationale:** File-scoped, behavior-specific requirements constrained the change to repository/service pagination and named the validation, ordering, ownership filter, and metadata contract.

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
- **Prompt record:** Exact wording is available in the conversation history and is reproduced verbatim.

### Exact prompt

> Create `src/middleware/error.middleware.ts` and implement centralized error handling.
>
> - Handle Zod validation errors, Mongoose validation errors, invalid ObjectIds, malformed JSON, and unexpected errors.
> - Return consistent JSON error responses with appropriate HTTP status codes.
> - Never expose stack traces or internal details to clients.
> - Register the error handler in #app.ts
> - Do not add dependencies or modify unrelated files.
> - Run `npm run build` and report the actual result.

### Workflow

- In Plan mode, Copilot inspected the app and middleware conventions and confirmed the client-facing error response shape before proposing the implementation.
- The approved plan specified a nested JSON response: `{ "error": { "message": "...", "details": [...]? } }`, with sanitized field-level validation details.
- In Agent mode, implementation proceeded using that approved plan.

### Implementation and verification

- Files changed: `src/middleware/error.middleware.ts` and `src/app.ts`.
- Added centralized handling for Zod validation errors, Mongoose validation errors, invalid ObjectId casts, malformed JSON, and unexpected errors.
- Validation details contain field paths and generic messages, not submitted values. Unexpected errors return a generic message without stack traces or internal details.
- Verification passed: `npm run build`, targeted runtime checks for the requested error cases and safe responses, and `git diff --check`.

## Prompt 4 — JWT Authentication

- **Copilot features:** Plan mode, Agent mode, and security-focused code review.
- **Prompting techniques:** Requirements-based planning, clarification of provider-specific trust settings, focused security review, then targeted remediation.
- **Purpose:** Authenticate external-provider bearer tokens without implementing login or token issuance.

### Exact implementation prompt

> Implement JWT authentication
>
> Requirements:
>
> - Create `src/middleware/auth.middleware.ts` to authenticate requests using `Authorization: Bearer <token>`.
> - Add validated environment configuration for JWT verification, including the trusted issuer, audience, signing key or public key, and identity claim.
> - Verify the token signature, expiry, issuer, and audience. Never decode a token and treat it as trusted without verification.
> - Extract the authenticated user ID only from verified claims and attach it to the request for downstream controllers.
> - Return HTTP 401 for missing, malformed, expired, or invalid tokens, using the existing nested error response format.
> - Do not implement login, registration, or token issuance. Tokens come from an external trusted identity provider.
> - Do not trust user IDs supplied in request bodies.
> - Add focused tests for valid tokens and authentication failures.
> - Reuse existing configuration and error middleware where appropriate.
> - Identify any issuer, audience, key, or claim assumptions that cannot be determined from the project. Update `.env.example` if needed. Verify with `npm run build` and the relevant tests, reporting actual results.

### Exact security-review prompt

> Review the JWT authentication implementation in #jwt.config.ts, #auth.middleware.ts, #error.middleware.ts, #auth.middleware.test.ts, and #.env.example
>
> Do not modify any files. Perform a security-focused code review and check:
>
> 1. RS256 is explicitly pinned and no algorithm fallback is possible.
> 2. Signature, expiration, issuer, and audience are verified.
> 3. Missing, malformed, expired, and invalid tokens return HTTP 401 using the existing nested error response.
> 4. The authenticated identity is extracted only from verified claims and validated before assigning req.userId.
> 5. Invalid configuration fails safely, and no key material or secrets are hardcoded.
> 6. Error responses do not expose tokens, keys, or internal exception details.
> 7. Tests cover wrong issuer, wrong audience, invalid signature, and missing or invalid sub—not just missing and expired tokens.
> 8. The implementation is compatible with Express and TypeScript strict mode.
> For each finding, identify the file and relevant code, explain the impact, and recommend a correction. Distinguish confirmed defects from potential risks.

### Exact remediation prompt

> Implement the security fixes from our JWT review

### Workflow and remediation

- Plan mode inspection found no provider issuer, audience, key format, or identity-claim settings in the project. These assumptions were confirmed before implementation: deployment-supplied issuer and audience, RS256 with a PEM public key, and top-level `sub` as the identity claim.
- The implementation added Zod-validated JWT configuration, route-level bearer authentication, and nested HTTP 401 errors. Only verified claims are used for `req.userId`.
- A security review identified that tokens without `exp` could pass verification, RSA key strength was not constrained, and invalid-but-present identity claims needed direct tests.
- Remediation requires a finite expiration claim, enforces a 2048-bit minimum RSA public key, and adds tests for missing expiration and non-string/blank `sub` values.

### Verification

- `npm run build` passed.
- All 12 focused JWT tests passed against compiled output.
- Runtime configuration validation confirmed a 1024-bit RSA key is rejected.
- `git diff --check` passed. The repository's regular Jest config could not be loaded because of its existing TypeScript config loader issue; the focused tests were run against compiled output using a temporary config, which was removed.

## Prompt 5 — Jest Configuration

- **Copilot feature:** Agent mode
- **Prompting technique:** Focused corrective instruction based on the observed Jest config loader failure and installed tooling.
- **Purpose:** Make `npm test` load TypeScript tests without adding dependencies.

### Exact investigation prompt

> Investigate and recommend a fix for the Jest configuration issue preventing `npm test` from loading `jest.config.ts` because `ts-node` is missing. Inspect `package.json`, `jest.config.ts`, and `tsconfig.json`. Explain the smallest reliable fix and the commands to verify it.

### Exact implementation prompt

> Fix the Jest configuration using the recommended approach

### Implementation and verification

- Replaced `jest.config.ts` with `jest.config.cjs` and configured the existing `@swc/jest` transformer to compile TypeScript tests as CommonJS.
- Preserved the existing test matching, environment, mock clearing, and coverage settings.
- The focused JWT test run passed: 12 tests.
- Full `npm test` passed: 12 tests.
- `npm run build` passed.
- `git diff --check` passed.

## Prompt 6 — Transaction HTTP API

- **Copilot features:** Plan mode, Agent mode, and code review.
- **Prompting techniques:** Requirements-based planning for the existing service surface, followed by implementation and evidence-focused review.
- **Purpose:** Expose transaction create, paginated list, and delete-all operations over authenticated HTTP without adding service capabilities.

### Exact planning prompt

> Inspect these project files:
>
> - #app.ts
> - #transaction.model.ts
> - #transaction.repository.ts
> - #transaction.service.ts
> - #auth.middleware.ts
> - #error.middleware.ts
>
> Identify the minimum changes needed to expose the existing Transaction service through authenticated HTTP endpoints.
>
> Cover:
>
> 1. Missing controller and route files, and how routes should be mounted in app.ts.
> 2. Request validation for creating transactions and pagination parameters.
> 3. Authentication and ownership protection, ensuring the authenticated req.userId is the only source of transaction ownership.
> 4. HTTP methods, paths, status codes, and response formats for create, list, and delete-all operations supported by the existing service.
> 5. Required tests for successful requests, unauthenticated requests, invalid input, and attempts to spoof ownership.
> Do not modify files. Do not add features beyond the existing service capabilities.

### Exact implementation prompt

> Implement the plan

### Exact review prompt

> Review the newly implemented Transaction HTTP API. Inspect #transaction.controller.ts, #transaction.routes.ts, #transaction.routes.test.ts, #app.ts, #transaction.service.ts, and #error.middleware.ts
>
> Look specifically for:
>
> - Any way a client could read, create, or delete transactions belonging to another user.
> - Missing or incorrect request validation, including occurredAt and pagination.
> - Incorrect HTTP status codes or response shapes.
> - Authentication middleware ordering and error handling.
> - Missing meaningful test cases or false-positive tests.
> Separate confirmed defects from potential concerns. Explain the evidence and recommend minimal fixes.

### Exact transaction-pagination prompt

The verbatim pagination prompt is recorded chronologically after Prompt 1 in **Transaction Pagination Request** above.

### Implementation and review

- Added authenticated `POST`, `GET`, and `DELETE /api/transactions` endpoints and mounted their router in `src/app.ts`.
- Validated create fields and pagination parameters. Creation rejects unknown fields, including client-supplied `userId`; all service ownership arguments come only from verified `req.userId`.
- Added route tests for successful operations, authentication failure, invalid input, pagination defaults, and ownership spoofing.
- Code review found no confirmed defects. Potential concerns include UTC-only `occurredAt` parsing and test gaps around other unauthenticated methods and pagination boundaries.

### Verification

- All 21 tests across 2 suites passed.
- `npm run build` passed.
- `git diff --check` passed.

## Prompt 7 — Expense Splitting

- **Copilot features:** Plan mode, approved interactive implementation, and read-only code review.
- **Prompting techniques:** Architecture-aware requirements decomposition, explicit financial assumptions, scope control, then defect-only review with a required distinction between defects and optional concerns.
- **Purpose:** Plan and implement shared expenses in the existing layered architecture, followed by a read-only review of correctness and access control.

### Exact prompt used in Plan mode

> Inspect the existing FinTrack Transaction model, repository, service, authentication middleware, and project instructions. Plan the minimum implementation for the Expense Splitting feature described below, integrating with the existing architecture.
>
> Requirements:
>
> - Shared expenses have a creator, description, total amount, equal/custom split type, participants and their share amounts, and creation date.
> - Equal splits must handle rounding precisely using integer minor currency units.
> - Custom participant amounts must sum exactly to the total.
> - Reject expenses with fewer than two distinct participants, and prevent invalid or duplicate participants.
> - Calculate each participant's net balance with every other user across multiple shared expenses, offsetting amounts owed in opposite directions.
> - Preserve authenticated-user authorization and prevent users from accessing balances they are not entitled to see.
> - Identify the minimum models, repository, service, controller, routes, and tests needed. Reuse existing project conventions and dependencies.
>
> Do not invent requirements beyond this feature brief. Explain any assumptions about whether the creator is included among the participants and how currency amounts are represented.

### Exact implementation prompt

> Implement the plan

### Exact review prompt

> Review the Expense Splitting implementation. Do not modify files.
>
> - Check the Mongoose model/repository/service/controller/routes architecture.
> - Verify authenticated expense creation and current-user-only balance access.
> - Check equal/custom split validation and deterministic remainder allocation.
> - Verify pairwise debt netting across multiple expenses and zero-balance removal.
> - Check participant validation, identity spoofing prevention, and safe integer minor units.
> - Review error handling, type safety, and correctness of existing tests.
> Report only confirmed defects or requirement gaps, with the affected file, impact, and minimal fix. Separate required fixes from optional improvements.

### Workflow, decisions, and verification

- Plan mode inspection identified the existing architecture and lack of a User model. The creator/currency assumptions were clarified: the creator participates and pays the full total; amounts use integer minor units in one application-wide currency; remainder units follow submitted participant order.
- Implementation added a shared-expense model, repository, service, controller, authenticated routes, app mounting, and unit/HTTP tests. Balance access is bound to verified `req.userId`.
- Review found no confirmed Expense defects. It documented the unavailable user-existence check as a scope limitation and a reverse-perspective balance assertion as an optional test improvement.
- During implementation, validation was tightened to reject zero custom shares and equal-split totals too small to give each participant a positive minor-unit share.
- Verification at feature completion: all 32 tests across 4 suites passed, `npm run build` passed, and `git diff --check` passed.

## Prompt 8 — Unexpected-Error Logging

- **Copilot features:** Plan mode, a clarification through the ask-user interaction, approved interactive implementation, and test/build verification.
- **Prompting techniques:** Narrow, file-scoped corrective request with explicit privacy constraints, preserved behavior, and concrete verification commands; clarify the logger choice before implementation.
- **Purpose:** Close the confirmed centralized error-logging gap without changing unrelated application behavior.

### Exact prompt used in Plan mode

> Fix the confirmed logging gap in `src/middleware/error.middleware.ts`. Log unexpected server errors through the existing Pino logger with appropriate internal context, while keeping stack traces and internal error details out of client responses. Preserve existing error-handling behavior. Do not modify unrelated files. Run tests, `npm run build`, and `git diff --check`; report the results.

### Clarification and implementation

- Source inspection found Pino as an installed dependency but no configured/shared logger module. The user chose a local Pino logger in the middleware, keeping the source change surgical.
- The fallback error path logs the error, HTTP method, and path, without logging request headers, query strings, or request data. Existing client error responses and recognized error handling remain unchanged.
- Added a focused test that verifies internal logging and confirms exception details and a query token do not appear in the client response.

### Verification

- Focused middleware test passed.
- Full `npm test` passed: 33 tests across 5 suites.
- `npm run build` passed.
- `git diff --check` passed.

## Post-Generation Corrections

- **Expense Splitting:** During implementation, required positive custom shares and rejected equal splits whose total minor units are fewer than the participants. Added test coverage for both boundaries. The read-only review found no confirmed Expense defects; it recorded user existence verification as a scope limitation and identified one optional reverse-perspective test.
- **Unexpected-error logging:** Confirmed there was no shared logger configuration, then followed the user's choice to instantiate Pino in the error middleware. Added a focused regression test verifying that unexpected errors are logged internally but their details are not returned to clients. Existing response behavior was preserved.