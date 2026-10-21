# FinTrack Architecture

1. **Technology stack:** FinTrack uses Node.js, TypeScript, Express, MongoDB, and Mongoose.
2. **Architecture pattern:** The application follows a layered architecture with models, repositories, services, controllers, and routes.
3. **Models:** Transaction and Expense models define the structure and validation rules for financial records.
4. **Repositories:** Repository functions handle database operations and isolate MongoDB queries from business logic.
5. **Services:** Transaction services manage transaction operations, while expense services handle expense creation, split validation, and balance calculations.
6. **Controllers:** Controllers process HTTP requests, invoke services, and return appropriate HTTP responses.
7. **Routes:** Express routes connect API endpoints to controllers and apply authentication middleware.
8. **Transaction module:** Stores individual income and expense records associated with their owners.
9. **Expense splitting module:** Stores shared expenses, participants, and their assigned shares.
10. **Module relationship:** Transactions represent individual financial records, while expense splitting manages shared costs and calculates what participants owe or are owed.
11. **Data flow:** Requests pass through routes and middleware, controllers, services, and repositories before accessing MongoDB; results return through the same layers.
12. **Authentication and authorization:** JWT-based authentication identifies users, and protected operations enforce ownership and access rules.
13. **Financial accuracy:** Monetary values use integer minor units, custom splits must equal the total expense, and balance calculations account for multiple expenses.
14. **Design rationale:** Layer separation, input validation, explicit error handling, and focused tests improve maintainability, traceability, and financial-data integrity.

