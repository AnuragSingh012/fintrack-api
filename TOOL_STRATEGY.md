### Feature Usage Log

#### Reviewing the Initial Transaction Module

- **Feature used:** GitHub Copilot Chat — Ask mode.
- **Prompting technique:** Context-specific prompting with explicit review criteria.
- **Prompt used:**
  
  Review the transaction module in #transaction.model.ts, #transaction.repository.ts, and #transaction.service.ts. Identify genuine defects and potential concerns. For each finding, explain its location, evidence, impact, and recommended fix. Distinguish confirmed defects from potential concerns.

- **Why this feature:** Ask mode was appropriate because I wanted Copilot to inspect and explain the existing code without making changes. Referencing the relevant files focused the review on the transaction module.
- **What happened:** Copilot reported no confirmed defects but identified unbounded transaction retrieval as a potential performance concern because the query returns all transactions for a user without pagination.
- **Human judgment:** I agreed with Copilot's performance concern and recognized that retrieving all transactions without pagination could increase database workload, memory usage, and response time as transaction histories grow. I identified pagination as an improvement needed to support scalable transaction retrieval.
- **Lesson learned:** Copilot can help identify potential issues, but human judgment is essential for evaluating their impact, prioritizing improvements, and deciding on appropriate changes.

#### Implementing JWT Authentication

- **Feature used:** GitHub Copilot Chat — Plan mode, followed by Agent mode.
- **Prompting technique:** Requirements-based planning with explicit trust assumptions and focused implementation requirements.
- **Prompt used:** Plan JWT bearer authentication for an external identity provider, including configurable issuer, audience, RSA public key, and identity claim; verify tokens and attach only the verified identity to requests; add focused tests. After confirming the provider assumptions, implement the approved plan.
- **Why this feature:** Plan mode helped surface missing provider-specific assumptions before code changes. Agent mode was appropriate to implement the approved authentication design across configuration, middleware, and tests.
- **What happened:** The workflow added Zod-validated JWT environment configuration (`JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_PUBLIC_KEY`, and optional `JWT_IDENTITY_CLAIM`), RS256 bearer-token verification, and focused authentication tests. The external provider assumptions were deployment-supplied issuer and audience, an RSA PEM public key, and the `sub` identity claim.
- **Human judgment:** I confirmed the trust assumptions before implementation and checked that request identity comes from verified claims rather than client-supplied data. I reviewed the scope as authentication only, not login or token issuance.
- **Lesson learned:** For authentication work, make trust boundaries and provider-specific settings explicit during planning; focused tests help validate both accepted tokens and rejection behavior.

#### Reviewing and Hardening JWT Security

- **Feature used:** GitHub Copilot Chat — Ask mode.
- **Prompting technique:** Security-focused review prompting, asking for evidence-backed defects and concerns in JWT claim validation, key strength, and identity handling.
- **Prompt used:** Review the JWT authentication implementation for security defects, with particular attention to expiration requirements, RSA public-key strength, and validation of the verified identity claim; explain the evidence and impact and recommend targeted fixes.
- **Why this feature:** Ask mode supported a read-only review of the implementation before deciding what changes were justified.
- **What happened:** The review found that `jsonwebtoken.verify()` validates expiration when `exp` exists but does not require the claim. Remediation requires a finite `exp`, rejects RSA public keys below 2048 bits, and tests invalid-but-present identity values. A runtime check confirmed rejection of a 1024-bit RSA key. The 12 focused tests passed, and the TypeScript build passed.
- **Human judgment:** I treated the missing expiration requirement as a confirmed defect and addressed it. I also applied the key-strength validation and added direct identity tests for numeric and whitespace-only `sub` values, rather than relying only on general review recommendations.
- **Lesson learned:** Signature verification alone does not enforce every application-level token requirement. Review JWT claims and key configuration explicitly, then encode those requirements in regression tests.

#### Troubleshooting Jest Configuration

- **Feature used:** GitHub Copilot Chat — Agent mode.
- **Prompting technique:** Focused corrective prompting based on the observed Jest configuration-loader failure and the transformer already present in the project.
- **Prompt used:** Investigate the Jest configuration error preventing `npm test` from loading `jest.config.ts`, then replace the configuration with a compatible setup using the existing `@swc/jest` transformer, without adding dependencies.
- **Why this feature:** Agent mode was suitable for making the targeted test-infrastructure correction and verifying it with the project's normal test and build commands.
- **What happened:** Replaced `jest.config.ts` with `jest.config.cjs` and configured the existing `@swc/jest` transformer for TypeScript tests as CommonJS, preserving the test matching, environment, mock clearing, and coverage settings. All 12 tests passed, and the build passed.
- **Human judgment:** I chose the installed transformer rather than introducing another dependency, and checked that the existing Jest settings were preserved in the replacement.
- **Lesson learned:** When a test runner cannot load its configuration, diagnose both the configuration format and available transformers; using an installed compatible transformer can restore the normal test command without expanding dependencies.

#### Implementing and Reviewing the Transaction HTTP API

- **Feature used:** GitHub Copilot Chat — Plan mode, followed by Agent mode and a read-only code review.
- **Prompting technique:** Scope-focused planning around existing service functions, explicit ownership and validation requirements, then evidence-based review for defects versus concerns.
- **Prompt used:** Expose the existing transaction create, paginated get-by-user, and delete-all service functions as authenticated HTTP endpoints. Validate requests, use only the authenticated user ID for ownership, and add tests without expanding service capabilities.
- **Why this feature:** Plan mode helped define the minimum routes and their validation and ownership boundaries before implementation. Agent mode implemented the focused route/controller changes and HTTP tests; Ask/review mode then checked the result without modifying code.
- **What happened:** Added authenticated `POST`, `GET`, and `DELETE /api/transactions` endpoints, mounted the router in the app, validated creation and pagination input, and sourced service ownership only from verified `req.userId`. The review found no confirmed defects and identified UTC-only `occurredAt` parsing and remaining route-test cases as potential concerns.
- **Human judgment:** I kept the endpoints limited to existing service capabilities and distinguished the date-format and test-coverage observations as potential concerns rather than confirmed security defects.
- **Verification:** All 21 tests across 2 suites passed, `npm run build` passed, and `git diff --check` passed.
- **Lesson learned:** Explicit ownership boundaries should be verified both in controller-to-service arguments and with HTTP tests; review should distinguish a supported date-format constraint from a defect and identify untested boundary behavior.

#### Planning, Implementing, and Reviewing Expense Splitting

- **Copilot features used:** Plan mode, approved interactive implementation, and read-only code review.
- **Techniques used:** Inspect project conventions and existing service/auth patterns first; break requirements into model/repository/service/controller/routes/tests; explicitly resolve creator participation, payment responsibility, currency representation, and equal-split remainder behavior before implementation; request a review limited to verifiable defects and requirement gaps.
- **Why these features:** The financial and authorization behavior required explicit decisions before code was written. Plan mode exposed missing domain assumptions, and a separate read-only review checked access control and calculation logic without mixing review findings with implementation edits.
- **What happened:** Implemented single-document shared expenses, positive integer-minor-unit splits, exact custom totals, deterministic equal remainders, authenticated creation, caller-only pairwise balances, debt netting, and zero removal. The reviewer found no confirmed defects; participant existence could not be checked without a User model, and a reverse-perspective balance assertion was noted as an optional test improvement.
- **Human judgment:** Confirmed the creator is a participant who advances the full total, chose one application-wide currency represented in minor units, and assigned remainder units in submitted order. Kept actual-user existence checks outside scope because the repository has no User model.
- **Verification:** At feature completion, all 32 tests across 4 suites passed, `npm run build` passed, and `git diff --check` passed.
- **Lesson learned:** Financial assumptions should be made explicit before implementing balance calculations; tests should verify both arithmetic outcomes and the authenticated identity used to scope access.

#### Fixing Unexpected-Error Logging

- **Copilot features used:** Plan mode, ask-user clarification, and approved interactive implementation with test/build verification.
- **Techniques used:** A narrow corrective prompt named the affected middleware, required privacy-safe client responses and behavior preservation, and specified verification commands. The logger implementation choice was clarified before editing.
- **Why these features:** The task was a small, scoped correction, but inspection showed no configured shared logger. Clarification resolved whether to keep the change local or add a shared module.
- **What happened:** Pino was already a dependency, but no shared logger existed. Following the user's choice, the middleware now logs unexpected errors with method and path context while returning the same sanitized HTTP 500 response. A focused test checks logging and confirms internal exception details and query tokens are not sent to clients.
- **Human judgment:** Chose the local middleware logger to keep scope limited and avoided logging request headers, query strings, or body data.
- **Verification:** The focused test passed; full `npm test` passed with 33 tests across 5 suites; `npm run build` and `git diff --check` passed.
- **Lesson learned:** A privacy-preserving error handler should distinguish internal diagnostics from client output and include only useful, non-request-data context in logs.

### Scenario Questions and Answers

#### Scenario 1: Broad initial code generation

**Question:** When a request asks for a model and service but leaves implementation details open, which Copilot approach fits, and what should happen next?

**Answer:** The initial Transaction request used a broad Copilot Chat prompt to generate a model, repository, and service. Follow-up review is important because broad prompting can omit operational needs such as pagination.

#### Scenario 2: Unresolved trust assumptions

**Question:** How should an authentication task proceed when issuer, audience, public-key format, and identity claim are unknown?

**Answer:** Use Plan mode to inspect existing configuration and identify assumptions before implementation. In this project, the deployment-supplied issuer and audience, RS256 PEM key, and `sub` claim were clarified before implementation.

#### Scenario 3: Security validation

**Question:** How can a security review turn a plausible JWT concern into a verifiable defect?

**Answer:** Ask for evidence against specific token checks and inspect the verification path and tests. Here, the review confirmed that `verify()` did not require `exp`, leading to a required-expiration check and a regression test.

#### Scenario 4: Test runner cannot start

**Question:** What should be checked when `npm test` fails before executing tests because Jest cannot load its config?

**Answer:** Inspect the config format, missing loader/transformer dependencies, and existing TypeScript tooling before adding packages. This project replaced the TypeScript Jest config with CommonJS and reused its installed `@swc/jest` transformer.

#### Scenario 5: Ownership-sensitive API

**Question:** How should an API exposing existing user-scoped service operations prevent request-based ownership spoofing?

**Answer:** Plan the route and validation surface around the service capability, then ensure service calls use only the verified `req.userId`. The transaction HTTP tests also exercise a body-supplied owner ID and verify it is rejected.

#### Scenario 6: Financial feature with unclear semantics

**Question:** What is the right approach when a financial requirement leaves creator participation and rounding behavior unspecified?

**Answer:** Resolve those domain choices during planning before implementing balance arithmetic. For Expense Splitting, the creator participates and advances the total, and equal-split remainder units follow participant input order.

### Documented Limitations and Corrections

#### Transaction retrieval initially had no pagination

- **Problem:** The initial `findTransactionsByUser()` implementation retrieved all records for a user.
- **Detection:** Copilot's review identified the missing page limit as a scalability concern; the user then requested explicit pagination behavior.
- **Correction:** Added positive-integer page/page-size validation, defaults, a maximum page size, user filtering, deterministic ordering by transaction date and `_id`, and pagination metadata.

#### JWT verification did not require expiration

- **Problem:** JWT signature/issuer/audience verification did not itself require an `exp` claim.
- **Detection:** Security-focused review checked required claims and distinguished expiry verification from expiration-claim presence.
- **Correction:** Required a finite numeric `exp` after verification and added a test rejecting tokens without expiration.

#### Jest configuration could not load

- **Problem:** `npm test` could not load `jest.config.ts` without `ts-node`; the configured `ts-jest` approach was unavailable/incompatible with the installed toolchain.
- **Detection:** Running `npm test` failed during Jest configuration loading before tests started.
- **Correction:** Replaced the TypeScript config with `jest.config.cjs` and reused the installed `@swc/jest` transformer; full tests and the build then passed.