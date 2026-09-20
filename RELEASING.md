# Releasing

Reelief ships in batches: several merged PRs accumulate on `master`, then
get cut into one versioned release together, rather than one release per
commit. This document is the checklist for doing that in a way that stays
traceable later — anyone (including a future Claude Code session) should be
able to answer "what shipped in vX.Y.Z, and when" without re-deriving it
from a chat conversation or a scavenger hunt through commit dates.

## Picking the version number

Reelief follows [Semantic Versioning](https://semver.org/) — `MAJOR.MINOR.PATCH`.
Look at the *whole batch* of changes going into the release and find the
most significant kind of change present; that decides the bump. Highest
bump wins, even if only one change in the batch qualifies:

| Batch contains... | Bump | Example |
|---|---|---|
| Anything breaking — data loss, a setting silently resets, a storage schema change old data can't carry forward | **MAJOR** (`2.0.0`) | A full redesign of the storage schema with no migration path |
| Any new user-facing feature, even alongside fixes | **MINOR** (`1.1.0`) | Adding the onboarding tour, adding a new platform |
| Only bug fixes, no new capability | **PATCH** (`1.0.1`) | Fixing a dead button with no new UI |

## The checklist

1. **Track what's going in.** Create (or reuse) a GitHub milestone named
   `vX.Y.Z` and attach every issue/PR intended for this release to it.
   This is the release's scope of record — check it before cutting the
   release to confirm everything intended has actually merged.
2. **Land every PR into `master` first.** Keep using the existing flow:
   feature branch → PR → merge to `master`. No separate release branch —
   at this team size, trunk-based is enough.
3. **Add a `CHANGELOG.md` entry as part of each PR**, under `[Unreleased]`,
   not as a separate step at release time. This is what makes "what's the
   diff for this release" a solved problem instead of something to
   reconstruct from git log afterward.
4. **Bump the version once, right before cutting the release**, in
   `extension/config/product.config.json`'s `"version"` field — the single
   source of truth (see `extension/CLAUDE.md`). Then regenerate the
   manifest:
   ```sh
   node extension/scripts/generate-manifest.mjs
   ```
5. **Rename `[Unreleased]` to `[X.Y.Z] - YYYY-MM-DD`** in `CHANGELOG.md`
   and add a fresh empty `[Unreleased]` section above it.
6. **Commit, then tag the exact commit that ships:**
   ```sh
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin vX.Y.Z
   ```
7. **Cut a GitHub Release from that tag:**
   ```sh
   gh release create vX.Y.Z --generate-notes
   ```
   (`--generate-notes` compiles merged PR titles since the last tag; edit
   by hand if `CHANGELOG.md`'s entry reads better.)
8. **Submit that exact tagged commit's build to the Chrome Web Store.**
   The tag, `manifest.json`'s version, and what the Store shows as the
   live version should always match — that triple is what makes "what's
   live right now" answerable later.

## Note on v1.0.0

`v1.0.0` was never tagged at release time — the version field has read
`"1.0.0"` since the very first commit and was never bumped, so there's no
version-based marker for what actually got submitted to the Chrome Web
Store. It was backfilled after the fact as a best-effort tag on the commit
that best matches the Store listing's "Updated" date, cross-referenced
against master's commit history (see the tag's annotation for the
reasoning). Every release from `v1.1.0` onward follows the checklist above,
so this ambiguity shouldn't recur.
