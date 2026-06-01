# Snippet Vault — Frontend

This directory contains the Angular 21 frontend and Electron desktop shell for Snippet Vault.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Angular 21 (standalone components, signals) |
| Editor | Monaco Editor 0.55 (the engine powering VS Code) |
| Styling | SCSS + CSS custom properties (theme-variables.css) |
| Real-time | STOMP over WebSockets (`@stomp/stompjs`) |
| Desktop shell | Electron 41 |
| Bundler | `@angular/build` (esbuild-based) |
| Package manager | npm 11 |

## Structure

```
frontend/
├── electron/
│   ├── main.js          # Electron main process — manages window, backend lifecycle, IPC
│   └── preload.js       # Context bridge — exposes safe IPC APIs to Angular
├── src/
│   ├── app/             # Root layout, command palette, folder tree, bulk actions
│   ├── features/
│   │   ├── editor/      # Monaco editor component + settings modal
│   │   ├── sidebar/     # Snippet list panel
│   │   └── titlebar/    # Custom frameless window titlebar + controls
│   ├── core/            # Services: snippets, settings, AI, WebSocket
│   ├── models/          # TypeScript interfaces (Snippet, Folder, Tag…)
│   ├── styles.scss       # Global SCSS — imports theme tokens, layout, component styles
│   └── theme-variables.css  # CSS custom property design tokens (Coder Dark / Coder Light)
├── public/              # Static assets (icons, fonts)
├── splash.html          # Standalone splash/loading screen shown by Electron at startup
├── angular.json         # Angular CLI workspace config
├── package.json         # npm scripts, electron-builder config, all dependencies
└── tsconfig.json        # TypeScript base config
```

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Angular dev server + Electron concurrently (development mode) |
| `npm run build` | Production Angular build to `dist/frontend/browser/` |
| `npm run dist` | Package the full Electron app for the current OS using `electron-builder` |
| `npm start` | Angular dev server only (`ng serve`) |

## Themes

The application ships with four themes selectable from the **Settings** modal:

| Theme | Type |
|---|---|
| **Coder Dark** *(default)* | Dark — VS Code–inspired, muted grays, precise accent blues |
| **Coder Light** | Light — clean whites, professional typographic contrast |

Monaco Editor has its own separate theme selector (defaults to **VS Dark**), allowing independent customisation of the code editor appearance.

## Development

### Prerequisites
- Node.js 20.x
- npm 11.x
- The Spring Boot backend running on port 8080 (or use the bundled JRE — see `BUILDING.md` in the project root)

### Run in development mode

```bash
npm install
npm run dev
```

Electron will auto-connect to the Spring Boot backend. If no bundled Java runtime is found (`frontend/runtime/`), it falls back to `localhost:8080` ("ghost backend" mode — useful when running the backend from IntelliJ).

### Build for production

```bash
# 1. Build the Angular app
npm run build

# 2. Ensure frontend/runtime/ contains the bundled JRE + backend.jar
#    (See BUILDING.md at project root for full instructions)

# 3. Package the Electron installer
npm run dist
```

Output will be in `frontend/dist/`:
- **Windows:** `Snippet Vault Setup X.X.X.exe`
- **Linux:** `Snippet Vault-X.X.X.AppImage`
- **macOS:** `Snippet Vault-X.X.X.dmg`

## Automated Releases

Releases are built automatically by GitHub Actions (`.github/workflows/build.yml`) for Windows, Linux, and macOS when a tag matching `v*` is pushed. See `Packaging.md` in the project root for the full release workflow.
