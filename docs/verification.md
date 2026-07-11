# Verification checks

There is no automated test suite. Run the relevant checks below after a change and before claiming
it works. Run them from the repo root with the static server up
(`python3 -m http.server 8000`).

## 1. JS modules parse

```bash
node --check src/lessons/<subject>/<name>.js
# or all of them:
find src -name '*.js' -exec node --check {} \;
```

For inline `<script>` in an HTML file (e.g. the syllabus), extract and check it:

```bash
python3 -c "import re;open('/tmp/_c.js','w').write(re.search(r'<script>(.*)</script>',open('index.html').read(),re.S).group(1))"
node --check /tmp/_c.js
```

## 2. Internal links and glossary anchors resolve

```bash
python3 - <<'PY'
import glob, os, re
anchors = {g: set(re.findall(r'id="([^"]+)"', open(g).read())) for g in glob.glob('*.html')}
badf = badh = chk = 0
for f in glob.glob('**/*.html', recursive=True):
    if f.startswith('.git/'): continue
    d = os.path.dirname(f)
    for m in re.finditer(r'(?:href|src)="([^"#]+\.(?:html|js|css))(#[^"]*)?"', open(f).read()):
        h, frag = m.group(1), m.group(2)
        if h.startswith('http'): continue
        tgt = os.path.normpath(os.path.join(d, h)); chk += 1
        if not os.path.isfile(tgt): badf += 1; print("BROKEN FILE ", f, "->", h); continue
        if frag and tgt in anchors and frag[1:] not in anchors[tgt]:
            badh += 1; print("BROKEN ANCHOR", f, "->", h, frag)
print(f"checked {chk} refs | broken files {badf} | broken anchors {badh}")
PY
```

Expect `broken files 0 | broken anchors 0`.

## 3. Tag balance (after editing the syllabus / any structural HTML)

An unclosed `<div>` or `<details>` silently breaks the accordion.

```bash
python3 -c "s=open('index.html').read(); print('div', s.count('<div'), s.count('</div>'), '| details', s.count('<details'), s.count('</details>'))"
```

The open/close counts must match. To check one section:

```bash
python3 -c "import re;b=re.search(r'<details class=\"phase\" id=\"probability\".*?</details>',open('index.html').read(),re.S).group(0);print(b.count('<div'),b.count('</div>'))"
```

> Note: avoid greedy `(?:.*?\n)*?` regexes over the whole file — they backtrack badly and can hang.
> Prefer `count()` checks or per-section `re.search` with `re.S`.

## 4. Pages serve

```bash
for p in / visualizations.html machine-learning/backpropagation.html; do
  curl -s -o /dev/null -w "$p %{http_code}\n" "http://localhost:8000/$p"
done
```

Expect `200` for each.

## 5. Runtime (lessons)

Runtime canvas errors won't show in the checks above. The user visually confirms lessons in the
browser — **do not attempt to screenshot the UI yourself.** Load the page, open the console, and
ask the user to confirm, or hand it to them to check.
