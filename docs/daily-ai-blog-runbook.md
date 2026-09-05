# Daily AI Blog GitHub Actions Runbook

This runbook operates `.github/workflows/daily-ai-blog.yml` and `.github/workflows/pages.yml`.

## Required one-time repository configuration

1. In **Settings → Secrets and variables → Actions → Secrets**, create `OPENAI_API_KEY` with a dedicated OpenAI API key. Never use or upload a local Codex `auth.json` file.
2. In **Variables**, create `AI_BLOG_PUBLISH_MODE`:
   - `shadow` during soak testing.
   - `publish` only after shadow runs are accepted.
3. Optional variables:
   - `AI_BLOG_COMMIT_NAME=latentx-ai-blog-bot`
   - `AI_BLOG_COMMIT_EMAIL=41898282+github-actions[bot]@users.noreply.github.com`
   - `AI_BLOG_VERIFY_TIMEOUT_SECONDS=600`
4. In **Settings → Environments**, create:
   - `ai-blog-generation`; no reviewer, optionally move `OPENAI_API_KEY` here instead of repository Secrets.
   - `ai-blog-production`; use a required reviewer during initial production runs.
   - `github-pages`; restrict deployment branches to `main`.
5. In **Settings → Actions → General → Workflow permissions**, allow workflows to request read/write repository permissions. The workflow itself grants `contents: write` only to the isolated publish Job.
6. In **Settings → Pages → Build and deployment**, select **GitHub Actions** as the publishing source.

## First production run

1. Confirm local and remote `main` are synchronized.
2. Open **Actions → Daily AI Blog Digest → Run workflow**.
3. Select `shadow` first. Inspect:
   - generation report artifact;
   - generated patch artifact;
   - validated content and site artifacts;
   - final workflow summary.
4. Run again with `publish`.
5. Approve `ai-blog-production` if the environment still has a reviewer.
6. Confirm `publish`, `deploy_pages`, and `verify_public` are green.
7. Open every English/Chinese URL from the final summary.

## Normal outcomes

- `noop`: both official archives were checked and no unprocessed eligible source exists. No commit or deployment occurs.
- `generated` in shadow mode: validated artifacts exist, but Git and Pages are unchanged.
- `generated` in publish mode: one commit is pushed, the validated site is deployed, and public URLs are verified.

## Failure handling

### Generation/authentication failure

- Confirm `OPENAI_API_KEY` exists and has API quota.
- Do not expose the key in logs or set it as a job-level environment variable.
- Rerun after correcting the Secret. No Git mutation has occurred.

### `SOURCE_DISCOVERY_BLOCKED`

- Inspect the generation report and official archive availability.
- A blocked archive is not a no-op. Rerun when the source is reachable or update the trusted prompt/parser through a normal code review.

### `PATCH_SCOPE_VIOLATION` or validation failure

- Do not publish the artifact.
- Inspect the patch and final Codex result.
- Fix the prompt, schema, or deterministic validator; never loosen the path allowlist merely to pass one run.

### `BASE_MOVED`

- Another commit reached `main` after generation.
- Start a new workflow run. Never force-push or rebase the generated patch automatically.

### Commit succeeded but Pages failed

- Keep the commit.
- Rerun only the failed deploy/verify Jobs from the same run while artifacts remain available.
- Do not generate the same source again or create a duplicate commit.

### Public verification timeout

- Open the Pages deployment record and the commit SHA from the workflow summary.
- If deployment is healthy but propagation was slow, rerun `verify_public`.
- If content is wrong, publish a normal fix/revert commit and let `.github/workflows/pages.yml` deploy it.

## Emergency stop and rollback

- Set `AI_BLOG_PUBLISH_MODE=shadow` to stop scheduled Git and Pages mutation while retaining daily evidence artifacts.
- Disable `Daily AI Blog Digest` only when generation itself must stop.
- Revert bad content with a normal Git commit. Never force-push or reset `main`.
- Before temporarily returning to the local workflow, inspect published `sources[].url` values to prevent duplicate publication.

## Routine maintenance

- Review failed and no-op runs weekly.
- Review OpenAI API usage and a sample of generated articles monthly.
- Rotate the dedicated API key on suspicion of exposure and on the owner's normal credential schedule.
- Update pinned GitHub Action SHAs only through a reviewed dependency PR.
- Keep generation artifacts for 14 days; do not upload credentials, cookies, raw private sessions, or Codex home files.
