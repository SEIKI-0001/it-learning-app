# Cloudflare vinext Pilot Operations Log

## Safety boundary

This pilot uses a validation-only Cloudflare Worker. It does not change production DNS, Vercel production, production webhooks, or real-user data.

## Source and tool versions

- Branch: `codex/cloudflare-vinext-pilot-20260906`
- Baseline commit: `37313721db9ac3ff37548eb243b3a8ea9cf0ec4f` (`docs: plan Cloudflare vinext pilot`)
- Source commit check: `e71f6a947f08bb3113e1136f8232f147c01679dd` is an ancestor of the baseline commit (exit status `0`).
- Node.js: `v22.18.0`
- npm: `11.16.0`
- Next.js: `16.2.9`

All npm scripts below were run with `PATH` prefixed by `/Users/seikikobayashi/.npm/_npx/899bf9cc10daad37/node_modules/node/bin`; each command printed `node=v22.18.0` before it ran.

### Isolation and runtime recheck

Commands run before this Fix Round 1 documentation change:

```text
$ git branch --show-current
codex/cloudflare-vinext-pilot-20260906
$ git rev-parse HEAD
7262acb1e5a1f46c54df6844c04b65b14b7c3619
$ node --version
v22.18.0
$ npm --version
11.16.0
$ git status --short
```

`git status --short` returned no output, confirming a clean worktree before this documentation update. The commit above is descended from source commit `e71f6a947f08bb3113e1136f8232f147c01679dd`, as recorded by the initial baseline check (exit status `0`).

## Pre-migration baseline

| Command | Exit status | Result |
| --- | --- | --- |
| `npm run typecheck` | `0` | Passed. |
| `npm run lint` | `0` | Passed. |
| `npm test` | `0` | 150 test files passed; 1,866 tests passed. |
| `npm run build` | `0` | Passed: compiled successfully, TypeScript finished, and 470 static pages were generated. |

The first sandboxed `npm run build` attempt exited `1`: Turbopack could not bind a port (`Operation not permitted`). Re-running the same Node 22 command outside that restriction exited `0`.

`npm run build` also printed a warning that it inferred `/Users/seikikobayashi/Developer/it-learning-app` as the workspace root because it detected both that root's `package-lock.json` and this worktree's `package-lock.json`.

## vinext compatibility check

Not run in this baseline-record task.

## Generated configuration review

Not run in this baseline-record task.

## Local Workers verification

Not run in this baseline-record task.

## Validation deployment

Not run in this baseline-record task.

## Deployed verification matrix

Not run in this baseline-record task.

## vinext versus OpenNext decision

Not run in this baseline-record task.

## Unverified items

- vinext compatibility has not been checked.
- No Workers configuration has been generated or reviewed.
- No local Worker, validation deployment, or deployed-route verification has been run.

## Production prerequisites

No production change was run in this baseline-record task.
