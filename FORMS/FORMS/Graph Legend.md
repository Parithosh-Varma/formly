---
tags: [legend, graph, moc]
---

# Graph Legend — How the colours work

> Open **Graph view** (`Cmd+G`) with **Show Tags** on. Each colour = a different vault concern.

| Colour | Swatch | Query | Files / Tags |
|--------|--------|-------|--------------|
| 🟪 Lavender | `#b4befe` | `tag:#bug` `path:03-Stress-Test-Report.md` `path:Bugs.md` | [[03-Stress-Test-Report]] [[Bugs]] — critical crashes, `f u c k` bypass |
| 🟩 Green | `#a6e3a1` | `tag:#fix` `path:04-Bug-Fixes.md` | [[04-Bug-Fixes]] — 25+ one-by-one diffs, `PASS` |
| 🟥 Pink | `#f38ba8` | `tag:#audit` `path:06-Frontend-Audit.md` | [[06-Frontend-Audit]] — 40+ `app.js` + 50+ `admin.js` bugs |
| 🟦 Blue | `#89b4fa` | `tag:#context` `path:01-Context.md` | [[01-Context]] — project overview, `FORM/` layout |
| 🩷 Pink (path) | `#f38ba8` | `path:02-Architecture.md` | [[02-Architecture]] — `server.js:1` 749L flow |
| 🟩 Green (path) | `#a6e3a1` | `path:08-Roadmap.md` | [[Index]] `MOC` + [[08-Roadmap]] P0/P1 |
| 🟦 Blue (path) | `#89b4fa` | `path:07-Decisions.md` | [[07-Decisions]] — ADRs 01-10 |
| 🟪 Lavender (path) | `#b4befe` | `path:05-API.md` | [[05-API]] — curl contracts |
| 🟩 Green (path) | `#a6e3a1` | `path:09-Changelog.md` | [[09-Changelog]] — git diffs |
| 🟥 Pink (path) | `#f38ba8` | `path:10-Environment.md` | [[10-Environment]] — `global-env.env` vault |
| 🟦 Blue (path) | `#89b4fa` | `path:Index.md` | [[Index]] — central hub |
| 🟪 Lavender (path) | `#b4befe` | `path:Bugs.md` | — |
| 🟩 Green (tag) | `#a6e3a1` | `tag:#moc` | — |
| 🟥 Pink (tag) | `#f38ba8` | `tag:#architecture` | — |

## Graph Settings (`FORMS/FORMS/.obsidian/graph.json`)

- **Show Tags:** `true` — tags become coloured nodes
- **Show Arrow:** `true` — directed `[[links]]`
- **Text fade:** `-1.2` — labels always visible
- **Node size:** `1.35` — bigger, easier to see
- **Line size:** `1.2` — thicker edges
- **Forces:** `center 0.35` `repel 12.5` `linkDistance 210` — spread-out, not clumped
- **Scale:** `0.92` — fits on screen

## Snippets (`.obsidian/snippets/`)

- `graph-cool.css` — dark radial `#1a1a2e → #070709` background, glow on focused node, `saturate(1.2)`
- `vault-style.css` — headings `blue` left-border, `blockquote` green tint, tags as pills `lavender/green/pink/blue`, `nav-file-title.is-active` blue

Enable them in **Settings → Appearance → CSS snippets** (both are `enabledCssSnippets` in `appearance.json`).

## Tips to make it pop

1. **Filter:** `tag:#bug` in graph search → only lavender nodes
2. **Group by path:** Hover `04-Bug-Fixes.md` → see green cluster linked to pink `Bugs.md` + blue `Frontend-Audit`
3. **Orphans:** on — `09-Changelog` appears even if unlinked
4. **3D?** Install **Graph Analysis** community plugin for 3D force layout (keeps colours)

> Palette: Catppuccin Mocha pastel — lavender `#b4befe`, soft green `#a6e3a1`, muted pink `#f38ba8`, subtle blue `#89b4fa`. Maximum comfort on dark `translucency:false`.