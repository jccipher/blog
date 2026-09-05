# GitHub Wiki contract

Read this reference before changing or publishing Wiki content.

## Repository model

A GitHub Wiki is a separate Git repository named `OWNER/REPO.wiki.git`. It has its own branch, commits, and working tree. Wiki files must never be staged in the project repository.

An enabled Wiki with no first page may return `Repository not found` for its Git remote. GitHub must initialize the Wiki through the repository's Wiki UI before normal clone and push operations are possible.

## Page layout

- Use root-level Markdown files. GitHub derives the page URL from the filename.
- `Home.md` is the entry page and is required for a maintained Markdown Wiki.
- `_Sidebar.md` defines shared navigation. Update it whenever pages are added, renamed, or retired.
- `_Footer.md` is optional. Preserve it when present.
- Use concise, stable, kebab-style filenames such as `Getting-Started.md` and `Deployment.md`.
- Give every normal page one top-level heading that matches its subject. Special files beginning with `_` may omit it.

Prefer navigation links such as:

```markdown
- [[Home]]
- [[Getting Started|Getting-Started]]
- [[Deployment]]
```

Ordinary Markdown links are also valid:

```markdown
[Deployment](Deployment)
[Repository configuration](https://github.com/OWNER/REPO/blob/REVISION/path/to/file)
```

Use a commit SHA in repository source links when the documented behavior depends on an exact revision. Use a branch link only for intentionally evergreen navigation.

## Evidence and wording

- Describe current behavior in the present tense only when current repository evidence supports it.
- Mark proposals, experiments, deprecated paths, and historical behavior explicitly.
- Do not turn an implementation detail into a public guarantee unless project documentation or tests establish that guarantee.
- Copy commands exactly from maintained scripts or configuration when possible. Identify the directory in which each command runs and its prerequisites.
- Never include tokens, cookies, private keys, credential-bearing URLs, local usernames, or absolute machine paths.
- Link to upstream documentation rather than copying large third-party passages.

## Controlled regions

Use controlled regions only for sections intended to be regenerated:

```markdown
<!-- BEGIN CODEX-MAINTAINED: automation-summary -->
Generated, source-backed content.
<!-- END CODEX-MAINTAINED: automation-summary -->
```

Region identifiers use lowercase letters, digits, and hyphens. Markers must be paired, unnested, and unique within a page. Content outside controlled regions remains manually owned unless the user requests a broader edit.

The optional project revision marker is:

```markdown
<!-- codex-project-revision: 0123456789abcdef0123456789abcdef01234567 -->
```

Use one full 40-character commit SHA. Put the marker near the end of `Home.md`. It means the Wiki has been reviewed against that project revision, not merely that an automation ran.

## Link rules

- Every relative Markdown link and `[[Wiki Link]]` must resolve to an existing page or tracked asset.
- Preserve URL fragments for headings, but validate the page target separately.
- External `https://` links may be checked when the task requires freshness; do not fail an otherwise valid offline preview only because an external host is temporarily unavailable.
- Do not publish `file://` URLs or links into `/Users`, `/home`, drive-letter paths, or temporary directories.
- After publication, verify navigation and the changed page URLs in GitHub, because local link validation does not reproduce every rendering behavior of Gollum.

## Change policy

- Add a page only when it has a clear audience and durable purpose.
- Combine overlapping pages rather than creating parallel explanations.
- Treat renames and deletions as breaking documentation changes. Require explicit authorization and update all inbound Wiki links in the same change.
- Avoid cosmetic churn. Preserve headings and anchors when their meaning remains correct.
- If source behavior and existing Wiki prose conflict, report the conflict and update only when the source of truth is clear.

## Publication checklist

Before a Wiki push, confirm all of the following:

1. The target `OWNER/REPO` and Wiki remote are correct.
2. The Wiki clone is current with its remote branch.
3. Every changed claim is backed by the accepted project revision.
4. Manual content is preserved and controlled regions are balanced.
5. `validate_wiki.py` passes.
6. Relevant documented commands were tested when practical.
7. `git diff --check` and the staged diff pass review.
8. The commit contains only intended Wiki files.
9. The push is a normal fast-forward update.
10. Changed GitHub Wiki pages and navigation are verified after the push.
