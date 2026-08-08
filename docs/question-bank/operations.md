# 問題バンクの運用手順

本番 Supabase に対して手で流す SQL と、その前に確認することをまとめる。
`supabase/schema.sql` は「DB のあるべき姿の宣言」で、既存データを消す操作は置かない方針なので、
データの片付けが要るものはここに書く。

---

## 公式過去問の重複回答の片付け

### なぜ必要か

年度別演習の本番モードは、採点時に100問をまとめて保存する。
採点ボタンの連打・時間切れと手動採点の競合・API の再送で、同じ回答が二重に入りうる。

これを塞ぐため `question_attempts` に部分一意索引を張る:

```
user_id / attempt_group_id / question_id / question_version
（attempt_group_id と question_version が入っている行だけが対象）
```

対象は公式過去問の年度別演習だけ。確認問題・過去問レベル・ミニ模試・模試は
`attempt_group_id` を送らないので対象外で、「同じ問題を何度も解き直す」既存挙動は変わらない。

### 手順

**1. 重複があるか数える（読むだけ・安全）**

```sql
select
  user_id,
  attempt_group_id,
  question_id,
  question_version,
  count(*) as duplicate_count
from public.question_attempts
where attempt_group_id is not null
  and question_version is not null
group by user_id, attempt_group_id, question_id, question_version
having count(*) > 1
order by duplicate_count desc
limit 100;
```

0 行なら **手順 2 を飛ばして** 手順 3 へ進む。

**2. 重複があった場合だけ、最も古い1件を残して消す**

消えるのは「同じ人が・同じ演習1回で・同じ問題の・同じ版に答えた」行の2件目以降だけ。
新しい制約が最初から許さなかった行にあたる。実行前にバックアップを取ること。

```sql
begin;

delete from public.question_attempts a
using public.question_attempts b
where a.attempt_group_id is not null
  and a.question_version is not null
  and a.attempt_group_id = b.attempt_group_id
  and a.user_id          = b.user_id
  and a.question_id      = b.question_id
  and a.question_version = b.question_version
  and a.attempt_id       > b.attempt_id;

-- 消えた件数を確認してから commit する。想定外に多ければ rollback。
commit;
```

**3. 索引を作る**

```sql
create unique index concurrently if not exists
  question_attempts_official_group_unique_idx
  on public.question_attempts(user_id, attempt_group_id, question_id, question_version)
  where attempt_group_id is not null and question_version is not null;
```

`concurrently` はテーブルを長時間ロックしないため。
トランザクションの中では実行できないので、単体で流すこと。
（`supabase/schema.sql` 側は新規DB向けに `concurrently` なしで宣言してある）

**4. 受信時刻の列を足す**

`answered_at` はクライアント申告なので、サーバが受け取った時刻を別に持つ。

**必ず2段階に分けて実行すること。**

```sql
-- 4-1. 既定値を付けずに列を足す（既存行は null のまま）
alter table public.question_attempts
  add column if not exists recorded_at timestamptz;

-- 4-2. そのあとで既定値を付ける（以降の新しい行にだけ now() が入る）
alter table public.question_attempts
  alter column recorded_at set default now();
```

`add column ... default now()` と1文で書いてはいけない。
PostgreSQL 11 以降は、`default` 付きで列を足すと**既存行にもその既定値が入る**。
そうすると、この列ができる前に保存された行に「あとから記録された」という
誤った受信時刻が入り、`answered_at` との突き合わせが意味を失う。

先に既定値なしで足せば既存行は null（＝この列ができる前の行なので受信時刻は不明）のまま残り、
`set default` 以降に入る行だけが実際の受信時刻を持つ。

`not null` にもしない。既存行が null で残る以上、not null 制約は付けられない。

**確認**

```sql
-- 既存行が null のままであること（この列を足す前の行数と一致するはず）
select count(*) as null_rows from public.question_attempts where recorded_at is null;

-- 既定値が付いていること（column_default が now() になっていること）
select column_name, column_default, is_nullable
from information_schema.columns
where table_name = 'question_attempts' and column_name = 'recorded_at';
```

### 確認

```sql
-- 索引ができているか
select indexname from pg_indexes
where tablename = 'question_attempts'
  and indexname = 'question_attempts_official_group_unique_idx';

-- 重複が残っていないか（0 行になること）
select count(*) from (
  select 1 from public.question_attempts
  where attempt_group_id is not null and question_version is not null
  group by user_id, attempt_group_id, question_id, question_version
  having count(*) > 1
) t;
```

---

## 問題を直すときの手順

問題本文（`prompt` / `choices` / `correctChoice` / `explanation`）を変えたら、必ず次を守る。
`npm run validate:question-versions` が Git の比較元と突き合わせて検証する。

1. 本文を直す
2. `version` を +1 する
3. `contentHash` を作り直す
4. `reviewedAt` / `reviewedBy` を更新する
5. `data/question-bank/reviews/<question-id>.json` を新しい version で作り直す

version を据え置くと、別内容の問題への回答が同じ `questionId + version` で集計され、
実測難易度も正答率も壊れる。

出題を止めたいときは、問題を削除せず `status` を `retired` にする
（問題IDは回答履歴のキーなので消さない）。retired にしたら、
確認パック側の参照も別の問題へ差し替えること（`npm run validate:questions` が検出する）。
