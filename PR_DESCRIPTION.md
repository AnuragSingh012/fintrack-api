# Pull Request Description

## Summary

This work documents and implements FinTrack's transaction API, JWT authentication, centralized error handling, and shared Expense Splitting. The changes use the existing Express/TypeScript/Mongoose stack and keep transaction and expense services separate.

## AI Assistance Disclosure

GitHub Copilot was used for code generation, planning, implementation, code review, test creation, documentation, and troubleshooting. The AI-assisted changes were reviewed and validated by the human contributor; the contribution estimate below is approximate, not a measured attribution.

## Accepted and Revised Output

- Accepted the layered model/repository/service/controller/routes structure, JWT verification against configured trust settings, authenticated user scoping, and integer-minor-unit expense calculations after review.
- Human decisions clarified that the expense creator participates and advances the full total, one application-wide currency is represented in minor units, and equal-split remainder units follow participant input order.
- The initial transaction retrieval without pagination was treated as a scalability concern, not accepted as the final API behavior; pagination was subsequently added with positive-integer validation, defaults, a maximum page size, stable sorting, user filtering, and metadata.
- During Expense implementation, validation was tightened to reject zero custom shares and equal splits too small to give every participant a positive minor-unit share.
- No evidence was recorded for a wholesale rejection of Copilot-generated output. These notes describe documented human decisions and corrections, not a line-by-line authorship history.

## Estimated Contribution

- **Estimated AI contribution:** approximately 70–85% of the implementation and documentation drafting.
- **Estimated human contribution:** approximately 15–30%, including task definition, domain and trust decisions, review, corrections, and acceptance.
- **Caveat:** These are rough estimates based on the recorded workflow; no time tracking, line-by-line attribution, or authorship measurement was performed. Human review and decisions are not fully represented by a code-percentage estimate.

## Tests and Coverage

- At the latest full-suite verification, `npm test` passed with 33 tests across 5 suites.
- `npm run build` passed.
- `git diff --check` passed after the unexpected-error logging change.
- Coverage includes authenticated transaction and expense routes, input/ownership validation, expense split arithmetic and netting, JWT failure cases, and sanitized unexpected-error responses.
- Known gaps: Expense tests do not assert the reverse user's balance direction; route tests do not cover every authentication and pagination boundary; participant ObjectIds are not checked against actual users because the project has no User model.

## Risk

Expense participants are validated for ObjectId syntax but their existence cannot be verified in the current architecture. A syntactically valid identifier may not correspond to an application user; add a lookup check when a user repository/model becomes available.

## Self-Review Checklist

- [x] Protected transaction and expense endpoints derive ownership from verified `req.userId`.
- [x] Expense totals and shares use positive integer minor units; custom shares must sum exactly.
- [x] Equal-split remainder allocation is deterministic.
- [x] Client error responses do not expose unexpected exception details.
- [x] Tests and TypeScript build passed at the recorded verification points.
- [ ] Add a reverse-perspective balance assertion and expand route boundary coverage.
- [ ] Integrate participant existence validation when a User model or lookup is introduced.

## Proposed Peer-Review Comments

These are proposed constructive comments for a future peer review, not comments received from a reviewer.

1. **Expense balance tests:** Could we assert the same net pair from the counterparty's perspective as well? That would protect the `owes`/`owed` direction mapping for both users.
2. **Participant existence:** When a User lookup is available, could expense creation verify that each participant exists, in addition to validating ObjectId syntax?
3. **Transaction pagination boundaries:** Could we add route-level tests for unauthenticated POST/DELETE and maximum/overflow pagination values to protect these boundaries?