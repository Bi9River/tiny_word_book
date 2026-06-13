# tiny word book

A tiny personal vocabulary notebook. Words and sentences are stored as JSON in a private GitHub repo of your own, so your data is yours, syncs everywhere, and costs nothing.

Two ways to use it:

- **Web app** — a PWA you can install on any device. Add, search, filter, edit.
- **Chrome extension** — highlight a word or sentence on any page, hit `Cmd+Shift+K`, done. Triage translations later in the web app.

## Setup

### 1. Create a private repo for your data

Create a private repo on GitHub (e.g. `vocab_data`). Add an empty `words.json`:

```json
[]
```

The app reads and updates this file as you go.

### 2. Generate a Personal Access Token

GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token.

- Resource owner: yourself
- Repository access: only the data repo (e.g. `vocab_data`)
- Repository permissions: **Contents → Read and write**

Copy the token (`github_pat_...`). You won't see it again.

### 3. Configure the app

Open the web app (or the extension's options page) and enter:

- GitHub username
- Repository name (e.g. `vocab_data`)
- Personal access token

Saved locally (browser `localStorage` for the web app, `chrome.storage.sync` for the extension). Never sent anywhere except GitHub's API.

## Usage

### Web app

- `+ Add word` / `+ Add sentence` — record what you're learning.
- Search by word, translation, notes, or part of speech. Words rank above sentences.
- Filter by type, language, or **pending** (entries captured by the extension that still need a translation). Filters persist across sessions.
- Hover (or tap) a card's top-right `edit` button to edit or delete.
- Dark mode toggle in the header. Respects your system preference on first launch.

### Chrome extension

- Highlight text on any webpage and press `Cmd+Shift+K` (or `Ctrl+Shift+K` on Linux/Windows), or right-click → **Save to Tiny Word Book**.
- Single token → saved as a word; multiple → as a sentence.
- The page's language is auto-detected; the entry is marked **pending** for you to translate later in the web app.

## Develop locally

Requires Node ≥ 20. Monorepo with npm workspaces under `packages/`:

- `packages/web` — SvelteKit PWA
- `packages/extension` — Chrome extension (Manifest V3)
- `packages/shared` — types, GitHub client, language data

```sh
npm install
npm run dev          # web app at http://localhost:5173
npm run dev:ext      # extension dev build (load `packages/extension/dist` as unpacked)
npm run check        # type-check both packages
```

## Release

- **Web** — every push to `main` builds and deploys to GitHub Pages via Actions.
- **Extension** — bump `version` in `packages/extension/public/manifest.json` and push. Actions builds, zips, and publishes a GitHub Release with the `.zip` attached. You can also tag manually with `ext-v<version>`.
