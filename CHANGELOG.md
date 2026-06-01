# Changelog

All notable changes to Snippet Vault are documented here.
Follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

---

## [1.0.0] — 2026-06-01

### First stable MVP release.

### Added

#### Core Application
- **Monaco Editor** integration — VS Code–grade editing with syntax highlighting for 50+ languages
- **Nested folder tree** — infinite-depth folder creation and drag-free organization
- **Snippet sidebar** — filterable list with language badges and tag display
- **Real-time sync** — STOMP/WebSocket events keep UI in sync instantly, no manual refresh
- **File system watcher** — NIO.2 WatchService detects external file changes automatically

#### Organization & Search
- **Command palette** (`Ctrl+P`) — fuzzy search across all snippets and folders with keyboard navigation
- **Bulk action bar** — multi-select snippets for batch delete or move operations
- **Tagging system** — apply custom tags to snippets for quick filtering
- **Description pane** — per-snippet notes and metadata

#### Editor Features
- **AI assistant panel** — context-aware code explanations, generation, and refactoring (requires API key)
- **Language auto-detection** — inferred from file extension and manual override
- **Editor settings modal** — font size, tab size, line numbers, minimap, word wrap
- **Separate theme selectors** — independent theme control for the app shell and Monaco editor

#### Themes
- **Coder Dark** *(default)* — VS Code–inspired dark theme with muted grays and blue accents
- **Coder Light** — clean professional light theme with full WCAG AA contrast compliance

#### Desktop Shell
- **Electron 41** frameless window with custom titlebar and native window controls
- **Animated splash screen** shown during backend startup
- **Dynamic port allocation** — avoids port conflicts if multiple instances or services are running
- **Bundled JRE** — custom jlink runtime (~50 MB), no system-wide Java installation required
- **Portable data directory** — SQLite database stored adjacent to the executable for trivial backup
- **Graceful shutdown** — Spring Boot backend terminates cleanly when the window is closed
- **Zoom controls** — `Ctrl++` / `Ctrl+-` / `Ctrl+0` to adjust the UI scale

#### Technical
- **Java 21 + Spring Boot 3.5** backend with SQLite persistence via Hibernate
- **Virtual threads** (Project Loom) for high-throughput, non-blocking I/O
- **Angular 21** frontend using signals and strict lazy loading
- **ArchUnit** architecture tests enforcing layered dependency rules
- **Mockito** unit tests for all service layer logic
- **MockMvc** integration tests for all REST controller endpoints
- **Cross-platform CI** via GitHub Actions — builds `.exe`, `.AppImage`, and `.dmg` on tag push
