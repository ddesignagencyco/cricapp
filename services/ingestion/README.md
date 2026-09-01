# @cricapp/ingestion

Independently deployable from `apps/api`. Polls the provider, **normalizes** to canonical match state, **diffs** against the last snapshot, then persists / publishes only what changed.

If you already have a fuller ingestion tree elsewhere, replace the files in this folder and keep the `test/normalize.test.js` and `test/diff.test.js` names so CI keeps working.

```bash
npm test --workspace=@cricapp/ingestion
```
