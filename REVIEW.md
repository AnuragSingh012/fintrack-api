# Code Review: Initial Transaction Module

## Prompt Under Review

**Prompt used:**

> Generate a Transaction model and a Transaction service with create, get-by-user, and delete-all functions. Use a database.

**Output reviewed:** The generated transaction model, repository, and service files.

## Issues Copilot Introduced That Required Human Judgment

### Review Result

No confirmed defects were identified in the reviewed files.

The review verified that transaction amounts are validated as positive integer minor units and that transaction retrieval and deletion are scoped to the supplied user ID.

### Potential Concern: Unbounded Transaction Retrieval

- **Location:** `src/transactions/transaction.repository.ts`, `findTransactionsByUser()`
- **Severity:** potential performance and scalability risk
- **Observation:** The query retrieves all transactions belonging to a user without pagination.
- **Potential impact:** Large transaction histories could increase database workload, memory consumption, and response time.
- **How it was detected:** Copilot's code review identified the absence of a query limit or pagination.
- **Copilot versus human judgment:** Copilot identified this as a potential concern, not a confirmed defect. The human decision was to address it in a later, explicitly scoped pagination request.
- **Resolution:** Pagination was subsequently implemented in the repository and service. The repository applies positive-integer validation, page and page-size defaults, a maximum page size of 100, the user ID filter, stable ordering by `occurredAt` and `_id`, and page/total metadata. This resolves the originally identified unbounded retrieval concern.

## Code Review: JWT Authentication

## Prompt Under Review

**Prompt used:** Implement JWT bearer authentication for tokens from an external trusted identity provider, verify configured claims, attach the authenticated identity to requests, return nested HTTP 401 errors for authentication failures, and add focused tests.

**Output reviewed:** JWT environment configuration, authentication middleware, centralized error middleware integration, environment example, and authentication tests.

## Issues Copilot Introduced That Required Human Judgment

### Review Result

The implementation explicitly pins verification to RS256 and validates the signature, issuer, and audience. Missing, malformed, expired, and invalid tokens return HTTP 401 using the existing nested error response. The request identity is extracted from verified claims and must be a non-empty string before assignment to `req.userId`. Error responses do not expose tokens, key material, or internal exception details.

The initial implementation had one confirmed defect: it did not require an `exp` claim, so otherwise-valid tokens without an expiration could be accepted indefinitely.

### Confirmed Defect: Expiration Claim Was Not Required

- **Location:** `src/middleware/auth.middleware.ts`, JWT claim validation
- **Severity:** confirmed authentication defect
- **Observation:** `jsonwebtoken.verify()` rejects expired tokens when an `exp` claim exists, but does not require that claim to be present.
- **Potential impact:** A correctly signed token with the expected issuer and audience but no expiration could remain valid indefinitely.
- **How it was detected:** Security-focused review of expiration handling.
- **Fix applied:** Require a finite numeric `exp` claim after signature and issuer/audience verification; `jsonwebtoken.verify()` continues to enforce that the claim is not expired.
- **Regression coverage:** Added a test that signs an otherwise-valid token without `exp` and asserts HTTP 401.

### Potential Concern: RSA Key Strength

- **Location:** `src/config/jwt.config.ts`, public-key validation
- **Severity:** potential cryptographic-strength risk
- **Observation:** The initial configuration validation checked that the key was RSA, but did not enforce a minimum modulus size.
- **Potential impact:** A deployment configured with a weak RSA key would weaken the signature trust boundary.
- **How it was detected:** Security-focused review of key validation.
- **Fix applied:** Reject RSA public keys with modulus sizes below 2048 bits. A runtime configuration check confirmed that a 1024-bit key is rejected.

### Potential Concern: Invalid Identity Claims Needed Direct Tests

- **Location:** `tests/auth.middleware.test.ts`, identity-claim cases
- **Severity:** test coverage concern
- **Observation:** The initial tests covered a missing identity claim, but did not directly cover claims that were present but not valid non-empty strings.
- **Potential impact:** Regressions accepting numeric or blank identities could go undetected.
- **How it was detected:** Review of authentication test coverage against the middleware's identity validation.
- **Fix applied:** Added tests for numeric and whitespace-only `sub` values; both assert HTTP 401.

## Security Checks

- RS256 is explicitly pinned in `jwt.verify()`; no algorithm fallback is configured.
- Signature, expiration, issuer, and audience are verified; expiration is required.
- Authentication failures use the nested `{ "error": { "message": "..." } }` response with HTTP 401.
- Only a verified top-level identity claim is assigned to `req.userId`, after non-empty string validation.
- JWT issuer, audience, and RSA public key are deployment configuration values. No secret or key material is hardcoded in the source or `.env.example`.
- Unexpected errors are returned with a generic message; stack traces and internal exception details are not exposed.
- Authentication remains route-level middleware; the health endpoint is not globally protected.

## Verification

- `npm run build` passed.
- All 12 focused JWT tests passed against compiled output, including wrong issuer, wrong audience, invalid signature, missing/expired expiration, and missing, non-string, or blank identity cases.
- Runtime configuration validation confirmed a 1024-bit RSA public key is rejected.
- `git diff --check` passed.
- The repository's regular Jest command could not load the existing TypeScript Jest configuration because `ts-node` is unavailable; `ts-jest` also cannot use the installed TypeScript 7 compiler API. The focused tests were run against compiled output with a temporary Jest configuration, which was removed.

## Remaining Limitations

- Deployments must provide the trusted `JWT_ISSUER`, `JWT_AUDIENCE`, and RSA PEM public key as `JWT_PUBLIC_KEY`; the identity claim defaults to `sub`.
- No protected application route currently consumes the middleware, so authentication must be mounted on protected routes as they are added.
- The external provider's subject format is not mapped to a local user record. Integrating with services requiring MongoDB ObjectIds may require a separate subject-to-user mapping.

## Code Review: Jest Configuration

## Prompt Under Review

**Prompt used:** Investigate and recommend a fix for the Jest configuration issue preventing `npm test` from loading `jest.config.ts`, then implement the recommended fix.

**Output reviewed:** Jest configuration and test-runner verification.

## Issues Copilot Introduced That Required Human Judgment

### Review Result

The existing Jest config was TypeScript and relied on `ts-node` to load, but `ts-node` was not installed. It also selected `ts-jest`, which was not present in the installed dependencies and was incompatible with the installed TypeScript 7 compiler API.

### Confirmed Defect: Jest Configuration Could Not Load

- **Location:** `jest.config.ts`, configuration format and transform preset
- **Severity:** test infrastructure defect
- **Observation:** Jest could not parse the TypeScript configuration without `ts-node`; the configured `ts-jest` transformer was unavailable/incompatible.
- **Potential impact:** `npm test` could not start the test suite, preventing routine test verification.
- **How it was detected:** Running `npm test` produced the Jest config loader error.
- **Fix applied:** Replaced `jest.config.ts` with `jest.config.cjs` and configured the existing `@swc/jest` transformer to transform TypeScript tests as CommonJS. Existing test matching, environment, mock clearing, and coverage settings were preserved. No dependencies were added.

## Verification

- The focused JWT test run passed: all 12 tests.
- Full `npm test` passed: all 12 tests.
- `npm run build` passed.
- `git diff --check` passed.

## Code Review: Transaction HTTP API

## Prompt Under Review

**Prompt used:** Implement the plan to expose existing transaction service operations as authenticated HTTP endpoints with validation and ownership protection.

**Output reviewed:** Transaction controller, transaction routes, app mounting, service calls, error handling, and route tests.

## Issues Copilot Introduced That Required Human Judgment

### Review Result

No confirmed defects were identified. All transaction routes use authentication middleware before their handlers. Create, list, and delete service calls use the verified `req.userId`; the strict create schema rejects body-supplied ownership. The routes are mounted before not-found handling, with the existing error middleware registered afterward.

The API returns HTTP 201 for create and HTTP 200 for list and delete-all. Zod validation errors and authentication failures are handled using the existing nested error response format.

### Potential Concern: `occurredAt` Timezone Acceptance

- **Location:** `src/transactions/transaction.controller.ts`, create request schema
- **Severity:** potential compatibility concern
- **Observation:** `z.string().datetime()` uses UTC `Z` timestamps by default and rejects otherwise valid ISO timestamps carrying an explicit offset, such as `+05:30`.
- **Potential impact:** Clients using offset timestamps may receive HTTP 400 for dates that are valid ISO datetimes.
- **How it was detected:** Review of the `occurredAt` validator and Zod datetime defaults.
- **Recommended action:** If offset-form timestamps are part of the API contract, enable offset acceptance and test both supported and malformed values; otherwise document that requests must use UTC `Z` timestamps.

### Potential Concern: Route-Test Coverage Gaps

- **Location:** `tests/transaction.routes.test.ts`
- **Severity:** test coverage concern
- **Observation:** Current tests cover unauthenticated GET, basic invalid pagination, defaults, and body ownership spoofing, but do not directly test unauthenticated POST/DELETE, `occurredAt`, pagination overflow, repeated query parameters, or the maximum page-size behavior.
- **Potential impact:** Regressions in these cases could go undetected. Router-wide auth and repository pagination behavior reduce the risk but are not fully verified at the HTTP boundary.
- **How it was detected:** Comparing route tests with the router middleware and controller validation branches.
- **Recommended action:** Add targeted request tests for these cases, including that each protected method returns 401 without credentials and that supported page-size cap behavior is preserved.

## Verification

- All 21 tests across 2 suites passed.
- `npm run build` passed.
- `git diff --check` passed.

## Code Review: Expense Splitting

## Prompt Under Review

**Prompt used:** Review the Expense Splitting implementation without modifying files. Check the model/repository/service/controller/routes architecture, authenticated creation and current-user-only balance access, equal and custom split validation, deterministic remainder allocation, pairwise debt netting and zero removal, participant and identity validation, safe integer minor units, error handling, type safety, and test correctness. Report only confirmed defects or requirement gaps, with affected file, impact, and minimal fix; separate required fixes from optional improvements.

**Output reviewed:** Expense model, repository, service, controller, routes, app mounting, shared error handling, and Expense unit and HTTP tests.

## Issues Copilot Introduced That Required Human Judgment

### Review Result

No confirmed defects were found in the Expense Splitting implementation. The model, repository, service, controller, and routes follow the project’s layered architecture. Both HTTP endpoints are behind authentication; creation derives the creator from verified `req.userId`, and balances are computed only for that authenticated user. The service checks ObjectId syntax, distinct participants, creator participation, positive safe-integer amounts, exact custom totals, and deterministic equal-split remainders. Pairwise debts are netted and zero balances are omitted.

### Potential Concern: Participant Existence Cannot Be Verified

- **Location:** `src/expenses/expense.service.ts`, participant ID validation
- **Severity:** scope limitation
- **Observation:** Participant IDs are checked for ObjectId syntax, but the repository has no User model or user lookup mechanism to verify that referenced users exist.
- **Potential impact:** An expense can refer to an identifier that is syntactically valid but does not correspond to an application user.
- **How it was detected:** Codebase inspection found no User model or existing user lookup service.
- **Human decision:** Keep user existence verification out of this feature because no user subsystem is available; do not invent or add one.
- **Remaining limitation:** Add existence verification when the project has an appropriate user lookup mechanism.

### Optional Improvement: Test the Reverse Balance Perspective

- **Location:** `tests/expenses/expense.service.test.ts`, pairwise netting test
- **Severity:** optional test-coverage improvement
- **Observation:** The test verifies opposing debts and zero-balance removal from one caller's perspective, but does not assert the corresponding direction from the counterparty's perspective.
- **Potential impact:** A future regression in the `owes`/`owed` presentation for the other side could go undetected.
- **How it was detected:** Comparison of balance-direction logic with the service test assertions.
- **Recommended action:** Add a paired assertion for the counterparty when extending the test suite.

## Human Decisions and Implemented Behavior

- The authenticated creator must be one of at least two distinct participants and is treated as paying the full expense total.
- Money is represented as positive integer minor units in one application-wide currency. No currency field was added.
- Equal-split remainder units are assigned in submitted participant order. Equal totals too small to give each participant at least one minor unit are rejected; custom shares must be positive and sum exactly to the total.
- The review did not identify a required Expense code fix; these behaviors were implemented and covered during feature development.

## Verification

- At Expense feature completion, all 32 tests across 4 suites passed.
- `npm run build` passed.
- `git diff --check` passed.

## Code Review: Unexpected-Error Logging

## Prompt Under Review

**Prompt used:** Fix the confirmed logging gap in `src/middleware/error.middleware.ts`. Log unexpected server errors through the existing Pino logger with appropriate internal context, while keeping stack traces and internal error details out of client responses. Preserve existing error-handling behavior. Do not modify unrelated files. Run tests, `npm run build`, and `git diff --check`; report the results.

**Output reviewed:** The centralized error middleware change and its focused regression test.

## Issues Copilot Introduced That Required Human Judgment

### Confirmed Defect: Unexpected Server Errors Were Not Logged

- **Location:** `src/middleware/error.middleware.ts`, fallback HTTP 500 branch
- **Severity:** confirmed observability gap
- **Observation:** Unexpected errors received a sanitized HTTP 500 response but were not written to a server log.
- **Potential impact:** Server-side failures, including database and balance-calculation errors, could not be diagnosed from application logs.
- **How it was detected:** The Expense implementation review checked error handling and the source tree contained no Pino logger use, despite Pino being an installed dependency.
- **Human decision:** No configured/shared logger existed to reuse. After clarification, use a Pino logger instantiated in the middleware to keep the change limited to the requested file.
- **Fix applied:** Log the error object with request method and path, excluding headers, query string, and request data. Preserve the existing generic 500 response and all recognized error handling.
- **Regression coverage:** Added a focused test asserting that the unexpected error is logged while exception text and query-token values are absent from the client response.

## Verification

- The focused middleware test passed.
- Full `npm test` passed: 33 tests across 5 suites.
- `npm run build` passed.
- `git diff --check` passed.

## Remaining Limitations

- Unexpected error details are available to server-side logs for diagnosis; the HTTP response remains `{ "error": { "message": "Internal server error" } }`.
- Pino is instantiated locally in the middleware because no shared logger configuration was present. A shared logger may be introduced separately if the application later establishes one.
