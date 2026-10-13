# dsh-ambient-ui — root cause analysis (2026-10-13)

## Error
```
dsh: installation rejected: Plugin dsh-ambient-ui@1.2.0 is incompatible with dsh 0.2.0-rc.2:
peerDependencies {"@deepseek-ai/dsh-client-ui-conversation":"^0.1.2-rc.1",
"@deepseek-ai/dsh-client-ui-settings":"^0.1.2-rc.1","@deepseek-ai/dsh-client-ui-slots":"^0.1.2-rc.1",
"@deepseek-ai/dsh-credentials":"^0.1.2-rc.1","@deepseek-ai/dsh-host-webserver":"^0.1.2-rc.1",
"@deepseek-ai/dsh-session":"^0.1.2-rc.1","@deepseek-ai/dsh-settings":"^0.1.2-rc.1",
"@deepseek-ai/dsh-token-meter":"^0.1.2-rc.1"}
```

## Verified facts
- Runtime (`D:\DeepSeek-harness\resources\app.asar`, path `dsh/node_modules/@deepseek-ai`):
  dsh 0.2.0-rc.2; all eight peers above are **0.2.0-rc.2**.
- npm registry (`registry.npmjs.org`, mirrored on npmmirror): dist-tags.latest = **1.2.0**;
  published versions = 1.0.1, 1.1.0, 1.2.0.
- Repo HEAD `dd912f8` = **v1.3.2**, whose peerDependencies already read `^0.2.0-rc.2` (correct).
- Git tags present: v1.0.1, v1.0.2, v1.1.0, v1.2.0. **No v1.3.x tag.**
- `.github/workflows/publish.yml` triggers only on `push tags: ['v*']`.

## Root cause
Publishing is tag-driven, and the 0.2.0-rc.2 port (v1.3.0/1.3.1/1.3.2) was committed but
**never tagged, so CI never published it**. npm `latest` is therefore still the pre-port
1.2.0, which pins the old `^0.1.2-rc.1` peers and is rejected by the 0.2.0-rc.2 runtime.

## Fix
Tag and push v1.3.2 → publish.yml publishes 1.3.2 → registry `latest` has `^0.2.0-rc.2` peers
→ install/update succeeds.

**Applied:** tag `v1.3.2` → `dd912f8` pushed; workflow run "Publish to npm" completed
successfully; `registry.npmjs.org/dsh-ambient-ui` `dist-tags.latest` is now **1.3.2**
(versions 1.0.1, 1.1.0, 1.2.0, 1.3.2) with all eight peers at `^0.2.0-rc.2`.

## Anti-recurrence
`.github/workflows/auto-tag-release.yml` (added) tags `v<version>` on any push to `master`
that touches `package.json`, so a version bump can no longer sit on the branch untagged
and therefore unpublished.
