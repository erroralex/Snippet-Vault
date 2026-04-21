# Building Snippet Vault from Source

This document describes how to build a fully self-contained executable from source. The output mirrors the official releases — a single binary with a bundled Java runtime that requires no system-wide Java installation.

---

## Prerequisites

Before you begin, ensure the following are installed and available on your `PATH`:

| Tool | Version | Notes |
|---|---|---|
| **JDK** | 21 (Temurin recommended) | Must include `jlink` — full JDK, not just a JRE |
| **Maven** | 3.9+ | For building the Java backend |
| **Node.js** | 20.x | For building the Angular frontend and Electron shell |
| **npm** | Bundled with Node 20 | Used for all frontend/Electron dependency management |

> **Temurin JDK 21** is recommended as it is what the official CI pipeline uses.
> Download it from [adoptium.net](https://adoptium.net).

---

## Project Structure

```
snippet-vault/
├── backend/        # Java 21 Spring Boot (Maven)
└── frontend/       # Angular 21 + Monaco Editor & Electron shell
```

---

## Step 1 — Build the Backend

```bash
cd backend
mvn clean install -DskipTests
```

This produces `backend/target/backend-0.0.1-SNAPSHOT.jar` — the self-contained executable JAR.

---

## Step 2 — Build the Frontend and Run Locally

```bash
cd frontend
npm install
npm run dev
```

This will concurrently start the Angular development server and launch the Electron shell.

---

## Step 3 — Bundle a Custom JRE with jlink

Rather than shipping a full JDK, `jlink` produces a minimal custom runtime (~40-50MB) containing only the modules the application needs. Run this from the **project root**:

```bash
$JAVA_HOME/bin/jlink \
  --add-modules java.base,java.se,jdk.httpserver,jdk.crypto.ec,jdk.unsupported \
  --output frontend/runtime/jre \
  --strip-debug \
  --no-man-pages \
  --no-header-files \
  --compress=2
```

**On Windows** (Git Bash or PowerShell):
```bash
"$JAVA_HOME/bin/jlink" \
  --add-modules java.base,java.se,jdk.httpserver,jdk.crypto.ec,jdk.unsupported \
  --output frontend/runtime/jre \
  --strip-debug \
  --no-man-pages \
  --no-header-files \
  --compress=2
```

---

## Step 4 — Prepare the Runtime Directory

Electron needs the backend JAR and a bundled JRE placed in a specific structure before packaging:

```bash
mkdir -p frontend/runtime/app
cp backend/target/backend-0.0.1-SNAPSHOT.jar frontend/runtime/app/backend.jar
```

---

## Step 5 — Package the Electron App

*Note: Ensure `electron-builder` is configured in `frontend/package.json` with a `dist` script.*

```bash
cd frontend
npm run dist
```

`electron-builder` will produce a platform-native binary in `frontend/dist/`:

| Platform | Output |
|---|---|
| Windows | `Snippet Vault Setup X.X.X.exe` |
| Linux | `Snippet Vault-X.X.X.AppImage` |
| macOS | `Snippet Vault-X.X.X.dmg` |

---

## macOS Note

Because the app is not signed with an Apple Developer Certificate, macOS will block it on first launch. To clear the quarantine attribute after moving the `.app` to your Applications folder:

```bash
sudo xattr -cr "/Applications/Snippet Vault.app"
```

---

## Full Build — Copy/Paste Summary

For convenience, the complete sequence from project root (Linux/macOS):

```bash
# 1. Backend
cd backend && mvn clean install -DskipTests && cd ..

# 2. Frontend Dependencies & Build
cd frontend && npm install && npm run build && cd ..

# 3. Bundled JRE
$JAVA_HOME/bin/jlink \
  --add-modules java.base,java.se,jdk.httpserver,jdk.crypto.ec,jdk.unsupported \
  --output frontend/runtime/jre \
  --strip-debug --no-man-pages --no-header-files --compress=2

# 4. Runtime directory
mkdir -p frontend/runtime/app
cp backend/target/backend-0.0.1-SNAPSHOT.jar frontend/runtime/app/backend.jar

# 5. Package
cd frontend && npm run dist
```

---

## Troubleshooting

**`jlink` not found**
Ensure you have a full JDK 21 installed, not just a JRE. Verify with `$JAVA_HOME/bin/jlink --version`.

**`ClassNotFoundException` at runtime**
A dependency requires a module not included in the custom JRE. Re-run `jlink` and add the missing module to `--add-modules`.

**Electron packaging fails on Linux**
Some distributions require `fuse` for AppImage creation. Install with `sudo apt install fuse` or equivalent.

**Frontend assets not found by Electron**
Ensure `npm run build` completed successfully in the `frontend/` directory before packaging.
