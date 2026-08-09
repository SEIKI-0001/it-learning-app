# Multichannel Campaign Launch Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish one evidence-based campaign message to note, LinkedIn, YouTube Shorts, Instagram Reels, and Instagram Stories before the August 10 deadline.

**Architecture:** Create one source copy pack and one 9:16 silent-caption video, then adapt only the length and call to action for each channel. Browser publication is sequential to avoid account and tab confusion; copy and asset preparation may run in parallel with the campaign conversion code.

**Tech Stack:** Markdown, existing Mochit assets, Playwright video capture, bundled Playwright FFmpeg, in-app browser, campaign operations log

## Global Constraints

- Product remains `ITパスポート学習コーチ Pro 6か月` at `3,480円（税込・買い切り）` with no automatic renewal.
- Campaign deadline remains `2026年8月10日23時59分（日本時間）`.
- Campaign URL is `https://it-learning-app.vercel.app/campaign/august-2026`.
- Do not claim guaranteed passing, score increases, customer results, customer counts, or remaining slots.
- Use the existing Mochit asset and actual application/campaign visuals; do not fabricate testimonials or dashboards.
- Do not send unsolicited DMs.
- Do not read browser cookies, passwords, local storage, profiles, or authentication files.
- Stop at a channel’s login page and ask the user to finish login when authentication is required.
- Record every public URL in `docs/operations/2026-august-revenue-campaign-log.md`.
- Do not read or modify `.env` or `.projects/`.

---

### Task 1: Canonical copy pack

**Files:**
- Create: `docs/operations/2026-august-multichannel-copy.md`

**Interfaces:**
- Consumes: the campaign facts and URL from the Global Constraints.
- Produces: the exact note article, LinkedIn post, YouTube title/description, Instagram caption, and Story link text used by later tasks.

- [ ] **Step 1: Create the copy pack with this note article**

Use the title `ITパスポート勉強を再開するための15分学習プラン` and this body:

```markdown
※この記事では、運営している「ITパスポート学習コーチ」の案内を含みます。

ITパスポートの参考書を買ったのに、数章で止まってしまう。そんなとき、足りないのは長い勉強時間より「次に何をするか」の決め方かもしれません。

勉強を再開する日は、まず15分だけ確保します。最初の3分で試験日までの日数を確認し、残り時間を大まかにつかみます。完璧な計画表は作りません。

次の3分で、最近迷った問題を「用語を知らない」「問題文を読み違えた」「計算手順が分からない」の3種類に分けます。分類できないときは、いちばん近いものを一つ選べば十分です。

残りの7分で、その種類の問題を1問だけ解きます。正解したかより、なぜ迷ったかを一行残すことが大切です。たとえば「稼働率の式で、分子と分母を逆にした」のように書きます。これが次回の復習場所になります。

最後の2分で、翌日に見直す問題を一つ予約します。「明日はこの問題の解説を読み直す」と決めて閉じれば、次の開始時に迷いません。

まとめると、15分の使い方は次の4段階です。

1. 試験日までの日数を確認する
2. 迷いを用語・読み違い・計算に分ける
3. 1問解き、迷った理由を一行残す
4. 翌日に見直す問題を一つ予約する

この方法は、無料の公開問題でも実行できます。大切なのは、まとまった時間を待たず、次の一歩を小さく決めることです。

私が運営するITパスポート学習コーチでは、試験日から逆算した「今日やること」、短い確認問題、解説、AI採点を使えます。Pro 6か月は3,480円（税込・買い切り）で、自動更新はありません。2026年8月10日23時59分まで、先着購入者には20分の学習計画相談1回と相談後のLINEフォロー1回を案内しています。合格を保証するサービスではありません。

提供内容、返金条件、購入方法はこちらで確認できます。
https://it-learning-app.vercel.app/campaign/august-2026
```

- [ ] **Step 2: Add the exact LinkedIn post**

```text
ITパスポートの勉強を再開するとき、最初から長い計画を作る必要はありません。

私なら、最初の15分を次の4つに分けます。

1. 試験日までの日数を確認
2. 迷った理由を「用語・読み違い・計算」に分類
3. その種類の問題を1問だけ解く
4. 翌日に見直す問題を一つ予約

正答率だけでなく「なぜ迷ったか」を一行残すと、次に何を復習すべきか決めやすくなります。

この進め方を支援する「ITパスポート学習コーチ」を運営しています。Pro 6か月は3,480円（税込・買い切り）、自動更新なし。8月10日23時59分まで、先着購入者には20分の学習計画相談を案内しています。合格を保証するものではありません。

内容・返金条件：
https://it-learning-app.vercel.app/campaign/august-2026
```

- [ ] **Step 3: Add the exact YouTube and Instagram copy**

YouTube title:

```text
ITパスポート勉強を15分で再開する方法 #Shorts
```

YouTube description:

```text
参考書で止まった日は、①試験日を確認 ②迷いを用語・読み違い・計算に分類 ③1問だけ解く ④翌日の1問を予約。ITパスポート学習コーチ Pro 6か月は3,480円（税込・買い切り）、自動更新なし。8月10日23時59分まで先着購入者へ20分の学習計画相談を案内しています。合格保証ではありません。

内容・返金条件： https://it-learning-app.vercel.app/campaign/august-2026
```

Instagram caption:

```text
参考書で止まった日は、15分だけ再開。

① 試験日までの日数を確認
② 迷いを「用語・読み違い・計算」に分ける
③ 1問だけ解き、迷った理由を一行残す
④ 明日見直す1問を予約

ITパスポート学習コーチ Pro 6か月は3,480円（税込・買い切り）、自動更新なし。8月10日23時59分まで、先着購入者へ20分の学習計画相談を案内しています。合格を保証するものではありません。

詳細はストーリーズのリンクから確認できます。

#ITパスポート #資格勉強 #リスキリング #勉強法
```

Instagram Story link text:

```text
内容・返金条件を見る
```

- [ ] **Step 4: Validate copy facts and lengths**

Run:

```bash
rg -n "3,480円|自動更新なし|8月10日|合格.*保証|https://it-learning-app.vercel.app/campaign/august-2026" docs/operations/2026-august-multichannel-copy.md
wc -m docs/operations/2026-august-multichannel-copy.md
git diff --check
```

Expected: all fixed campaign facts and the URL are present, no guarantee is claimed, and the file has no whitespace errors.

- [ ] **Step 5: Commit the canonical copy**

```bash
git add docs/operations/2026-august-multichannel-copy.md
git commit -m "docs: prepare August multichannel copy"
```

---

### Task 2: Reusable vertical video

**Files:**
- Create: `scripts/campaign/render-august-short.mjs`
- Create temporarily: `/private/tmp/it-learning-app-august-campaign/august-2026-short.webm`
- Create temporarily: `/private/tmp/it-learning-app-august-campaign/august-2026-short.mp4`

**Interfaces:**
- Consumes: `public/characters/mochit/thinking.webp`, `public/characters/mochit/cheering.webp`, a fresh mobile screenshot of `https://it-learning-app.vercel.app/campaign/august-2026`, and the exact three slide strings below.
- Produces: a 1080×1920, 24-second, silent MP4 plus the intermediate WebM.

- [ ] **Step 1: Create a Playwright video renderer**

The script must:

1. Read the two Mochit images and embed them as data URLs.
2. Create `/private/tmp/it-learning-app-august-campaign` if absent.
3. Open `https://it-learning-app.vercel.app/campaign/august-2026` at a 430×932 mobile viewport, wait for the page, and save a full-page screenshot to `/private/tmp/it-learning-app-august-campaign/campaign-mobile.png`.
4. Read that screenshot and embed it as a data URL.
5. Launch Playwright Chromium with a context configured as `viewport: { width: 1080, height: 1920 }` and `recordVideo: { dir: outputDir, size: { width: 1080, height: 1920 } }`.
6. Render one HTML page whose three full-screen slides change at 0, 8, and 16 seconds. The second slide must show the real campaign screenshot inside a rounded phone frame behind or below its headline.
7. Use these exact slide strings:

```text
参考書を開いても
次に何をやるか迷う
```

```text
試験日から逆算して
今日の1問を決める
```

```text
Pro 6か月 3,480円
買い切り・自動更新なし
8月10日 23:59まで
```

8. Keep every slide readable without audio, use the existing brand blue background, white text, and Mochit image, and show `合格保証ではありません` on the final slide.
9. Wait 24 seconds, close the context, and copy the recorded file to `/private/tmp/it-learning-app-august-campaign/august-2026-short.webm`.
10. Print the screenshot path, final WebM path, and byte sizes.

- [ ] **Step 2: Render the WebM**

Run:

```bash
node scripts/campaign/render-august-short.mjs
```

Expected: the WebM exists, is non-empty, and is 1080×1920.

- [ ] **Step 3: Convert to MP4 with the bundled Playwright FFmpeg**

Run:

```bash
/Users/seikikobayashi/Library/Caches/ms-playwright/ffmpeg-1011/ffmpeg-mac -y -i /private/tmp/it-learning-app-august-campaign/august-2026-short.webm -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an /private/tmp/it-learning-app-august-campaign/august-2026-short.mp4
```

Expected: exit 0 and a non-empty MP4 at the exact output path.

- [ ] **Step 4: Verify duration, dimensions, copy, and visual output**

Run:

```bash
/Users/seikikobayashi/Library/Caches/ms-playwright/ffmpeg-1011/ffmpeg-mac -i /private/tmp/it-learning-app-august-campaign/august-2026-short.mp4
rg -n "参考書を開いても|今日の1問を決める|Pro 6か月 3,480円|合格保証ではありません" scripts/campaign/render-august-short.mjs
```

Expected: FFmpeg reports 1080×1920 and approximately 24 seconds; all four required copy fragments are present in the renderer. Extract one frame from each slide and inspect them before publication.

- [ ] **Step 5: Commit only the reusable renderer**

```bash
git add scripts/campaign/render-august-short.mjs
git commit -m "feat: add August short video renderer"
```

Do not commit the temporary WebM or MP4.

---

### Task 3: Sequential publication and campaign logging

**Files:**
- Modify: `docs/operations/2026-august-revenue-campaign-log.md`

**Interfaces:**
- Consumes: Task 1 copy, Task 2 MP4, and the campaign URL.
- Produces: public note, LinkedIn, YouTube Shorts, Instagram Reels URLs; an Instagram Story link placement; and one operations-log row for 2026-08-09.

- [ ] **Step 1: Publish note**

Open note’s article editor, stop for user login if required, paste the exact title/body from Task 1, verify the two disclosures (operator promotion and campaign facts), publish publicly, and record the public article URL.

- [ ] **Step 2: Publish LinkedIn**

Open LinkedIn’s post composer, stop for user login if required, paste the exact LinkedIn copy from Task 1, verify the campaign URL and no guarantee claim, publish publicly, and record the public post URL.

- [ ] **Step 3: Publish YouTube Shorts**

Upload `/private/tmp/it-learning-app-august-campaign/august-2026-short.mp4`, use the exact title and description from Task 1, set the audience truthfully as not made for kids, keep visibility public, publish, and record the public Shorts URL. Do not change channel profile links.

- [ ] **Step 4: Publish Instagram Reel and Story**

Upload the same MP4 as a Reel with the exact caption from Task 1 and publish. Reuse the video in Stories, add the campaign URL using the link sticker with text `内容・返金条件を見る`, and publish. If the browser cannot place the link sticker, stop before publishing the Story and ask the user to place that final sticker; do not publish a Story without its promised link.

- [ ] **Step 5: Verify public deliverables**

Open each public URL in its published view and verify the title/caption, video visibility, campaign facts, and campaign URL. Do not rely only on a composer success toast.

- [ ] **Step 6: Record the 2026-08-09 activity**

Add a new row to `docs/operations/2026-august-revenue-campaign-log.md` with:

- Media: `note・LinkedIn・YouTube・Instagram`
- Activity: `無料記事1件・公開投稿1件・Shorts1件・Reel1件・Story1件`
- Concern: `学習再開、15分学習、次に何をするか決められない`
- Every public URL separated by `<br>`
- Reply, LP view, registration, and Checkout values left as `未確認` until measured
- External purchases and revenue set from a fresh Stripe query, never inferred

- [ ] **Step 7: Commit and push the publication record**

```bash
git add docs/operations/2026-august-revenue-campaign-log.md
git commit -m "docs: record August 9 multichannel launch"
git push origin codex/august-revenue-campaign
```
