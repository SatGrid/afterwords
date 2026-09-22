# Afterwords

A small shared universe made from one-word contributions. Visitors choose an existing word to place theirs beside, so every line on the map records a human-made relationship. The repository owner reviews each submission before it appears.

## Publish it

1. Create a **public** GitHub repository and push these files to its `main` branch.
2. In **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**.
3. In **Settings → Actions → General → Workflow permissions**, choose **Read and write permissions**.
4. Create an issue label called `approved-word`.
5. Wait for the **Publish constellation** workflow to finish. The site URL appears in **Settings → Pages**.

The site detects its GitHub repository from its Pages URL. A visitor's **Add to the map** button opens a prefilled GitHub issue containing the new word and its chosen relationship, so contributors need a GitHub account. Review the issue and apply `approved-word` to publish it. You can skip or close anything you don't want to display. If an approved word is already present, the workflow keeps the site unchanged.

The first nine words are examples. Replace them in `words.json` before publishing if you like. An example has `date` and `issue` set to `null`.

## Local preview

Serve the folder with any static server, such as `python -m http.server 8000`, then open `http://localhost:8000`. A file URL will not load `words.json` in most browsers. Submissions become active at the GitHub Pages URL.

## How it works

- `index.html`, `style.css`, and `app.js` provide the static site.
- `words.json` is the public word archive; each entry's `parent` identifies the word it was placed beside.
- When an issue receives the `approved-word` label, the workflow runs `scripts/add_word.py`, commits the new word, and deploys the updated site.
- The page shows 24 words at a time so the constellation stays usable as it grows.

This repository requires no paid service or API keys.
