# AI blog GitHub delivery

The native nightly entry point is `npm run nightly:native`. It performs a read-only GitHub preflight before the existing production pipeline can mutate the queue, repository, release, or deployment state.

## One-time host setup

1. Authenticate GitHub CLI on the Mac with `gh auth login --hostname github.com --git-protocol https --web`.
2. Confirm the credential is available to non-interactive processes with `npm run github:doctor`.
3. Load `.ai-blog/com.latentx.nightly-blog.plist` with `launchctl bootstrap` for the logged-in user. The local plist points to `scripts/ai-blog/native-nightly.mjs` and runs at 01:00 Asia/Shanghai without `RunAtLoad` catch-up.

The preflight verifies an active `github.com` credential, resolves the authenticated login, confirms that the current checkout is `jccipher/blog`, and requires `WRITE`, `MAINTAIN`, or `ADMIN` repository permission. A failed preflight exits before the production pipeline starts.

## Idempotent release upload

Use a reviewed JSON plan containing `asset`, `bytes`, `sha256`, and `local_file` entries:

```sh
npm run github:upload-audio -- \
  --repo jccipher/blog \
  --tag blog-audio \
  --plan .ai-blog/manual-publication-20260911/audio-upload-plan.json \
  --receipt .ai-blog/manual-publication-20260911/audio-upload-receipt.json
```

The publisher fetches the release once, skips only remote assets whose name, byte count, and SHA-256 all match, rejects collisions before uploading, verifies every upload response, and atomically records each verified asset. If a network result is uncertain, rerunning the same command checks remote state before attempting another upload.

Credentials and receipts stay under the host's GitHub CLI store and ignored `.ai-blog` state; neither belongs in Git.
