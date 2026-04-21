# Contributing to Snippet Vault

We welcome contributions! Please follow these guidelines.

## Development Setup

1.  **Prerequisites:**
    *   Java 21+ (JDK)
    *   Node.js 20+ & npm
    *   Maven

2.  **Backend:**
    *   Open the project in your IDE (e.g., IntelliJ IDEA).
    *   Navigate to `backend/`.
    *   Run `mvn clean install` to download dependencies.
    *   Run the `main` method in `SnippetVaultApplication.java` to start the server.

3.  **Frontend & Electron:**
    *   Ensure the backend server is running from your IDE.
    *   Navigate to `frontend/`.
    *   Run `npm install`.
    *   Run `npm run dev` to concurrently start the Angular development server and launch the Electron application shell.

## Code Style

*   **Java:** Follow standard Java conventions. Use 4 spaces for indentation. Emphasize strict encapsulation and Java 21 features (e.g., Virtual Threads, Records).
*   **Angular/TS:** Use 2 spaces for indentation. Strictly follow modern Angular 21 structural patterns, strict TypeScript typing, and reactive state management (Signals/RxJS).

## Testing

*   **Backend:** Ensure unit tests pass before committing. Run tests via `mvn test` in the `backend/` directory using JUnit 5 and Mockito.
*   **Frontend:** Run frontend specs via `npm run test` in the `frontend/` directory (Jasmine/Karma or Jest).

## Pull Requests

*   Create a feature branch from `main` or `development`.
*   Submit a PR with a clear description of changes.
*   Ensure the CI/CD pipeline remains green before merging.
