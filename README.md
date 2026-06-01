# Snippet Vault

A robust, high-performance desktop code snippet manager designed for developers and software architects. It provides a **VS Code-grade editing experience**, **real-time file system synchronization**, **keyboard-centric navigation**, and **AI-assisted refactoring** in a premium, hardware-accelerated desktop interface.

## 💻 Interface

<p align="center">
<img src="frontend/src/assets/screenshots/hero_view.png" width="800" alt="Main Editor and Folder Tree">


<i>Advanced nested folder organization alongside a fully integrated Monaco Editor instance.</i>
</p>

### Rapid Context Switching

<p align="center">
<img src="frontend/src/assets/screenshots/command_palette.png" width="800" alt="Command Palette">


<i><b>Command Palette:</b> Instantly search, navigate, and execute bulk actions without touching the mouse.</i>
</p>

<p align="center">
<img src="frontend/src/assets/screenshots/ai_panel.png" width="800" alt="AI Assistant Panel">


<i><b>AI Panel:</b> Context-aware code explanations, generation, and refactoring directly within your workspace.</i>
</p>

## 🔐 Local-First & Highly Secure

Engineered for enterprise developers and privacy-conscious engineers, this application operates on a strict **Local-First** architectural pattern.

* **Standalone Desktop Application:** Runs as a single `.exe` (Windows), `.AppImage` (Linux), or `.dmg` (macOS). No installation required — double-click and run.

* **Bundled Runtime:** Includes a highly optimized, self-contained Java 21 JRE. No system-wide JDK required.

* **Portable Data Source:** All snippets, metadata, and folder structures are persisted to a local SQLite database (`data/snippet-vault.db`) next to the executable. Backups are as simple as copying a folder.

* **100% Offline Core:** The core vault requires zero internet connectivity. Your proprietary code never leaves your machine. *(Note: Optional AI features require explicit user initiation and API configuration).*

## ✨ Engineering Features

* **Embedded Monaco Editor:** Integrated via Angular components to provide native VS Code syntax highlighting, intelligent indentation, and language support for dozens of programming languages.

* **Real-Time Architecture:** \* **File System Watcher:** Bi-directional synchronization. The Spring Boot backend actively monitors local disk changes and synchronizes the internal database automatically.

    * **WebSocket Events:** UI state is kept perfectly in sync via STOMP/WebSockets. No manual refreshes required.

* **Advanced Organization:**

    * **Nested Tree Structures:** Infinite-depth folder creation and nested categorization.

    * **Tagging & Metadata:** Apply custom tags and descriptions to quickly identify complex architectural patterns.

    * **Bulk Operations:** Execute multi-file moves, deletions, and tag assignments instantly via the Bulk Action Bar.

* **Performance Optimizations:**

    * **Virtual Threads:** Leverages Java 21 Project Loom (`Executors.newVirtualThreadPerTaskExecutor()`) for high-throughput, non-blocking disk I/O and database operations.

    * **Angular 21 Reactive State:** Employs signals and strict lazy loading to ensure 60fps UI rendering, even with thousands of indexed snippets.

* **Deep Neon Cinematic Theme:** A premium, custom-engineered CSS/SCSS design system featuring glassmorphism (`backdrop-filter`) and calculated high-contrast typography designed to reduce eye strain during long coding sessions.

## 🛠️ Technical Stack

Snippet Vault is a hybrid desktop application utilizing a robust client-server architecture bound locally via Electron.

* **Backend (Java 21 + Spring Boot):**

    * **SQLite:** High-performance local persistence.

    * **NIO.2 WatchService:** Low-latency file system monitoring.

    * **Spring WebSockets:** Event-driven UI updates.

* **Frontend (Angular 21 + Monaco):**

    * **Monaco Editor:** The core engine powering VS Code.

    * **RxJS & Signals:** Reactive state management.

    * **SCSS Variables:** Extracted design tokens for a unified splash-to-app theme experience.

* **Desktop Shell (Electron):**

    * **Process Management:** Securely bootstraps and tears down the local Spring Boot server lifecycle.

## 🚀 Getting Started

1. **Download** the appropriate artifact for your OS:

    * **Windows:** `Snippet Vault Setup X.X.X.exe`

    * **Linux:** `Snippet Vault-X.X.X.AppImage` (mark as executable with `chmod +x`)

    * **macOS:** `Snippet Vault-X.X.X.dmg`

2. **Run** the application. The internal Java backend will bind to an available local port automatically.

3. **Start Coding:** Create your first snippet or point the vault to an existing local directory.

> **🍎 macOS Users:**
> If you encounter an "App is damaged and can't be opened" error, this is macOS Gatekeeper flagging an unsigned binary.
>
> **Resolution:**
> Open your Terminal and run:
>
> ```
> sudo xattr -cr "/Applications/Snippet Vault.app"
> 
> ```

### 🔄 Seamless Updates

Snippet Vault stores data strictly in the adjacent `/data` directory. To update:

1. Download the new executable.

2. Overwrite the old executable.

3. Ensure the `data/` folder remains adjacent to the new executable. Your SQLite database and snippets will load instantly.

## 📜 License

Distributed under the **MIT License**.

## 💖 Support the Project

If **Snippet Vault** improves your engineering workflow, consider supporting its maintenance and feature development.

<p align="center">
<b>Architected and Engineered by</b>


Alexander Nilsson
</p>