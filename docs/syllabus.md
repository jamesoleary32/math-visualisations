# The syllabus (`index.html`)

`index.html` is the home page and the **organising spine** of the whole project. Everything else
(lessons, glossaries, sources, practice) hangs off it. It is a single self-contained HTML file
(inline CSS + one `<script>` at the bottom).

## Top-level structure

- **Header** + overall progress bar.
- A **floating table of contents** (`#toc`) — Notion-style, right edge. Built by JS from the
  sections; scroll-spy highlights the section in view; clicking a tick expands that section and
  scrolls to it; deep links like `#probability` auto-expand.
- **Two tier bands** (`.tier-label`): **Mathematical Foundations** and **Applications & Engineering**,
  grouping the subjects by kind.
- **Subjects**, each an accordion.

## A subject = a `<details>` accordion

```html
<details class="phase" id="probability" data-phase="8">
  <summary class="phase-summary">
    <div class="phase-header">
      <span class="phase-title">Probability</span>
      <span class="phase-progress-text" id="p8-text"></span>
    </div>
    <div class="phase-bar-wrap"><div class="phase-bar-fill" id="p8-bar"></div></div>
  </summary>
  …body…
</details>
```

- The class is `phase` and the id is a **slug**; `data-phase="N"` is a stable numeric key the JS
  uses for the progress bar ids `pN-bar` / `pN-text`. **`data-phase` values must stay unique**;
  DOM order is independent of the number (reorder freely by moving whole `<details>` blocks).
- Collapsed cards keep the title + progress bar visible. Add `open` to a `<details>` to expand it
  by default.

## The canonical section pattern

Every subject body follows the same shape — do not invent per-section layouts:

```
<div class="phase-resources"> Glossary · Sources (catalog) · Practice </div>

<div class="source-group">
  <div class="source-head">
    <span class="source-name"><a href="catalog.html#src-slug">Book — Title</a></span>
    <span class="source-detail">publisher / note</span>
    <span class="source-status status-current">Current</span>   <!-- or status-done / -next / -planned -->
  </div>

  <div class="topic-group-label">Optional thematic sub-label</div>

  <div class="topic-row" data-id="prob-conditional" data-default="1">
    <input type="checkbox" id="prob-conditional">
    <span class="topic-name">Conditional Probability &amp; Bayes</span>
    <span class="topic-sub">short description</span>
    <span class="topic-source">B&amp;H §2</span>
    <a href="probability-glossary.html#c-conditional" class="gloss-link" onclick="event.stopPropagation()">def →</a>
  </div>
  <div class="topic-viz">
    <a href="probability/conditional-probability.html"><span class="viz-tag">viz</span>Conditional Probability</a>
    <a href="probability/bayes-rule.html"><span class="viz-tag">viz</span>Bayes' Rule</a>
  </div>
</div>
```

Key rules:
- **Grouping is by source, never by status.** Completion is carried *only* by the checkbox
  (strikethrough) — do not add "Completed / To do" headers (they drift out of sync). Use
  `topic-group-label` only for *thematic* sub-groups inside a source.
- **Status badge** lives on the source, not the topics: `status-done` / `status-current` /
  `status-next` / `status-planned`.
- **`source-name` deep-links to the catalog.** Wrap the name in `<a href="catalog.html#src-slug">`
  pointing at that book's `book-card` id in `catalog.html` (a combined source links each name
  separately, e.g. `<a …#src-3b1b-linalg>3Blue1Brown</a> · <a …#src-singh>Singh</a>`). Every source
  cited here should have a matching card; add one to the catalog before linking.
- **Per topic**: an inline `def →` (`gloss-link`) to the glossary anchor when one exists, and a
  nested `topic-viz` block listing associated visualizations (each `<a>` = one viz).
- Sources come in three shapes: **single book** (one source-group), **sequential books** (one
  source-group each, different topics), **parallel books** covering the same topics (one combined
  source-group naming both — e.g. `3Blue1Brown · Singh`).
- **Practicals** (applied sections): an optional `.practicals` block after the source-groups for
  hands-on projects. `.practical-row`s persist like topics but are **excluded from the progress bar**.

## Topic granularity — one topic per chapter

**A topic is a book chapter, not a subsection.** Probability has 13 topics for Blitzstein & Hwang's
13 chapters; Deep Learning has one per Prince chapter. Do **not** split a chapter's subsections into
separate topic rows.

The subsections are not lost — they are represented two ways:
1. The topic's `topic-sub` line **names that chapter's actual subsections** (e.g. Transformations →
   "change of variables, convolutions, Beta, Gamma, Beta–Gamma connections, order statistics").
2. **The nested visualisations implicitly fill them out.** A `topic-viz` block can hold several viz,
   each covering a subsection of that chapter — so depth is expressed by *attaching visualisations*,
   not by multiplying checkboxes.

Why: subsection-level rows would push a single subject past ~50 topics and let it dominate the
overall progress bar, while adding little — chapters are what you actually work through and tick off.

## Completion & the script

- `initCheckboxes()` seeds each `.topic-row[data-id]` (and `.practical-row[data-id]`) from
  `data-default="1"`, then persists to `localStorage` under `syllabus-v1`. localStorage wins after
  first load; the **Reset** button clears it and re-seeds from the HTML.
- `updateProgress()` counts **only `.topic-row[data-id]`** — practicals and other checkboxes don't
  affect the bars.
- Convention: **a topic with a `topic-viz` block is marked done** (`data-default="1"`), on the basis
  that an existing visualization means the topic was built and understood. *Exception:* a brand-new
  lesson for a topic actively being learned is not auto-marked done.

## Common edits

- **Add a viz to a topic**: insert a `topic-viz` block immediately after the `topic-row`.
- **Add a def link**: append a `gloss-link` `<a>` before the topic row's closing `</div>`; verify
  the `#c-…` anchor exists in the target glossary.
- **Reorder subjects**: move whole `<details>…</details>` blocks; the TOC and progress follow
  automatically. Keep `data-phase` numbers unique.
- **After any structural edit**, confirm `<div>`/`<details>` balance and link integrity
  (`docs/verification.md`) — an unclosed tag silently breaks the accordion.
