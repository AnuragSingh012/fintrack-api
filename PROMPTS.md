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