# Today単語タスク 4択化・出題数拡大 実装指示

## 目的

前回実装したTodayの単語タスクについて、自己申告型のフラッシュカードではなく、4択問題で実際の正誤を取得する方式へ変更する。

Todayは「短時間で知識を測定し、その結果を次の推薦・復習へつなげる場所」とする。
自由学習用のフラッシュカード機能は残すが、Todayから開始する単語タスクでは使用しない。

既存の以下を最大限再利用すること。

- `components/wordlist/QuizDeck.tsx`
- `lib/wordlist.ts`
- `lib/wordlistProgress.ts`
- `lib/wordStudySession.ts`
- `lib/todayVocab.ts`
- `lib/todayActivitySpec.ts`
- `data/topicWordLinks.ts`
- `daily_study_tasks` を使ったToday Activity同期
- 既存Daily Mission / Daily Quest
- 既存Supabase単語進捗同期

新しい単語問題データや重複した進捗ロジックは作らないこと。

---

## 1. Todayではフラッシュカードではなく4択問題を使う

現在Todayの単語タスクは、

`/glossary/study?mode=task...`

へ遷移し、フラッシュカード形式で「覚えた / あいまい / 覚えていない」を自己申告する。

Todayについてはこの方式を廃止する。

Todayの単語学習は必ず、

**4択問題を解いて実際の正誤を記録する**

方式に変更する。

理由：

- 「覚えた」を押すだけでは理解度の証拠として弱い
- Todayはユーザーの現在地を測定して次の推薦につなげる場所
- 既存 `QuizDeck` / `recordQuizResult()` ですでに客観的な正誤を取得できる

自由学習としての `/glossary/study` のフラッシュカード機能は削除しない。
変更対象はTodayから開始する単語タスクのみ。

---

## 2. Today専用の4択 task modeを追加

現在 `/glossary/quiz` は、

- all
- weak
- today

を持っている。

ここへ、

`mode=task`

を追加する。

Todayからは例えば、

`/glossary/quiz?mode=task&ids=dns,dhcp,nat,...&from=today&task=act:vocab&topicId=...`

のように遷移する。

### task modeの仕様

`ids` で指定された単語だけを出題する。

- weak/due等で再抽選しない
- Todayで固定されたword IDsをそのまま使う
- 順番はシャッフルしてよい
- 1語につき1問
- 各単語について既存 `buildQuizForEntry()` を使って4択問題を生成
- 正誤は既存 `recordQuizResult()` へ記録
- Supabase同期も既存単語進捗フローを利用

TodayActivityの固定・別端末復元のために保存している `wordIds` をSingle Source of Truthとして利用する。

別のToday専用問題データは作らない。

---

## 3. Todayの単語時間を「1語15秒」で計算する

現在 `todayVocab.ts` は約40秒/語としている。

これを変更する。

**1語 = 15秒**

として計算する。

つまり、

- 4語 = 約1分
- 8語 = 約2分
- 12語 = 約3分
- 16語 = 約4分
- 20語 = 約5分

整数分で扱う必要がある場合：

```ts
estimatedMinutes = Math.max(1, Math.ceil(wordCount / 4))
```

とする。

コメント・テスト・UI上の目安時間もこの仕様へ合わせる。

---

## 4. Todayの出題語数を増やす

現在、

- `RELATED_MAX = 5`
- `REVIEW_MAX = 8`

となっているが、15秒/語であれば少なすぎる。

Todayの単語タスクは、

**最大20語程度 / 最大約5分**

を基本上限とする。

### review / due / weak

現在8語上限だが、

**最大20語**

へ変更する。

優先順は維持する。

1. 期限到来
2. weak

20語未満なら上記順で埋める。

候補が少ない場合は無理に20語へ水増ししない。

---

## 5. 関連語については複数Topicから集めてよい

現在は1 Topicの関連語3〜5語程度で終了するケースが多い。

1語15秒なら非常に短いため、CP2〜3の通常関連語については、

**今日学習対象となる複数Topicから関連語を集め、最大20語まで構成してよい。**

優先順位は `upcomingTopicIds` の順番を維持する。

例：

- 今日のTopic A：3語
- 今日のTopic B：3語
- 今日のTopic C：2語
- その他の今日の関連Topic：4語

→ 合計12語・約3分

重複word IDは必ず除外する。

ただし、無関係な単語を20語にするためだけに追加しない。
候補が8語しかなければ8語でよい。

---

## 6. terms_stabilizingは対象Topicを最優先する

`terms_stabilizing` は「そのTopicの用語定着が次へ進むために必要」という意味なので、この優先度は維持する。

まず対象Topicの関連語を全て入れる。

そのTopicの関連語が少なく、まだ時間枠に余裕がある場合のみ、

1. 期限到来語
2. weak語
3. 他の今日Topicの関連語

の順で追加してよい。

ただしタイトルが特定Topicだけを指して不自然になる場合は、

- 「今日の重要用語を確認」
- 「関連用語を4択で確認」

等へ切り替える。

「○○の関連用語」と表示する場合は、そのTopicだけの単語で構成されている場合に限定する。

---

## 7. TodayのCTA・文言も4択前提に変更

Today上の表示を変更する。

例：

旧：

- 「関連用語を固める」
- 「用語を確認する」

新：

- **「関連用語を4択で確認」**

CTA：

- **「4択で確認する」**

reviewなら、

- **「今日の単語復習」**
- 20語・約5分

CTA：

- **「4択で復習する」**

などとする。

「覚える」「覚えた」など、自己申告暗記を想起させるToday文言は使わない。

---

## 8. セッション完了判定

Todayの単語タスクは、

**指定された4択問題を最後まで回答した時点**

でcompletedとする。

正答率100%を完了条件にはしない。

理由：

誤答自体が次回復習のLearning Evidenceになるため。

例えば20問中12問正解でも、

- Todayタスク自体 → completed
- 正解12語 → 成果として記録
- 誤答8語 → weak / 復習対象

とする。

単にページを開いただけではcompletedにしない。

---

## 9. Daily Missionは正解数だけを数える

既存 `completeWordStudySession()` では、

`wordsCleared`

として正解数をDaily Questへ渡している。

この考え方を維持する。

例：

Todayで20語出題
→ 14問正解
→ 単語タスクは完了
→ 単語ミッションには14語分だけ加算

とする。

「20問回答したから20語クリア」にはしない。

---

## 10. Today専用QuizDeck対応

`QuizDeck` にToday task modeを追加する。

必要なpropsは例えば：

- `mode`
- `ids`
- `todayTaskId`
- `topicId`

とする。

task modeでは現在の固定 `SESSION_SIZE = 8` を使わず、

**Todayから渡されたidsの件数をそのままセッション件数**

とする。

最大20語を基本とする。

`todayActivitySpec.ts` は既に最大30 IDsを許容しているため、必要以上に制限を増やさない。

---

## 11. DB上のtask typeも確認する

現在Today vocab activityは `flashcard` として `daily_study_tasks` に保存している。

Todayでは実態が4択になるため、可能であれば、

`vocab_quiz`

等の意味が明確なtask typeへ変更する。

ただし既存DB・既存ユーザーデータとの互換性を確認すること。

既存 `flashcard` データを削除・変換する必要はない。

スキーマ制約等により変更範囲が大きい場合は、今回は `flashcard` を内部互換名として残してもよいが、コードコメントで実態がToday vocab quizであることを明記する。

---

## 12. 必須テスト

### 時間計算

- 1語 → 1分表示
- 4語 → 1分
- 8語 → 2分
- 12語 → 3分
- 20語 → 5分

### Today選出

- review候補20語以上 → 最大20語
- review候補12語 → 12語
- due → weakの順で選ばれる
- 重複word IDが入らない
- 複数upcoming Topicから関連語を集約できる
- 候補が少ない場合に無関係語で水増ししない

### 4択

- Today CTAが `/glossary/quiz?mode=task` へ遷移する
- 指定ids以外を出題しない
- 最大20問を出題できる
- 1語につき1問
- 正解が `recordQuizResult(id, true)` へ反映される
- 不正解が `recordQuizResult(id, false)` へ反映される

### 完了

- 全問回答前はToday taskをcompletedにしない
- 全問回答後は正答率に関係なくcompletedになる
- Daily Missionには正解数のみ加算される
- 誤答語はweak / 次回復習対象になる
- 別端末でも同じword IDsのToday taskを復元できる

---

## 完了後の報告

以下を報告すること。

1. Today単語の最大語数
2. 1語15秒の時間計算を置いた場所
3. Todayの4択task modeの実装箇所
4. Today Activity → Quiz → 単語進捗 → DB のデータフロー
5. 誤答語が次回Todayへ戻る流れ
6. Daily Missionへ何を成果として渡すか
7. tests / typecheck / lint / build結果

Today以外の自由学習用フラッシュカードは残すこと。
