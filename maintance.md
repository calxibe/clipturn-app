# Maintaining the ClipTurn website

Maintenance notes for the public ClipTurn website repository.

---

## What this is

`clipturn.app` is hand-written static HTML, CSS and JavaScript. There is no build step, no bundler,
no framework and no package manager. What is in this folder is exactly what gets served.

This repository is **its own git repository**, nested inside the ClipTurn product folder. It has its
own remote (`github.com/calxibe/clipturn-app`) and is deliberately excluded from the product build's
source snapshot. Committing here does not touch the app, and building the app does not touch this.

| File | What it is |
| --- | --- |
| `index.html` | Home page — the only page most visitors see |
| `pricing.html` | Price, what is included, workflow comparison table |
| `manual.html` | The full user manual, ~6,800 words on one page |
| `changelog.html` | Release history — see the rules below |
| `privacy.html`, `terms.html` | Legal pages |
| `404.html` | Served by GitHub Pages for any unknown URL |
| `site.css` | Every style for every page, one file |
| `site.js` | Mobile menu, screenshot lightbox, video facade |
| `manual.js` | Manual search and table of contents only |
| `sitemap.xml`, `robots.txt`, `llms.txt`, `manifest.webmanifest` | Crawler, LLM and PWA metadata |
| `CNAME`, `.nojekyll` | GitHub Pages custom domain, and "do not run Jekyll" |

---

## Deploying

> **Git push policy:** The site owner pushes changes manually. Do not run `git push` unless the
> current request explicitly asks you to push. A push instruction from an earlier task does not
> carry forward to later work.

When changes are manually pushed to `main`, GitHub Pages builds and publishes automatically.

**A clean `git status` does not mean the live site is current.** The Pages build takes a few minutes,
and Fastly caches responses for ten minutes on top of that. To check what is actually live:

```bash
curl -s -H 'Cache-Control: no-cache' "https://clipturn.app/index.html?cb=$RANDOM" -o /tmp/live.html
diff --strip-trailing-cr index.html /tmp/live.html
```

`--strip-trailing-cr` matters: local files are CRLF, the served copies are LF, and without it every
single line reads as changed.

### When the live site is stale, it is almost never the cache

Diagnose before you touch anything. Ask for a file that only exists in the new version:

```bash
curl -sI https://clipturn.app/assets/video/tutorial-poster.jpg | head -1
```

`404` means **the deploy never landed** — no amount of cache clearing will help. `200` means the
deploy is live and anything stale is your browser (Ctrl+Shift+R).

Then check whether the file is in the repo but not on the site. If `raw.githubusercontent.com`
serves it and `clipturn.app` does not, the repository is fine and Pages simply has not published:

```bash
curl -s -o /dev/null -w "repo %{http_code}\n" https://raw.githubusercontent.com/calxibe/clipturn-app/main/index.html
curl -s -o /dev/null -w "site %{http_code}\n" https://clipturn.app/index.html
curl -sI https://clipturn.app/index.html | grep -i last-modified   # frozen = no deploy since then
```

**There is no cache to flush.** GitHub Pages sits behind Fastly with `Cache-Control: max-age=600`
and offers no purge button and no purge API. It expires by itself in ten minutes and revalidates
against the origin by `ETag`. An `Age: 0` response that is still stale means the origin itself is
stale — Fastly is doing its job.

**A `?v=` token does not touch the server.** `site.css?v=…` busts the *browser* cache only. GitHub
serves whatever `site.css` is currently deployed no matter what you append, so a bumped token proves
nothing about whether a deploy succeeded.

To force a rebuild: `git commit --allow-empty -m "Rebuild Pages" && git push`, or Settings → Pages →
Source → None → Save → back to `main` / `/ (root)` → Save, or re-run the run from the Actions tab.

If builds are queued or slow, check <https://www.githubstatus.com> before assuming it is you. Pages
"deploy from a branch" runs through the `pages-build-deployment` **Actions** workflow, so an Actions
incident stalls every deploy. This happened on 6 August 2026: builds queued for hours while the site
served two-hour-old bytes and nothing was wrong with the repo.

```bash
curl -s https://www.githubstatus.com/api/v2/components.json | grep -A2 '"name": "Pages"'
```

**Never delete and recreate the repository during an Actions or Pages incident.** A new Pages site
cannot serve anything until a build completes, so you would trade a stale site for a dead one, plus
a fresh HTTPS certificate that also has to provision.

### Keep stylesheet and script URLs free of cache tokens

Keep stylesheet references free of version query strings. Pages link to `site.css` directly, using
`/site.css` only where a root-relative URL is required, such as `404.html`.

Do not append cache-busting values such as `?v=20260806-18`. GitHub Pages serves the currently
deployed file regardless of the query string, and the current Cloudflare configuration does not
cache these static files. A changed query string can make a browser request a different URL, but it
does not prove that GitHub Pages successfully deployed the changed file.

`site.js` and `manual.js` also use plain URLs. Keep them unversioned unless the hosting and caching
strategy changes deliberately, in which case update this guide and every affected page together.

---

## Testing before you push

Serve the folder and look at it. Do not push CSS changes you have only read.

```bash
python -m http.server 8899 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8899/`.

Check every change in **four** states, because the site has no theme toggle and follows the operating
system:

1. Light mode, desktop width
2. Dark mode, desktop width
3. Light mode, 375px wide
4. Dark mode, 375px wide

Dark mode is the one that breaks. `site.css` has a large `@media (prefers-color-scheme: dark)` block
around line 1980, and any new component needs its own overrides added there. A colour that is only
defined in the light rules will simply stay light on a dark page. This has already happened once: the
"Clear limits, before surprises" eyebrow sat at 1.61:1 contrast — dark blue on dark navy, effectively
invisible — because the section's other elements got overrides and that one did not.

Before pushing, sanity-check links and structured data:

```bash
grep -n 'site\.css?v=' *.html                  # must return no matches
grep -n 'rel="stylesheet"' *.html             # every page must use the expected plain CSS URL
grep -c '9PGB9JVBRGLB' *.html                  # Store id, 20 occurrences across 6 files
```

---

## The changelog — read this before editing `changelog.html`

### Keep the engineering and public changelogs synchronized

`../latest/changelog.md` is the trigger for this review, and `../latest/version.json` is the
authoritative source for the current product version. **Every time the engineering changelog is
updated, review and maintain `changelog.html` in the same work.** Add or revise the user-visible,
release-worthy entries using the rules below, and make every website version reference agree with
`version.json`. An internal-only engineering entry may need no public bullet, but the review is
still mandatory so the two changelogs cannot drift unnoticed.

### Show month and year only. Never the day.

```html
<span class="version-date"><time datetime="2026-08">August 2026</time></span>
```

A day-level date invites the question "why has nothing shipped since the 6th?" and ages the page
badly. `datetime="2026-08"` is a valid HTML month value, so the machine-readable form stays correct.

### Do not copy `latest/changelog.md` into it

`../latest/changelog.md` is the engineering changelog. It is exhaustive by design — every defect,
every measurement, every PSNR figure, every rejected approach. That is the right level of detail for
that file and completely the wrong level for a public web page.

**Only the user-visible and release-worthy changes go on the website**. There is no fixed limit on
the number of bullets in a release; include as many meaningful changes as the release needs. A
visitor is deciding whether to install or update, not auditing every detail of the work. If a
change is only a small implementation detail, such as a button changing colour or an internal
refactor, leave it out unless it is part of a larger user-facing improvement.

Leave out: internal refactors, test-suite additions, build and packaging changes, dependency bumps,
anything about the corpus or the harness, and every defect nobody outside the project ever hit.

### Write for a person, not for the record

Rewrite each entry in plain language. Compare:

> **Engineering changelog:** Added generalized Matroska audio passthrough
> (`MatroskaAudioPassthrough`). `Mp4ToMatroskaRemuxer` opens a second reader on the ORIGINAL source,
> leaves the audio stream on its native compressed type so the reader keeps handing back the file's
> own packets, and interleaves them into the candidate untouched.

> **Website:** **The soundtrack is never re-encoded** — In MKV, WebM and WMV files the audio is
> copied across untouched, so FLAC, ALAC, PCM, Dolby TrueHD, DTS-HD, Opus, Vorbis and MP3 all survive
> a rotation exactly as they were.

Rules of thumb:

- Two or three sentences per bullet. If it needs more, it belongs in the manual.
- Lead with a short bold label, then an em dash, then the explanation.
- No class names, file names, API names, or HRESULTs. No benchmark numbers unless the number is the
  point a user would care about.
- Say what the user gets, not what the code does.
- Keep the site's habit of naming limits honestly. The `.changelog-note` box at the bottom of the
  page exists for that and should stay.

### Structure

One `.version-card` per release, newest first. Inside it, use only the headings that apply, in this
order:

```html
<article class="version-card">
  <div class="version-header">
    <h2 class="version-number" id="v1-0-1">v1.0.1</h2>
    <span class="version-badge">Latest</span>
    <span class="version-date"><time datetime="2026-09">September 2026</time></span>
  </div>

  <div class="version-section">
    <h3>Added</h3>
    <ul class="feature-list">
      <li><strong>Short label</strong> &mdash; One or two sentences.</li>
    </ul>
  </div>

  <div class="version-section">
    <h3>Improved</h3>
    <ul class="feature-list">…</ul>
  </div>

  <div class="version-section">
    <h3>Fixed</h3>
    <ul class="feature-list">…</ul>
  </div>
</article>
```

- **Added** — something that was not there before.
- **Improved** — something that existed and now works better.
- **Fixed** — something that was broken. Only list defects a released version actually shipped with.

Omit any heading with nothing under it. v1.0.0 has only **Added**, because there was no earlier
release to improve on or fix.

### When you add a release

1. Add the new `.version-card` **above** the existing ones.
2. Move `<span class="version-badge">Latest</span>` to the new card and delete it from the old one.
3. Give the `h2` a unique `id` (`v1-0-1`) so releases can be linked directly.
4. Update `<lastmod>` for `changelog.html` in `sitemap.xml`.
5. Update the version in the `<title>` and `<meta name="description">`, and the
   `<p class="updated">Current version …</p>` line in the hero.
6. `privacy.html` and `terms.html` both name the version in their opening paragraph. Update those too.

The `h2` must stay the version number — that keeps the heading outline `h1 Changelog → h2 v1.0.0 →
h3 Added`. Do not demote it to a `<span>` and promote the section headings; that produces a heading
skip and breaks screen-reader navigation.

---

## The competitor comparison on `pricing.html`

The table names four real Microsoft Store apps: Clipchamp, Lossless-Video-Rotate-Cut, Video Rotate
Flip Video and Rotate Video+. Naming real products changes the rules — every cell has to be
defensible, because the publishers can read it.

**Where the facts come from.** Not the Store web page: `apps.microsoft.com` is a JavaScript shell and
returns nothing useful to `curl` or a fetch. Use Microsoft's own catalog API, which is public and
unauthenticated:

```bash
curl -s "https://displaycatalog.mp.microsoft.com/v7.0/products/9NWZH10VKNBS?market=US&languages=en-US&fieldsTemplate=Details"
```

`Product.LocalizedProperties[0]` has the title, publisher and full description; `MarketProperties[0]`
has the rating and dates; `DisplaySkuAvailabilities[0]` has the real price. That is the authoritative
source and it is what every cell in the table was written from.

**Rules for the table:**

- A cell may only state what that app's own listing says. If the listing is silent, the cell is
  **"Not described"** — which the method note explicitly defines as *"the listing does not mention
  that capability, not that the app cannot do it."* Never upgrade silence into an accusation.
- **Do not make the competitors look worse than they are.** One row is deliberately lost:
  Lossless-Video-Rotate-Cut rotates *compressed* video with no re-encode, which ClipTurn cannot do —
  ClipTurn is only sample-exact on uncompressed AVI. That row stays. A table where the competition
  never wins anything reads as marketing, and anyone who installs the other app catches it
  immediately. It also contradicts the honesty the rest of the site is built on.
- Keep the closing paragraph that credits what each app does better, and keep the links to all four
  listings so a reader can check.
- Re-check the prices and limits before each release and update the "checked on" date. Prices,
  trial limits and ad policies change; a stale claim about a named company is the one that causes
  trouble.

---

## The tutorial video

The home page embeds the YouTube tutorial through a **click-to-play facade**, not a plain `<iframe>`.
Nothing is requested from YouTube until the visitor presses play: the poster
(`assets/video/tutorial-poster.jpg`) and the play button are ours, and `site.js` swaps in a
`youtube-nocookie.com` iframe on click.

**This is a promise, not a preference.** `privacy.html` §5 tells visitors that loading the page sends
no request to YouTube and shows no cookie prompt. Replacing the facade with a direct embed would make
the privacy policy false. If you ever need a plain iframe, change §5 in the same commit.

To swap in a different video:

1. Save the new poster to `assets/video/` — 1280×720 works; YouTube's is at
   `https://i.ytimg.com/vi/<VIDEO_ID>/maxresdefault.jpg`.
2. Update `data-video-id`, `data-video-title`, the `<img src>` and `alt`, and the duration in
   `.video-facade-label` in `index.html`.
3. Update the `VideoObject` JSON-LD in the `<head>`: `name`, `description`, `thumbnailUrl`,
   `uploadDate`, `duration` (ISO 8601, e.g. `PT1M13S`) and `embedUrl`.
4. Update the "A 73-second look" eyebrow above the video if the length changed.

Check the real duration rather than guessing — `"lengthSeconds"` in the watch page source, or
`itemprop="duration"`.

---

## Things that are easy to get wrong

**The site has no theme toggle.** It follows `prefers-color-scheme`. Every new component needs
overrides in the dark block or it will render light-on-light.

**Screenshots are mixed themes.** The hero screenshot is the app in dark mode; the batch and details
screenshots are light. That is a known inconsistency worth fixing when the screenshots are next
retaken.

**The primary nav differs slightly per page**, because each legal page injects a self-link. When you
change the nav, change it in all seven files and check for drift.

**Footer column headings are `<h2>`.** That adds two content-free top-level headings to the outline of
every page. Known issue, worth changing to `<p>` with styling.

**Anchor offsets are handled by `scroll-padding-top: var(--anchor-offset)`** on `html`, because the
header is sticky. If you change the header height, change `--anchor-offset` to match, or in-page
links will land under the header.

---

## The layout system — do not invent new spacing

Every page is built from the same four pieces. If you find yourself writing a new padding value or a
new heading class, you are almost certainly about to reintroduce the drift this system exists to
prevent.

### Four tokens, defined once in `:root`

| Token | Value | Used by |
| --- | --- | --- |
| `--page-top` | `clamp(56px, 5.5vw, 76px)` | Top padding of every page's hero |
| `--page-bottom` | `clamp(48px, 5vw, 64px)` | Bottom padding of every page's hero |
| `--section-y` | `clamp(84px, 10vw, 132px)` | Top and bottom padding of every `.section` |
| `--page-h1` | `clamp(2.45rem, 5vw, 4.25rem)` | The `h1` in every hero |

**Headlines must fit on two lines.** `--page-h1` caps at 68px, and the hero copy columns are sized
so the longest headline still breaks only once. Before changing either the token or a hero grid,
check the line count at 1930px, 1440px and 375px — the wide end is where it breaks first, because
the copy column stops growing at `--content` while the font keeps scaling with `vw`.

The two hero grids are tuned to their own headline and must stay wide enough for it:

| Grid | Columns | Copy column at ≥1280px |
| --- | --- | --- |
| `.hero-grid` (index) | `minmax(0, 1.15fr) minmax(430px, 0.85fr)` | 642px |
| `.pricing-hero-grid` | `minmax(0, 1.28fr) minmax(320px, 0.72fr)` | 700px |

`.hero h1` deliberately has **no `max-width`**. It used to be capped at 720px while the copy column
was only 476px, so the cap did nothing except hide the real constraint — the headline was rendering
on five lines at 92px. The column is the constraint; size the column, not the heading.

All four heroes — `.hero`, `.pricing-hero`, `.manual-hero`, `.legal-hero` — use
`padding: var(--page-top) 0 var(--page-bottom)` and `font-size: var(--page-h1)`. That is what makes
the distance from the header to the first heading identical on all six pages: **102px at 1440px,
76px at 1024px, 72px at 375px**, measured, not estimated.

**Never override hero padding or hero `h1` size inside a media query.** The tokens are clamps and
already scale. Per-page overrides at four different breakpoints (620px, 700px, 760px, 1020px) are
exactly what made the pages disagree in the first place; they have been removed.

### One heading block

```html
<div class="section-header">
  <p class="eyebrow">Short label above</p>
  <h2 class="section-heading">The section heading.</h2>
  <p class="section-intro">One or two sentences of context.</p>
</div>
```

`.section-header-wide` is the only modifier (960px instead of 820px), for full-width content like the
comparison table.

**Section headings are left aligned everywhere.** There is no centred variant — `.section-header.center`
and `.section-heading.small` have been deleted. Do not add them back. Heroes, section headings, the
manual and the legal pages all share one left edge; a centred block in the middle of that is the
thing that reads as broken.

### Bands, not page backgrounds

Section backgrounds alternate: `.section` is plain, `.section section-soft` is washed. Index runs
plain/soft/plain/soft…, pricing runs soft/plain/soft. Cards are white and sit on the washed bands
where they need contrast.

`<body>` paints nothing except on `manual.html`, where `.manual-page` keeps a washed background
because the manual is one long document rather than a sequence of bands.

### `.shell` and `--content`

`.shell` centres content at `--content` (1180px). Every section's inner wrapper is a `.shell`. Reuse
it rather than setting widths on components.

### A caution about specificity

`.legal-hero p` used to outrank `.eyebrow` and rendered the eyebrow on three pages as ordinary 18px
body copy with a stray 22px top margin. It is now `.legal-hero p:not(.eyebrow)`. When you write a
descendant rule that targets a bare element (`p`, `h2`, `li`) inside a page-specific wrapper, check
that it does not capture a shared component that happens to use the same tag.

---

## Accessibility floor

The site is at WCAG 2.2 AA and should stay there. Two rules cover most of it:

- **Every text/background pair needs 4.5:1** (3:1 for text at 24px or larger, and for UI borders).
  Check in both colour schemes, not just the one your machine is in.
- **A focus ring must be visible on every interactive element.** The global `:focus-visible` style
  draws *outside* the element, so any container with `overflow: hidden` will clip it away completely.
  When that happens, give the element its own inward ring — see the
  `.manual-disclosure summary:focus-visible` rule in `site.css` for the pattern.

---

## Known open issues

A full audit is on file separately. The ones most worth fixing:

- No legal entity name, postal address or contact email appears anywhere on the site, and the GDPR
  data controller is never identified.
- 180° rotation ships in the app but is not mentioned on any marketing page.
- Printing `index.html` loses the workflow steps and the whole limits section to white-on-white text.
- 14 scrollable tables in `manual.html` are not keyboard-reachable.
- `assets/screenshots/store-01-explorer-flyout.png` is 350 KB, roughly 4.4× larger than needed.
  `og.png` is 282 KB and `favicon.ico` is 79 KB, both far heavier than they need to be.
- The home page `<title>` does not contain "Windows 11", which is in almost every real search query
  for this product.
- Three unlinked `SoftwareApplication` JSON-LD nodes with no shared `@id`.
- Eleven visible question-and-answer pairs carry no `FAQPage` markup.
