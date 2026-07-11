# AGENTS.md

Operating guide for AI agents working in this repository. Read this first.

## What this is

A personal **self-study visualizations** site: interactive explorations of mathematics,
physics, and engineering, organised around a study syllabus. It is a **static site** —
plain HTML/CSS/vanilla-JS ES modules. **No build step, no framework, no dependencies,
no package.json.** Do not add one.

The only third-party asset is KaTeX, loaded from a CDN in each lesson page.

## Ground rules

- **Never introduce a build system or npm dependencies.** Everything runs directly in the browser.
- **Preserve existing content.** This is a growing personal knowledge base — don't delete
  lessons, topics, or notes to "clean up." Restructure in place.
- **Everything is served, not opened as files.** Use a static server (below); `file://` breaks
  ES-module imports and `fetch`.
- **Verify before you claim done** (see Verification). There is no automated test suite.
- **Match the surrounding style.** Read a sibling file before writing a new one.

## Run it

```bash
python3 -m http.server 8000     # from the repo root
# open http://localhost:8000/  → the syllabus (home)
```

There is no other tooling. The user will visually inspect the UI; do not try to screenshot it.

## Repository map

| Path | Role |
|------|------|
| `index.html` | **The syllabus — the entry point and organising spine.** (Was `syllabus.html`; renamed so it serves at `/`.) |
| `visualizations.html` | The flat gallery of every visualization. (Was the old `index.html`.) |
| `catalog.html` | Sources & textbooks. |
| `glossary.html`, `linear-algebra-glossary.html`, `probability-glossary.html` | Term glossaries; every term has an `id="c-…"` anchor for deep-linking. |
| `practice.html` | Textbook practice problems, grouped by course. |
| `<subject>/*.html` | **Lesson pages** — thin 33-line shells (e.g. `machine-learning/`, `linear-algebra/`, `particle-dynamics/`). |
| `src/` | The lesson engine (see `docs/lessons.md`). |
| `tools/` | Standalone calculators. |

## The two things you'll most often touch

1. **Adding or editing a lesson** → read **`docs/lessons.md`**. A lesson is a thin HTML shell
   plus one module in `src/lessons/<subject>/<name>.js` run by `run2d()` (2D canvas) or `run()` (3D).
2. **Editing the syllabus** (`index.html`) → read **`docs/syllabus.md`**. It has a specific
   **canonical section pattern** (accordion → resources bar → source-groups with status badges →
   topic rows with nested viz + `def →` links). Follow it; don't invent new per-section layouts.

## Conventions & gotchas

- **Lesson panel text is plain text, not HTML.** In a lesson step's `description`/`notes`, only
  `$…$` segments render (as KaTeX). Literal `<b>`/`<em>` tags show as text — use `$…$` or quotes.
  The `equation` field is a full LaTeX string (display mode).
- **Relative link depth matters.** Root pages link `visualizations.html`; a lesson in `sub/`
  links `../visualizations.html`; `particle-dynamics/scenarios/` links `../../…`. Lesson "back"
  links go to `visualizations.html` (the gallery), not `index.html`.
- **Glossary deep-links** use `#c-<term>` anchors (e.g. `probability-glossary.html#c-bayes`).
  Verify the anchor exists before linking.
- **Completion state** is seeded from `data-default="1"` on a topic row, then persisted in
  `localStorage`. localStorage wins after first load, so changing `data-default` only shows after
  the Reset button re-seeds. Convention: **a topic with an associated visualization is marked done.**
- **Colours**: blue `#1565c0` (forward/primary), orange `#e8710a`/`#e65100` (secondary/gradients),
  green `#2e7d32` (done/trainable), red `#c62828` (negative), purple `#7b1fa2` (bias).

## Verification (do this before saying it works)

No test runner exists. For any change:

```bash
# 1. Every JS module still parses
node --check src/lessons/<subject>/<name>.js

# 2. No broken internal links or glossary anchors — run the link check in docs/verification.md
# 3. Pages still serve
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/<page>
```

For syllabus edits, also confirm HTML `<div>`/`<details>` balance (a stray tag breaks the accordion).
See **`docs/verification.md`** for ready-to-paste checks.

## Git workflow

- **Branch off `main`** for any change; never commit straight to `main` unless told.
- Commit messages: imperative subject, a short body explaining *why*. End with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- Open PRs with `gh pr create` against `main`.
- Commit only when asked. Keep unrelated work (e.g. an in-progress prototype) out of a commit —
  the user expects held-back work to stay uncommitted.

## Further reading

- `docs/lessons.md` — the lesson engine and how to add a lesson
- `docs/syllabus.md` — syllabus structure and the canonical section pattern
- `docs/verification.md` — copy-paste integrity checks
