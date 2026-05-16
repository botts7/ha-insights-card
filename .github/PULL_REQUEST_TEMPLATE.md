<!-- Card/panel PR. Quick checklist below. -->

## What this changes

<!-- One paragraph. The "why" matters more than the "what". -->

## How to verify

<!-- Concrete steps a reviewer can follow. Screenshots/GIFs land card-UX PRs much faster. -->

- [ ] Step 1: …
- [ ] Step 2: …

## Checklist

- [ ] **Surgical diff** — no drive-by refactors / style churn in unrelated files.
- [ ] **Built locally** — `npm run build` succeeds with no errors.
- [ ] **No backend assumptions** — relies only on the [stable WS API](https://github.com/botts7/ha-insights/blob/main/docs/ws-api.md).
- [ ] **Cross-browser sanity** — tested on Chrome AND one of Safari/Firefox if it's a layout/CSS change.
- [ ] **Phone-responsive** if it touches the panel layout (the modal stacks vertically below 720 px).
- [ ] **CHANGELOG bumped** under `## [Unreleased]` if user-visible.
- [ ] **`package.json` version bumped** only if this PR is itself the release.

## Related issue / discussion

Closes #…

<!--
Full conventions in the integration repo's CLAUDE.md and docs/.
The pre-merge `/ultrareview` pass typically flags anything missed here.
-->
