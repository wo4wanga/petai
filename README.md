# PetAI

PetAI is an open-source desktop AI pet project focused on experimenting with AI-powered development workflows, automation, and interactive developer tooling.

The goal of this repository is to explore how modern AI models can assist developers in building smarter applications, improving productivity, and simplifying complex workflows, while also providing a usable desktop companion app as a practical implementation.

## Features

- AI-assisted desktop workflow experiments
- Developer productivity tooling
- Experiments with AI and Codex integrations
- Extensible architecture for future AI modules
- Floating desktop pet with expandable chat window
- 3D pet states for `idle`, `thinking`, and `speaking`
- Pet appearance import and switching
- OpenAI-compatible API mode and local Codex mode
- Full local chat history with SQLite persistence

## Why this project exists

As AI tools become increasingly important in modern software development, many developers want practical examples of how to integrate AI into real-world systems.

PetAI provides an open environment for experimenting with these ideas and sharing implementations with the community, while packaging those ideas into a concrete Windows desktop app.

## Roadmap

- Add AI-assisted workflow tools
- Improve automation features
- Integrate modern AI APIs
- Provide examples for developers learning AI integration

See also `ROADMAP.md`.

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
- The chat area loads full saved conversation history and opens at the latest message.
- Press `Enter` to send.
- Press `Shift + Enter` for a new line.

### API Mode

- Switch the chat panel to `API` mode.
- Select a skill if needed.
- Configure model profiles in `Settings -> Models`.
- Requests are sent to an OpenAI-compatible `POST {baseURL}/chat/completions` endpoint.

### CODEX Mode

- Switch the chat panel to `CODEX` mode.
- Messages sent in this mode are treated as Codex tasks directly.
- Enable Codex integration in `Settings -> Models`.
- Recommended command template:

```bash
codex exec --skip-git-repo-check "{task}"
```

- Example with a specific model:

```bash
codex exec --model gpt-5.4 --skip-git-repo-check "{task}"
```

### Change Pet Appearance

- Open `Settings -> Memory`.
- Find the `Pet Appearance` section.
- Click `Choose Model File` and select a `.gltf` or `.glb` file.
- The app copies the selected model's directory resources into the app data folder so relative assets like `.bin` files and textures can continue to load.
- Click `Reset Default` to switch back to the built-in dog model.

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

## Contributing

Contributions are welcome.  
Feel free to open issues or submit pull requests.

## License

MIT License. See `LICENSE`.
