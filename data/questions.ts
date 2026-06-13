import type { Question } from "@/types";

// 基本情報クエスト 7日間の問題データ（全23問）
// Day1〜6: 各3問 / Day7（ボス城）: 5問
// 解説は IT未経験の10代・20代が読んでも拒否反応が出ないよう、
// 専門用語を先に出さず、身近なたとえを入れています。

export const questions: Question[] = [
  // ───────────────────────── Day1: はじまりの村 ─────────────────────────
  {
    id: "d1q1",
    dayNo: 1,
    theme: "ITの全体像",
    stageName: "はじまりの村",
    questionText:
      "コンピュータが何かの作業をするとき、「考えて処理する」役わりを担っているのはどれでしょう？",
    choices: [
      { key: "A", text: "CPU（シーピーユー）" },
      { key: "B", text: "ディスプレイ（画面）" },
      { key: "C", text: "キーボード" },
      { key: "D", text: "スピーカー" },
    ],
    correctChoice: "A",
    explanation:
      "正解！CPUはコンピュータの“頭脳”にあたる部分です。人が頭で考えて答えを出すように、CPUが計算や判断をしています。",
    tag: "CPU",
    difficulty: 1,
  },
  {
    id: "d1q2",
    dayNo: 1,
    theme: "メモリ",
    stageName: "はじまりの村",
    questionText:
      "アプリを開いている間、データを“一時的に置いておく作業スペース”の役わりをするのはどれでしょう？",
    choices: [
      { key: "A", text: "メモリ" },
      { key: "B", text: "CPU" },
      { key: "C", text: "マウス" },
      { key: "D", text: "プリンター" },
    ],
    correctChoice: "A",
    explanation:
      "正解！メモリは“作業中の机の上”のようなものです。机が広いほど、いろいろな物を広げて同時に作業できます。電源を切ると机の上は片づく（消える）のもポイントです。",
    tag: "メモリ",
    difficulty: 1,
  },
  {
    id: "d1q3",
    dayNo: 1,
    theme: "ITの全体像",
    stageName: "はじまりの村",
    questionText:
      "電源を切ってもデータが消えず、写真やアプリを“ずっと保存しておく”場所はどれでしょう？",
    choices: [
      { key: "A", text: "ストレージ（保存用の場所）" },
      { key: "B", text: "メモリ" },
      { key: "C", text: "CPU" },
      { key: "D", text: "Wi-Fi" },
    ],
    correctChoice: "A",
    explanation:
      "正解！ストレージは“引き出しや本棚”のような場所です。メモリ（机の上）は電源を切ると片づきますが、ストレージにしまった物は残り続けます。",
    tag: "メモリ",
    difficulty: 2,
  },

  // ───────────────────────── Day2: 2進数の洞窟 ─────────────────────────
  {
    id: "d2q1",
    dayNo: 2,
    theme: "2進数",
    stageName: "2進数の洞窟",
    questionText:
      "コンピュータがいちばん基本にしている数の表し方はどれでしょう？",
    choices: [
      { key: "A", text: "0と1だけを使う（2進数）" },
      { key: "B", text: "0〜9まで使う（10進数）" },
      { key: "C", text: "アルファベットを使う" },
      { key: "D", text: "絵文字を使う" },
    ],
    correctChoice: "A",
    explanation:
      "正解！コンピュータの中は“スイッチのオン・オフ”で動いています。オフ＝0、オン＝1と考えると、すべて0と1で表せます。これが2進数です。",
    tag: "2進数",
    difficulty: 1,
  },
  {
    id: "d2q2",
    dayNo: 2,
    theme: "ビット",
    stageName: "2進数の洞窟",
    questionText:
      "「0か1か」という、情報のいちばん小さな1つの単位を何と呼ぶでしょう？",
    choices: [
      { key: "A", text: "ビット" },
      { key: "B", text: "メートル" },
      { key: "C", text: "ピクセル" },
      { key: "D", text: "ボルト" },
    ],
    correctChoice: "A",
    explanation:
      "正解！1ビットは“スイッチ1個”分のことです。スイッチ1個ではオン・オフの2通りしか表せませんが、たくさん並べると色々な情報を表せます。",
    tag: "2進数",
    difficulty: 1,
  },
  {
    id: "d2q3",
    dayNo: 2,
    theme: "バイト",
    stageName: "2進数の洞窟",
    questionText:
      "「1バイト」は、何ビットが集まったものでしょう？",
    choices: [
      { key: "A", text: "8ビット" },
      { key: "B", text: "2ビット" },
      { key: "C", text: "10ビット" },
      { key: "D", text: "100ビット" },
    ],
    correctChoice: "A",
    explanation:
      "正解！1バイト＝8ビットです。スイッチ8個をひとまとめにした単位、とイメージしましょう。文字1つ分を表すときによく使われる、身近なまとまりです。",
    tag: "2進数",
    difficulty: 2,
  },

  // ───────────────────────── Day3: ネットワークの森 ─────────────────────────
  {
    id: "d3q1",
    dayNo: 3,
    theme: "IPアドレス",
    stageName: "ネットワークの森",
    questionText:
      "インターネット上で「この機器はここにいますよ」と場所を示す“住所”にあたるものはどれでしょう？",
    choices: [
      { key: "A", text: "IPアドレス" },
      { key: "B", text: "パスワード" },
      { key: "C", text: "バッテリー残量" },
      { key: "D", text: "画面の明るさ" },
    ],
    correctChoice: "A",
    explanation:
      "正解！IPアドレスは、ネット上の“住所”のようなものです。郵便物が住所をたよりに届くように、データもIPアドレスをたよりに正しい相手へ届きます。",
    tag: "ネットワーク",
    difficulty: 1,
  },
  {
    id: "d3q2",
    dayNo: 3,
    theme: "DNS",
    stageName: "ネットワークの森",
    questionText:
      "「example.com」のような文字の住所を、コンピュータ用の住所（IPアドレス）に変換してくれるしくみはどれでしょう？",
    choices: [
      { key: "A", text: "DNS" },
      { key: "B", text: "USB" },
      { key: "C", text: "PDF" },
      { key: "D", text: "GPS" },
    ],
    correctChoice: "A",
    explanation:
      "正解！DNSはスマホの“連絡先（電話帳）”のようなものです。名前を押すだけで電話がかかるように、文字の住所を押すと、コンピュータ用の住所に変換してつないでくれます。",
    tag: "DNS",
    difficulty: 2,
  },
  {
    id: "d3q3",
    dayNo: 3,
    theme: "HTTP/HTTPS",
    stageName: "ネットワークの森",
    questionText:
      "Webサイトを見るときの通信で、中身が暗号化されていて“より安全”なのはどちらでしょう？",
    choices: [
      { key: "A", text: "HTTPS" },
      { key: "B", text: "HTTP" },
      { key: "C", text: "どちらも同じ" },
      { key: "D", text: "どちらも危険" },
    ],
    correctChoice: "A",
    explanation:
      "正解！末尾に“S”が付いたHTTPSは、通信の中身を見られないように包んで送るしくみです。封筒に入れて手紙を送るイメージで、中身をのぞかれにくくなります。",
    tag: "ネットワーク",
    difficulty: 2,
  },

  // ───────────────────────── Day4: セキュリティ城 ─────────────────────────
  {
    id: "d4q1",
    dayNo: 4,
    theme: "パスワード認証",
    stageName: "セキュリティ城",
    questionText:
      "安全なパスワードの作り方として、いちばん良いのはどれでしょう？",
    choices: [
      { key: "A", text: "長くて、他人に推測されにくい組み合わせにする" },
      { key: "B", text: "誕生日など覚えやすい数字だけにする" },
      { key: "C", text: "「password」にする" },
      { key: "D", text: "1234にする" },
    ],
    correctChoice: "A",
    explanation:
      "正解！パスワードは“家の鍵”です。鍵が単純だと簡単に開けられてしまうのと同じで、長く・予測されにくいほど安全になります。",
    tag: "セキュリティ",
    difficulty: 1,
  },
  {
    id: "d4q2",
    dayNo: 4,
    theme: "暗号化",
    stageName: "セキュリティ城",
    questionText:
      "「暗号化」とは、どんなことをするしくみでしょう？",
    choices: [
      { key: "A", text: "決められた相手以外には読めないように、内容を変えて送ること" },
      { key: "B", text: "データを2倍に増やすこと" },
      { key: "C", text: "通信を速くすること" },
      { key: "D", text: "画面を暗くすること" },
    ],
    correctChoice: "A",
    explanation:
      "正解！暗号化は“合言葉を知っている人だけが読める手紙”のようなものです。途中で誰かに見られても、合言葉がなければ意味が分からないので安全です。",
    tag: "セキュリティ",
    difficulty: 2,
  },
  {
    id: "d4q3",
    dayNo: 4,
    theme: "マルウェア",
    stageName: "セキュリティ城",
    questionText:
      "パソコンやスマホに害をあたえる、悪意のあるソフトをまとめて何と呼ぶでしょう？",
    choices: [
      { key: "A", text: "マルウェア" },
      { key: "B", text: "アップデート" },
      { key: "C", text: "ブックマーク" },
      { key: "D", text: "スクリーンショット" },
    ],
    correctChoice: "A",
    explanation:
      "正解！マルウェアは“悪いはたらきをするソフト”の総称です。あやしいリンクや添付ファイルから入ってくることが多いので、不用意に開かないのが基本の防御です。",
    tag: "セキュリティ",
    difficulty: 2,
  },

  // ───────────────────────── Day5: データベース鉱山 ─────────────────────────
  {
    id: "d5q1",
    dayNo: 5,
    theme: "データベース",
    stageName: "データベース鉱山",
    questionText:
      "たくさんのデータを、後から探しやすいように整理してためておくしくみはどれでしょう？",
    choices: [
      { key: "A", text: "データベース" },
      { key: "B", text: "スピーカー" },
      { key: "C", text: "イヤホン" },
      { key: "D", text: "充電器" },
    ],
    correctChoice: "A",
    explanation:
      "正解！データベースは“きちんと整理された巨大な棚”のようなものです。バラバラに置くのではなく、決まった場所にしまうので、欲しい情報をすぐ取り出せます。",
    tag: "SQL",
    difficulty: 1,
  },
  {
    id: "d5q2",
    dayNo: 5,
    theme: "テーブル",
    stageName: "データベース鉱山",
    questionText:
      "データベースの中で、データを“行と列の表”の形で整理したものを何と呼ぶでしょう？",
    choices: [
      { key: "A", text: "テーブル（表）" },
      { key: "B", text: "カメラ" },
      { key: "C", text: "フォルダの色" },
      { key: "D", text: "音量" },
    ],
    correctChoice: "A",
    explanation:
      "正解！テーブルは、表計算アプリで見るような“行と列の表”とほぼ同じイメージです。1行が1件分のデータ（例：1人分の会員情報）にあたります。",
    tag: "SQL",
    difficulty: 2,
  },
  {
    id: "d5q3",
    dayNo: 5,
    theme: "SQL",
    stageName: "データベース鉱山",
    questionText:
      "データベースに「このデータを取り出して」とお願いするときに使う言葉（命令）はどれでしょう？",
    choices: [
      { key: "A", text: "SQL" },
      { key: "B", text: "HTML" },
      { key: "C", text: "Wi-Fi" },
      { key: "D", text: "JPEG" },
    ],
    correctChoice: "A",
    explanation:
      "正解！SQLはデータベースへの“注文の仕方”です。お店で「これをください」と注文するように、SQLで「この条件のデータをください」とお願いします。",
    tag: "SQL",
    difficulty: 2,
  },

  // ───────────────────────── Day6: アルゴリズム迷宮 ─────────────────────────
  {
    id: "d6q1",
    dayNo: 6,
    theme: "変数",
    stageName: "アルゴリズム迷宮",
    questionText:
      "プログラムの中で、数や文字を“一時的に入れておく箱”のようなものを何と呼ぶでしょう？",
    choices: [
      { key: "A", text: "変数" },
      { key: "B", text: "電源" },
      { key: "C", text: "画面" },
      { key: "D", text: "ケーブル" },
    ],
    correctChoice: "A",
    explanation:
      "正解！変数は“名前をつけた箱”のイメージです。「score」という箱に点数を入れておけば、あとから何度でもその中身を使えます。",
    tag: "アルゴリズム",
    difficulty: 1,
  },
  {
    id: "d6q2",
    dayNo: 6,
    theme: "条件分岐",
    stageName: "アルゴリズム迷宮",
    questionText:
      "「もし〇〇なら こうする、ちがうなら ああする」という、状況で動きを変えるしくみを何と呼ぶでしょう？",
    choices: [
      { key: "A", text: "条件分岐（もし〜なら）" },
      { key: "B", text: "充電" },
      { key: "C", text: "音量調整" },
      { key: "D", text: "再起動" },
    ],
    correctChoice: "A",
    explanation:
      "正解！条件分岐は、毎朝の「もし雨なら傘を持つ、晴れなら持たない」という判断と同じ考え方です。コンピュータも“もし〜なら”で動きを変えています。",
    tag: "アルゴリズム",
    difficulty: 2,
  },
  {
    id: "d6q3",
    dayNo: 6,
    theme: "繰り返し",
    stageName: "アルゴリズム迷宮",
    questionText:
      "「同じ作業を、決めた回数だけ何度もやる」しくみを何と呼ぶでしょう？",
    choices: [
      { key: "A", text: "繰り返し（ループ）" },
      { key: "B", text: "暗号化" },
      { key: "C", text: "保存" },
      { key: "D", text: "印刷" },
    ],
    correctChoice: "A",
    explanation:
      "正解！繰り返しは“筋トレを10回やる”のようなものです。同じ動きをまとめて指示できるので、長い作業も短い命令で書けます。",
    tag: "アルゴリズム",
    difficulty: 2,
  },

  // ───────────────────────── Day7: ボス城（総復習 / 5問）─────────────────────────
  {
    id: "d7q1",
    dayNo: 7,
    theme: "CPU",
    stageName: "ボス城",
    questionText:
      "【復習】計算や判断をして、コンピュータ全体の処理を担う“頭脳”はどれでしたか？",
    choices: [
      { key: "A", text: "CPU" },
      { key: "B", text: "スピーカー" },
      { key: "C", text: "バッテリー" },
      { key: "D", text: "Webカメラ" },
    ],
    correctChoice: "A",
    explanation:
      "正解！CPUは“頭脳”でしたね。Day1で出てきた内容です。ここまで覚えていれば、しっかり冒険が身についています。",
    tag: "CPU",
    difficulty: 1,
  },
  {
    id: "d7q2",
    dayNo: 7,
    theme: "DNS",
    stageName: "ボス城",
    questionText:
      "【復習】「文字の住所」を「コンピュータ用の住所（IPアドレス）」に変換するしくみはどれでしたか？",
    choices: [
      { key: "A", text: "DNS" },
      { key: "B", text: "CPU" },
      { key: "C", text: "SQL" },
      { key: "D", text: "メモリ" },
    ],
    correctChoice: "A",
    explanation:
      "正解！DNSは“連絡先（電話帳）”のたとえでしたね。名前から正しいつなぎ先を見つけてくれます。",
    tag: "DNS",
    difficulty: 2,
  },
  {
    id: "d7q3",
    dayNo: 7,
    theme: "セキュリティ",
    stageName: "ボス城",
    questionText:
      "【復習】通信の中身を、決めた相手以外には読めないようにするしくみはどれでしたか？",
    choices: [
      { key: "A", text: "暗号化" },
      { key: "B", text: "繰り返し" },
      { key: "C", text: "変数" },
      { key: "D", text: "テーブル" },
    ],
    correctChoice: "A",
    explanation:
      "正解！暗号化は“合言葉を知る人だけが読める手紙”でしたね。安全な通信を支える大切なしくみです。",
    tag: "セキュリティ",
    difficulty: 2,
  },
  {
    id: "d7q4",
    dayNo: 7,
    theme: "SQL",
    stageName: "ボス城",
    questionText:
      "【復習】データベースに「このデータをください」とお願いするときに使う言葉はどれでしたか？",
    choices: [
      { key: "A", text: "SQL" },
      { key: "B", text: "HTTPS" },
      { key: "C", text: "ビット" },
      { key: "D", text: "マルウェア" },
    ],
    correctChoice: "A",
    explanation:
      "正解！SQLは“注文の仕方”でしたね。条件を伝えて、ほしいデータだけを取り出せます。",
    tag: "SQL",
    difficulty: 2,
  },
  {
    id: "d7q5",
    dayNo: 7,
    theme: "アルゴリズム",
    stageName: "ボス城",
    questionText:
      "【復習】「もし雨なら傘を持つ、晴れなら持たない」のように、状況で動きを変えるしくみはどれでしたか？",
    choices: [
      { key: "A", text: "条件分岐" },
      { key: "B", text: "IPアドレス" },
      { key: "C", text: "バイト" },
      { key: "D", text: "ストレージ" },
    ],
    correctChoice: "A",
    explanation:
      "正解！条件分岐でしたね。これでボス城クリアです。7日間の冒険、本当におつかれさまでした！",
    tag: "アルゴリズム",
    difficulty: 3,
  },
];
