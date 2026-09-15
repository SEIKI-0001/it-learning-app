# Browser Storage Migration Assessment

## Scope and conclusion

Browser storage is scoped to an origin (scheme, host, and port). Moving the
application from its current Vercel-backed custom-domain origin to a
`workers.dev` hostname or a different production hostname therefore creates a
new, empty `localStorage` and `sessionStorage` namespace. Changing the hosting
provider behind the **existing custom domain** preserves the browser origin and
is the preferred production approach.

The validation Worker is a separate `workers.dev` origin. Its browser storage
must start empty and contain validation-only data; production-origin storage
must not be copied into it. This pilot does not implement or operate a
production browser-data export/import path.

If a production origin change becomes unavoidable, server-backed data must be
synchronized and its restoration verified before cutover. Records that can
contain anonymous, offline, failed, or otherwise unsynchronized work require
either a completed server synchronization path or a one-time, user-authorized
export/import. Any such transfer must be schema-versioned, size-limited,
integrity-checked, allowlisted by key, and validated again on import. Imported
identity hints or acknowledgement fields are never authentication or server
receipt authority.

## Source inventory method

The inventory was regenerated from the Task 6 source commit with:

```sh
rg -n 'localStorage|sessionStorage|fequest:' app components lib -g '*.ts' -g '*.tsx'
```

The scan found 14 persisted key patterns: 12 in `localStorage` and two legacy
patterns in `sessionStorage`. Dynamic suffixes are shown below in angle
brackets. The scan also found `fequest:wordlistProgress:change`,
`fequest:pastExam:change`, `fequest:floating-mochit-change`,
`fequest:celebration`, and `fequest:mochit`; these are DOM event names, not
storage keys. `clearLocalUserData()` deliberately removes every key beginning
with `fequest:` from both browser stores on logout or account change, including
future keys not listed here.

### Synchronization paths found in source

- `fequest:appstate` is written locally by the learning, review, plan, reward,
  avatar, checkpoint, mock-exam, theme-exam, and past-exam flows. Those flows
  synchronize selected fields rather than the browser blob: profile/progress
  use `/api/progress/save`, and answer history uses `/api/answers/save` or the
  assessment attempt pipeline. A normal cookie-session startup reads
  `/api/session/state` and merges local/server AppState once; only merged
  progress is written back by that reconciliation. A LINE `?t=` startup reads
  `/api/session/resolve` and, when the server returns AppState, replaces the
  local AppState instead of merging it. Neither path proves that every local
  answer or other locally changed field reached the server.
- `fequest:wordlistProgress` writes one changed record at a time to
  `/api/word-progress/save`. Quiz/flashcard startup reads
  `/api/word-progress/list` and merges the newer `lastReviewedAt` per word into
  local storage. Local-only records retained by this merge are not subsequently
  uploaded as a batch.
- `fequest:referenceBook` writes immediately on every editor change. Explicit
  save, preset selection, active toggles, and completion toggles call
  `/api/reference-book/save`; `/api/reference-book/get` populates only an empty
  local store. There is no conflict merge and no server-delete call when the
  local book is cleared.
- `fequest:pastExam:*` is the complete local resume frame. Authenticated exam
  activity separately uses `/api/assessment-sessions`,
  `/api/question-attempts/save`, and `/api/progress/save`. These remote rows do
  not reconstruct the local cursor, timer, answer snapshot, or pending
  mutation. Other assessment UIs can additionally write `/api/answers/save`,
  but `PastExamRunner` does not.
- `fequest:assessmentFinalization:v1:*` is a durable request/retry frame for the
  same assessment endpoints. Resume discards locally cached acknowledgements,
  replays the idempotent attempt/session/progress stages, and replaces them with
  fresh server acknowledgements before clearing the key.
- `fequest:dailyReport:*` sends `/api/daily-progress/report` but has no reverse
  read path. The two bootstrap caches have read/refresh paths only
  (`/api/progress/bootstrap` and `/api/ai-grading/bootstrap`). The Today route,
  Mochit preference, and roadmap-reveal keys are device-local only. The two
  `sessionStorage` keys have no current read or write path.

Production save/read routes above resolve the account from a Google or signed
LINE cookie. The one-time `/api/session/resolve` exception validates its token
against the server and issues the signed LINE cookie. A body or local-storage
user ID is not accepted as production authentication. The local
`fequest:userId` value can cause a client to attempt a sync, but it cannot
authorize the request or select its server-side account.

## Key-by-key assessment

| Key or pattern | Store and owner | Authority and server synchronization | May contain unsynchronized work | Loss impact and recovery | Safe to recreate | Production handling if the origin changes |
| --- | --- | --- | --- | --- | --- | --- |
| `fequest:appstate` | `localStorage`; `lib/storage.ts`, reconciled by `lib/useAppState.ts` | Local working copy of profile, progress, and answers. Cookie-session restore uses `/api/session/state` and a one-time merge; LINE token restore uses `/api/session/resolve` and replaces local AppState when a server snapshot exists. Selected fields are written through `/api/progress/save`, `/api/answers/save`, and assessment endpoints; this is not an atomic upload of the local blob, and reconciliation writes back only merged progress. | **Yes.** Anonymous use is local-only, several authenticated writes are fire-and-forget or may fail while the local write succeeds, and local-only answers retained by a merge are not uploaded by reconciliation. | Loss can remove onboarding/profile state, learning progress, answer history, streaks, plans, and review state not present on the server. Authenticated server state can partially or fully restore it; anonymous or failed writes cannot be recovered from the server. Opening a valid LINE token with server state can also replace unsynchronized local AppState. | No, not when local-only or newer than the server copy. | Quiesce writes, reconcile with the authenticated server, verify the exact restored fields on the new origin, and retain the old origin during rollback. If unsynchronized/anonymous state must be retained, include a schema-validated `AppState` in the bounded export; never let embedded identity select the account. |
| `fequest:userId` | `localStorage`; `lib/userSession.ts` and subscriber `lib/pastExam/userIdStore.ts` | Identity **hint only**. `/api/session/state` and token resolution establish the user through server-validated cookies/token; current-session assessment writers explicitly ignore local identity and use the server-confirmed response identity. | It can be stale or forged, but it is not legitimate user work. | Loss only removes a client hint; a valid server session or validated LINE token recreates it. A mismatch triggers clearing local user data to prevent cross-account mixing. | Yes, from server-authenticated resolution. | Do not export/import it. On the destination, resolve the current cookie/token session and write a fresh hint. Imported `fequest:userId` is never accepted as authentication authority or used to bind imported records. |
| `fequest:wordlistProgress` | `localStorage`; `lib/wordlistProgress.ts` | Local-first word progress. Each mutation attempts `/api/word-progress/save` fire-and-forget when a user hint exists. `/api/word-progress/list` is merged into local data by newest `lastReviewedAt`, retaining local-only records. | **Yes.** Anonymous changes and failed fire-and-forget saves stay only in the browser; fetching the DB does not upload retained local-only records by itself. | Loss resets statuses, counts, ratings, and review due dates that are absent or older on the server. Server rows restore through the list endpoint; unsynchronized rows do not. | No, unless loss of the affected learning history is accepted. | Add/execute an acknowledged upload of every local record, then fetch and compare the merged result before cutover. Otherwise export the validated map and rebind/upload it only after destination cookie authentication. |
| `fequest:referenceBook` | `localStorage`; `lib/referenceBook.ts`, synchronized by `lib/referenceBookSync.ts` and `app/settings/reference-book/page.tsx` | Local-first reference-book outline. Explicit save, preset selection, active toggles, and completion toggles call `/api/reference-book/save` fire-and-forget. `/api/reference-book/get` restores the DB book only when no local book exists; it does not merge or overwrite an existing local copy. Clearing the local book has no server-delete path. | **Yes.** Most edits are written locally immediately but are sent to the DB only by explicit actions, and that request can fail. A local-only deletion can also leave an older server copy. | Loss can remove book metadata, notes, chapters, sections, completion flags, keywords, and topic mappings. The last successful DB save restores on an empty origin; later local edits cannot be recovered, while a local deletion can be undone by restoration of the stale server copy. | No, if user-edited content or deletion is newer than the DB. | Require an acknowledged final save (or an explicit, separately designed deletion decision) and compare the intended version/timestamp with the server before cutover. If that cannot be guaranteed, export the normalized book and import only after authenticated account binding. |
| `fequest:progressBootstrapCache` | `localStorage`; `lib/userSession.ts` | 24-hour stale-while-revalidate display cache for integrated status, exam readiness, and plan adjustment. Repopulated by `/api/progress/bootstrap`; envelope includes a user hint for mismatch rejection. | No authoritative work; it can only be stale cached server output. | Loss causes a slower/empty initial display until the bootstrap request completes. No learning record is lost. | Yes. | Do not migrate. Fetch it again after authenticated destination startup. |
| `fequest:aiGradingBootstrapCache` | `localStorage`; `lib/userSession.ts` | 24-hour stale-while-revalidate display cache for billing state, initial question index, and at most 50 grading-history items. Repopulated by `/api/ai-grading/bootstrap`. | No authoritative work; it is a bounded cached server response. | Loss removes only the immediate cached display; the server bootstrap restores current data. | Yes. | Do not migrate. Fetch it again after authenticated destination startup. |
| `fequest:pastExam:<userId\|anon>:<year>:<practice\|exam>` | `localStorage`; `lib/pastExam/session.ts` | Local resume record keyed by local user hint (or `anon`), year, and mode. The complete in-progress position/answers and pending mutation/finalization frame have no full server restore endpoint. Separate authenticated stages use `/api/assessment-sessions`, `/api/question-attempts/save`, and `/api/progress/save`; `PastExamRunner` does not call `/api/answers/save`. | **Yes.** It intentionally preserves in-progress and retryable work locally. `anon` records are never adopted after login. | Loss makes the exam non-resumable and can discard unanswered/unsent or partially finalized work. Server lifecycle, attempt, and progress rows do not reconstruct the browser session. | No for an active or pending session; yes only after verified completion/clear. | Prefer a cutover window with no active sessions and drain/finalize them first. If retention is required, export only schema-valid sessions, preserve the account/mode/year binding, and after import bind them to the currently server-authenticated user rather than trusting the key suffix. Do not promote `anon` state into an account automatically. |
| `fequest:assessmentFinalization:v1:<sessionId>` | `localStorage`; `lib/examReadiness/pendingFinalization.ts` | Durable retry frame for checkpoint, summary, and mock finalization. Remote attempt, completion, and progress stages are replayed idempotently. Locally stored acknowledgement/exposure fields are hints only and are discarded/replaced with fresh server receipts during resume. | **Yes; highest priority.** A record exists specifically because finalization may be incomplete or only partly acknowledged. | Loss can leave attempts, session completion, or derived progress unfinished even when earlier stages reached the server. It cannot be safely reconstructed from display state. | No until every remote stage and the verified local state write complete and the key is cleared. | Block cutover while records exist; resume them under the current authenticated server session and confirm they clear. Only if operationally unavoidable, export schema-valid bounded records and replay them after cookie authentication; never trust imported acknowledgement fields, exposure receipts, user IDs, or derived next state. |
| `fequest:todayRoute:v1` | `localStorage`; `lib/questRoute.ts` | Presentation ordering for the current local date. It is derived from current daily tasks and AppState; there is no server synchronization for the stored order itself. | No authoritative learning work, but the exact same-day ordering exists only locally. | Loss may reorder or omit the continuity of today's displayed route; progress remains in AppState/server data. | Yes. | Do not migrate by default. Rebuild from restored daily tasks/AppState; accept a one-time ordering change. |
| `fequest:dailyReport:<date>` | `localStorage`; `components/learn/DailyProgressReport.tsx` | Local display copy of the day's selected level/reason. Authenticated selection calls `/api/daily-progress/report`, but the component has no endpoint that restores the server row into this local key. | **Yes.** Anonymous selections and failed fire-and-forget requests remain local; even a successful server row is not rehydrated by the current UI. | Loss can make a previously selected day appear unsubmitted on the destination and permit a repeat selection. The server may retain authenticated reports, but current client code does not use them for recovery. | Not safely if preserving exact submitted UI state matters; otherwise the report is overwriteable. | Prefer adding authenticated read/rehydration before an origin change. If exact local/anonymous state is in migration scope, export only valid date/enum records with a retention bound; otherwise explicitly accept display reset while preserving server rows. |
| `fequest:floatingMochit:v1` | `localStorage`; `components/mochit/floatingMochitPreferences.ts` | Device-local visibility and screen position preference. No server synchronization. | No learning work. | Loss restores the visible/default-position preference. | Yes. | Do not migrate by default; let the user set it again. It may be included only as an allowlisted convenience preference in a future export. |
| `fequest:seenRevealedPhases` | `localStorage`; `components/RoadmapMap.tsx` | Device-local list used to decide whether to replay roadmap reveal animation. No server synchronization; actual roadmap progress comes from AppState. | No authoritative work. | Loss may replay an animation; it does not relock phases or change progress. | Yes. | Do not migrate; regenerate from the restored roadmap state on first render. |
| `fequest:pendingResult` | `sessionStorage`; declared/reset in `lib/storage.ts` | Legacy same-tab quest-to-result handoff key. Current source has no reader or writer and only removes it during reset/account clearing. No server synchronization. | No current write path; an older open client could leave transient legacy data. | Loss can only remove a legacy tab-local handoff/display payload. Current code cannot restore or consume it. | Yes for the current application. | Do not migrate; allow the old tab session to expire and discard the key. |
| `fequest:lastResult` | `sessionStorage`; declared/reset in `lib/storage.ts` | Legacy same-tab result redisplay key. Current source has no reader or writer and only removes it during reset/account clearing. No server synchronization. | No current write path; an older open client could leave transient legacy data. | Loss can only remove a legacy tab-local result display payload. Current code cannot restore or consume it. | Yes for the current application. | Do not migrate; allow the old tab session to expire and discard the key. |

## Production decision and safeguards

1. Keep the existing custom domain when routing production from Vercel to
   Cloudflare. This avoids a browser-origin migration entirely while DNS and
   hosting rollback remain separate operational concerns.
2. Treat `workers.dev` as an isolated validation client. Use new validation
   accounts and synthetic learning/exam data only; never seed it from a real
   user's Vercel-origin storage.
3. Before any different-origin production cutover, define retention scope and
   prove acknowledged synchronization for `appstate`, word-list progress, and
   reference-book data. Drain active past exams and assessment finalizations.
4. If unsynchronized records must cross origins, design a separate reviewed
   migration feature with an allowlist, per-key schema versions, total and
   per-record size limits, integrity protection, expiry, duplicate/idempotency
   handling, authenticated account binding, user consent, and rollback. Do not
   copy the whole browser store or accept arbitrary `fequest:*` payloads.
5. Authentication remains cookie/token/server-resolution based. In particular,
   an imported `fequest:userId`, a user ID embedded in a key/payload, or an
   imported finalization acknowledgement must never authorize a request or
   select the account that receives data.

Production export/import design and implementation are outside this vinext
pilot. A production cutover to a changed origin remains blocked until the
retention scope, synchronization evidence, security review, and user-facing
recovery plan are approved.
