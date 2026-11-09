# Laurevine Loto — Architecture

Technical design specification, component architecture, data flow, IPC contract, and security model for Laurevine Loto.

---

## 1. Architectural Layers

The codebase follows a strict unidirectional dependency hierarchy:

```
core → services → state → commands → ui → features
```

- **`core/`**: Pure algorithmic logic, mathematical transforms, Markdown parsers, diff calculation, TOC generators, and outline trees. Core has zero DOM, Electron, or Node.js dependencies.
- **`services/`**: Client wrappers around the IPC interface, document management, search indexing, spellchecking, and window state. Services interact with the Electron main process via `window.loto.invoke()` and `window.loto.on()`.
- **`state/`**: Central reactive state store with immutable slices (documents, workspace, ui, settings). State changes dispatch actions and notify subscribers.
- **`commands/`**: Command registry mapping command IDs to execution handlers, keyboard shortcuts, menu labels, and enable/disable conditions.
- **`ui/`**: Shared interface components, shell layout (titlebar, ribbon, sidebars, panes, tabs, status bar), dialogs, and DOM construction kit (`h()`).
- **`features/`**: High-level application capabilities (Explorer, Search, Backlinks, Outline, Problems, Studio, Migration, History, Recovery). Features coordinate commands, state, and UI.

---

## 2. Process Model & Data Flow

Laurevine Loto runs on Electron's multi-process architecture:

```
[ OS Filesystem ] ◄───► [ Main Process (Node.js ESM) ]
                                ▲
                                │ Sandboxed IPC (allow-list)
                                ▼
                       [ Preload Bridge (CJS) ]
                                ▲
                                │ Context Isolation (window.loto)
                                ▼
                       [ Renderer (ESM Web Standards) ]
```

### Data Flow
1. **User Input**: Keypresses or pointer interactions hit CodeMirror 6 or UI buttons.
2. **Command Dispatch**: The UI invokes a registered command via `ctx.commands.execute()`.
3. **State Mutation**: The command executes logic or triggers an action via `store.dispatch()`.
4. **Reactive Update**: Subscribed UI components rerender the dirty subtree.
5. **Disk Persistence**: Document changes schedule a debounced flush to the main process via `doc:save`. The main process writes atomically to disk using temp files, `fsync`, and atomic renames.

---

## 3. Storage Layout

All user application state is stored locally within the standard Electron `app.getPath('userData')` directory:

```
userData/
├── settings.json       # User settings with schema validation and version migrations
├── window-state.json   # Window dimensions, maximized state, and display bounds
├── history/            # Content-addressed snapshot blobs keyed by SHA-256 hash
│   └── <docId>/
│       ├── index.json  # Manifest of snapshots with timestamps and labels
│       └── <hash>      # Uncompressed UTF-8 snapshot content
├── recovery/           # Active session crash recovery state
│   └── <key>.json      # Unsaved document state (text, path, caret, mode)
└── presets/            # User-saved export configurations and custom templates
```

Workspaces themselves remain untouched standard directories containing plain Markdown files and assets.

---

## 4. IPC Contract

Communication between the sandboxed renderer and the main process is strictly enforced by `shared/channels.js`:

- **Channel Schema**: Every channel follows `domain:action` naming syntax (e.g. `doc:open`, `fs:listDir`, `search:start`).
- **Input Validation**: Every invocation payload is validated before reaching main service handlers. Malformed inputs immediately throw an error.
- **Preload Allow-List**: `main/preload.cjs` exposes only verified channels via `window.loto.invoke()` and `window.loto.on()`. Arbitrary IPC messages are rejected.
- **Path Scoping**: Filesystem operations (`fs:*`) verify that all targeted file paths reside within the window's currently active workspace directory. Attempts to escape via `..` or symlinks are blocked (`E_PATH`).

---

## 5. Security Model

- **Context Isolation & Sandboxing**: `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true` are enabled for all browser windows.
- **Content Security Policy (CSP)**:
  ```
  default-src 'self' loto: loto-asset:;
  script-src 'self' loto:;
  style-src 'self' loto: 'unsafe-inline';
  img-src 'self' loto: loto-asset: data:;
  font-src 'self' loto:;
  connect-src 'self' loto:;
  base-uri 'none';
  form-action 'none';
  frame-ancestors 'none';
  ```
- **Custom Protocols**:
  - `loto://app/`: Serves application code and assets with nosniff headers.
  - `loto-asset://`: Read-only streaming handler for local images and media within authorized workspace folders.
- **Navigation Controls**: External links are intercepted via `will-navigate` and `setWindowOpenHandler` and opened in the user's default system browser via `shell.openExternal`. No arbitrary web navigation is permitted inside the app.
- **HTML Sanitization**: All rendered Markdown output passes through DOMPurify with strict tag and attribute whitelists (`core/markdown/sanitize.js`). Scripts, iframes, styles, form elements, and javascript: URIs are stripped.

---

## 6. How to Extend the Application

### Adding a New Command
1. Define the command in the appropriate `renderer/src/commands/definitions/` file.
2. Register the implementation in a feature `register(ctx)` method:
   ```javascript
   ctx.commands.register({
     id: 'custom.my-command',
     title: 'My Custom Command',
     icon: 'sparkles',
     group: 'Tools',
     shortcut: 'Ctrl+Shift+M',
     run: () => { /* action */ },
   });
   ```

### Adding a New IPC Channel
1. Add the channel constant and schema validator in `shared/channels.js`.
2. Add the channel name to `INVOKE_CHANNELS` or `EVENT_CHANNELS` in `main/preload.cjs`.
3. Register the handler in `main/ipc/registry.js` with path scoping.
4. Export a typed client function in `renderer/src/services/`.
