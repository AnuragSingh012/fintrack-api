
# FinTrack API — GitHub Copilot Instructions

## Technology Stack
- Node.js, TypeScript, Express.js, MongoDB, and Mongoose.
- JWT authentication with jsonwebtoken; bcrypt for password hashing when needed.
- Zod for request validation.
- Jest and Supertest for automated tests.
- Pino for structured logging.
- Use the existing local MongoDB Community Server for development.

## Architecture
- Follow layered architecture: model, repository, service,
  controller, and routes.
- Models define persisted document structure.
- Repositories encapsulate database queries.
- Services implement business rules and orchestrate repositories.
- Controllers translate HTTP requests and responses.
- Routes declare endpoints and attach required middleware.
- Keep business logic out of controllers and database queries
  out of controllers.
- Transaction and Expense services must remain separate modules.

## TypeScript Standards
- Enable strict TypeScript checking.
- Avoid `any`; use explicit types and safe narrowing.
- Document all public methods and exported functions.
- Use consistent, descriptive names.
- Prefer small functions with one clear responsibility.
- Use async/await and handle rejected promises explicitly.

## Validation and Errors
- Validate request bodies, parameters, and query values with Zod.
- Reject invalid IDs, non-positive amounts, empty descriptions,
  duplicate participants, and malformed split definitions.
- Use explicit application errors and a centralized Express
  error-handling middleware.
- Return appropriate HTTP status codes without leaking stack traces.
- Do not treat client-supplied user IDs as proof of identity.

## Security
- Obtain the authenticated user ID from verified authentication
  middleware, not from a request body.
- Users may only read, change, or delete their own transactions.
- Require authentication for protected expense and balance routes.
- Validate participant identifiers and verify referenced users
  according to the available user model or documented scope.
- Never log passwords, JWTs, secrets, or sensitive financial data.
- Read secrets and connection strings from environment variables.
- Never commit .env files or real credentials.
- Use bcrypt for password hashing if password handling is implemented.
- Verify JWT signatures and required claims before trusting a token.

## Financial Correctness
- Represent money using integer minor units (for example, cents).
- Never rely on floating-point equality for money validation.
- Custom participant shares must sum exactly to the expense total.
- Define how the creator participates and contributes to the expense.
- Equal splits must handle remainders deterministically.
- Calculate net balances by user pair and remove zero-net entries.
- Reject invalid totals and participant configurations.
- Persist the expense and associated records consistently;
  avoid partially saved expenses on failure.

## Logging
- Use Pino for structured application and error logs.
- Log useful event context without logging secrets or sensitive data.
- Do not swallow errors silently.

## Testing
- Use Jest for unit tests and Supertest for HTTP integration tests.
- Test normal cases, validation failures, boundary cases,
  and authorization failures.
- Test equal and custom splits and net balance calculations.
- Mock repository dependencies in service unit tests.
- Use an isolated test database for database integration tests.
- Do not rely on execution order or shared mutable test data.
- Run npm test and npm run build before submission.
