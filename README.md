# Desktop AI Pet

Windows desktop AI pet built with Electron + React + Three.js.

## Current Features

- Floating desktop pet with expandable chat window
- 3D pet states for `idle`, `thinking`, and `speaking`
- Pet appearance import and switching
- Import local `.gltf` or `.glb` pet model files
- Default dog model fallback
- Bilingual UI: Chinese and English
- Five built-in color themes with instant switching
- Full chat history loaded on open, chat-style scrollback
- `API` / `CODEX` chat modes
- OpenAI-compatible model profile management
- Skill prompt selection in `API` mode
- Codex integration with configurable command template
- Identity memory for pet and user
- Copy button for assistant replies
- System command panel with delete confirmation guardrail
- SQLite-backed local persistence

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## How To Use

### Chat

- Click the desktop pet to expand the chat window.
- The chat area loads your full saved conversation history and opens at the latest message.
- Press `Enter` to send.
- Press `Shift + Enter` for a new line.

### API Mode

- Choose `API` mode in the chat panel.
- Select a skill if needed.
- Configure model profiles in `Settings -> Models`.
- The app sends requests to an OpenAI-compatible `POST {baseURL}/chat/completions` endpoint.

### CODEX Mode

- Switch the chat panel to `CODEX` mode.
- Messages sent in this mode are treated as Codex tasks directly.
- Enable Codex integration in `Settings -> Models`.
- Recommended command template:

```bash
codex exec --skip-git-repo-check "{task}"
```

- If you want a specific model, for example:

```bash
codex exec --model gpt-5.4 --skip-git-repo-check "{task}"
```

### Change Pet Appearance

- Open `Settings -> Memory`.
- Find the `Pet Appearance` section.
- Click `Choose Model File` and select a `.gltf` or `.glb` file.
- The app copies the selected model's directory resources into the app data folder so relative assets like `.bin` and textures can continue to load.
- Click `Reset Default` to go back to the built-in dog model.

## Data Storage

Local data is stored under Electron `userData`:

- `ai-pet.sqlite`: app data and chat persistence
- `pet-assets/`: imported custom pet model assets

## Main Files

- `electron/main.ts`: Electron window lifecycle, IPC, pet asset import, custom asset protocol
- `electron/db.ts`: SQLite schema and persistence helpers
- `electron/agent.ts`: prompt building, cache, summary, chat requests
- `electron/codexBridge.ts`: Codex CLI discovery and execution bridge
- `src/App.tsx`: app UI and interaction logic
- `src/components/PetOrb.tsx`: pet rendering and model loading
- `src/styles.css`: theme and layout styles

## Notes

- Imported pet models currently support `.gltf` and `.glb`.
- For `.gltf`, related files are expected to live beside the selected model or under the same model folder.
- Keep at least one API model profile in the app.
- Codex mode depends on a working local `codex` CLI installation.
