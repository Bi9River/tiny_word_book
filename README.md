# tiny_word_book

A tiny personal vocabulary notebook. Stores words and sentences as JSON in a private GitHub repo so your data is yours, syncs everywhere, and costs nothing.

## Setup

### 1. Create a private repo for your data

Create a private repo on GitHub (e.g. `vocab_data`). Add an empty `words.json`:

```json
[]
```

That's it. The app will read and update this file as you go.

### 2. Generate a Personal Access Token

GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token.

- Resource owner: yourself
- Repository access: only the data repo (e.g. `vocab_data`)
- Repository permissions: **Contents → Read and write**

Copy the token (`github_pat_...`). You won't see it again.

### 3. Open the app and configure

On first launch you'll see a config screen. Enter:

- GitHub username
- Repository name (e.g. `vocab_data`)
- Personal access token

Saved locally in your browser's `localStorage`. Never sent anywhere except GitHub's API.

## Usage

- `+ Add word` and `+ Add sentence` — record what you're learning.
- Search the list, filter by type or language. Filters persist across sessions.
- Hover (or tap) a card's top-right `edit` button to edit or delete it.

## Develop locally

Requires Node ≥ 20.

```sh
npm install
npm run dev
```

## Build & deploy

The repo includes a GitHub Actions workflow that builds and publishes to GitHub Pages on every push to `main`.

```sh
npm run build
npm run preview
```
