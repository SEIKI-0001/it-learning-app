import type { VisualLearningSpec } from "@/types/content";

export const topicVisualLearning: Partial<Record<string, VisualLearningSpec>> = {
  "tech-computer-core": {
    lead: "パソコンの中を「勉強机」に置き換えると、CPU・メモリ・ストレージの違いがすぐ見えます。",
    illustration: {
      type: "analogyScene",
      title: "机の上で考えるコンピュータ",
      items: [
        { emoji: "🧠", title: "CPU", body: "問題を解く人。計算・判断を担当する。" },
        { emoji: "🧾", title: "メモリ", body: "今広げている机。広いほど同時に作業しやすい。" },
        { emoji: "🗄️", title: "ストレージ", body: "本棚や引き出し。電源を切っても残る保存場所。" },
      ],
    },
    interactive: {
      type: "tapReveal",
      title: "どこが何をする？",
      items: [
        { emoji: "🧠", label: "考える", title: "CPU", body: "アプリの命令を処理し、計算や判断を進めます。" },
        { emoji: "🧾", label: "一時置き", title: "メモリ", body: "作業中のデータを置く場所。電源を切ると消えやすいです。" },
        { emoji: "🗄️", label: "長く保存", title: "ストレージ", body: "写真・アプリ・ファイルを保存します。電源を切っても残ります。" },
      ],
    },
    miniGame: {
      type: "matching",
      title: "役割をつなげる",
      prompt: "言葉とイメージを合わせて、3つの違いを固めます。",
      pairs: [
        { left: "CPU", right: "計算・判断する頭脳", explanation: "CPUは処理する部品です。" },
        { left: "メモリ", right: "作業中だけ広げる机", explanation: "メモリは一時的な作業場所です。" },
        { left: "ストレージ", right: "電源を切っても残る本棚", explanation: "ストレージは長期保存の場所です。" },
      ],
    },
  },

  "tech-os-software-hardware": {
    lead: "スマホを3層で見ると、ハードウェア・OS・アプリの関係が整理できます。",
    diagram: {
      type: "layers",
      title: "スマホの3層",
      layers: [
        { emoji: "📱", title: "アプリ", body: "SNS・ゲーム・表計算など、ユーザーが目的に合わせて使うソフト。" },
        { emoji: "⚙️", title: "OS", body: "画面、ファイル、メモリ、機器をまとめて管理する土台。" },
        { emoji: "🔩", title: "ハードウェア", body: "CPU、メモリ、画面、カメラなど目に見える機械。" },
      ],
    },
    interactive: {
      type: "tapReveal",
      title: "アプリが動くまでの仲介役",
      items: [
        { emoji: "🔩", label: "機械", title: "ハードウェア", body: "物理的な部品。これだけではSNSアプリの操作はできません。" },
        { emoji: "⚙️", label: "土台", title: "OS", body: "アプリのお願いを機械に伝え、資源をうまく配ります。" },
        { emoji: "📱", label: "目的", title: "アプリ", body: "ユーザーが直接使うソフト。OSの上で動きます。" },
      ],
    },
    miniGame: {
      type: "classification",
      title: "これはどの層？",
      prompt: "身近な例を3つの層に分けます。",
      buckets: [
        { id: "hardware", label: "ハードウェア" },
        { id: "os", label: "OS" },
        { id: "app", label: "アプリ" },
      ],
      cards: [
        { label: "iOS / Android", belongsTo: "os", explanation: "スマホ全体を管理する基本ソフトです。" },
        { label: "カメラのレンズ", belongsTo: "hardware", explanation: "物理的に存在する部品です。" },
        { label: "SNSアプリ", belongsTo: "app", explanation: "OS上で動く利用目的別のソフトです。" },
      ],
    },
  },

  "tech-network-address": {
    lead: "Webサイトを開く前に、文字の住所を番号の住所へ変換する小さな旅があります。",
    animation: {
      type: "stepFlow",
      title: "名前から住所を探す流れ",
      caption: "DNSは、ドメイン名をIPアドレスへ変換する電話帳役です。",
      steps: [
        { emoji: "⌨️", label: "example.com と入力", body: "人が覚えやすい文字の住所を使う。" },
        { emoji: "📒", label: "DNSへ問い合わせ", body: "この名前の番号の住所はどれ？と聞く。" },
        { emoji: "🏠", label: "IPアドレスを受け取る", body: "サーバの番号の住所が返ってくる。" },
        { emoji: "🌐", label: "サーバへ接続", body: "その番号を使って目的地へ向かう。" },
      ],
    },
    miniGame: {
      type: "matching",
      title: "ネット住所の役割合わせ",
      prompt: "名前・住所・電話帳の関係を合わせます。",
      pairs: [
        { left: "ドメイン名", right: "人が読みやすいサイト名", explanation: "example.com のような文字の名前です。" },
        { left: "IPアドレス", right: "機器を見分ける番号の住所", explanation: "通信の相手を番号で特定します。" },
        { left: "DNS", right: "名前から番号を引く電話帳", explanation: "ドメイン名をIPアドレスに変換します。" },
      ],
    },
  },

  "tech-http-https": {
    lead: "同じWeb通信でも、はがきで送るか封筒に入れるかで見え方が変わります。",
    diagram: {
      type: "comparison",
      title: "HTTPとHTTPSの見え方",
      headers: ["観点", "HTTP", "HTTPS"],
      rows: [
        { label: "通信", cells: ["Webを見るルール", "Webを見るルール + 暗号化"] },
        { label: "たとえ", cells: ["はがき", "封筒に入れた手紙"] },
        { label: "向く場面", cells: ["公開情報を見る", "ログイン・購入・個人情報入力"] },
      ],
    },
    interactive: {
      type: "tapReveal",
      title: "Sが付くと何が変わる？",
      items: [
        { emoji: "📮", label: "HTTP", title: "中身が見えやすい通信", body: "暗号化が前提ではないため、重要情報を送る場面には向きません。" },
        { emoji: "✉️", label: "HTTPS", title: "暗号化されたWeb通信", body: "SSL/TLSで中身を読み取りにくくします。" },
        { emoji: "🔐", label: "注意", title: "HTTPSだけで本物とは限らない", body: "暗号化は大切ですが、詐欺サイトかどうかはURLや内容も確認します。" },
      ],
    },
    miniGame: {
      type: "classification",
      title: "HTTPSを強く意識する場面",
      prompt: "送る情報の重さで分けます。",
      buckets: [
        { id: "must", label: "HTTPS必須" },
        { id: "light", label: "公開情報中心" },
      ],
      cards: [
        { label: "パスワードを入力する", belongsTo: "must", explanation: "ログイン情報は暗号化された通信で送る必要があります。" },
        { label: "ニュース記事を読む", belongsTo: "light", explanation: "公開情報中心ですが、現在は多くのサイトがHTTPSを使います。" },
        { label: "クレジットカード情報を送る", belongsTo: "must", explanation: "重要な個人情報なのでHTTPSを確認します。" },
      ],
    },
  },

  "tech-security-cia": {
    lead: "セキュリティは「秘密」だけではありません。正しさと使えることも同じくらい大切です。",
    diagram: {
      type: "matrix",
      title: "何が損なわれた？",
      columns: ["守れている状態", "損なわれた例"],
      rows: ["機密性", "完全性", "可用性"],
      cells: [
        { row: "機密性", column: "守れている状態", emoji: "🔒", title: "見てよい人だけ", body: "アクセス権のある人だけが見られる。" },
        { row: "機密性", column: "損なわれた例", emoji: "👀", title: "漏えい", body: "関係ない人に情報を見られる。" },
        { row: "完全性", column: "守れている状態", emoji: "✅", title: "正しいまま", body: "内容が勝手に変わらない。" },
        { row: "完全性", column: "損なわれた例", emoji: "✏️", title: "改ざん", body: "金額や記録が書き換わる。" },
        { row: "可用性", column: "守れている状態", emoji: "⚡", title: "使える", body: "必要なときにサービスが動く。" },
        { row: "可用性", column: "損なわれた例", emoji: "🛑", title: "停止", body: "障害や攻撃で使えない。" },
      ],
    },
    miniGame: {
      type: "classification",
      title: "CIAに分類する",
      prompt: "できごとを3要素へ分けます。",
      buckets: [
        { id: "c", label: "機密性" },
        { id: "i", label: "完全性" },
        { id: "a", label: "可用性" },
      ],
      cards: [
        { label: "会員情報が外部に漏れた", belongsTo: "c", explanation: "見てはいけない人に見られたので機密性です。" },
        { label: "注文金額が勝手に書き換わった", belongsTo: "i", explanation: "内容の正しさが壊れたので完全性です。" },
        { label: "サービスが落ちて使えない", belongsTo: "a", explanation: "必要なときに使えないので可用性です。" },
      ],
    },
  },

  "tech-public-key-crypto": {
    lead: "公開鍵暗号は、みんなに配る鍵と自分だけの鍵を分けることで、安全に受け渡しできます。",
    illustration: {
      type: "analogyScene",
      title: "郵便受けと専用の開け鍵",
      caption: "公開鍵は入れるために配れる鍵、秘密鍵は開けるために自分だけが持つ鍵です。",
      items: [
        { emoji: "📬", title: "公開鍵", body: "相手に渡してよい。メッセージを鍵付き箱に入れる役。" },
        { emoji: "🗝️", title: "秘密鍵", body: "自分だけが持つ。鍵付き箱を開けて読む役。" },
        { emoji: "✍️", title: "デジタル署名", body: "秘密鍵で本人らしさを示し、公開鍵で確認してもらう。" },
      ],
    },
    animation: {
      type: "stepFlow",
      title: "公開鍵で閉めて、秘密鍵で開ける",
      steps: [
        { emoji: "📣", label: "公開鍵を配る", body: "公開鍵は相手に渡してもよい鍵です。" },
        { emoji: "🔐", label: "相手が暗号化", body: "相手は公開鍵を使って中身を読めない形にします。" },
        { emoji: "🗝️", label: "自分だけが復号", body: "秘密鍵を持つ本人だけが元に戻せます。" },
      ],
    },
    miniGame: {
      type: "matching",
      title: "鍵の役割合わせ",
      prompt: "公開鍵と秘密鍵の使い分けを合わせます。",
      pairs: [
        { left: "公開鍵", right: "相手に渡してよい鍵", explanation: "暗号化や署名確認で使われます。" },
        { left: "秘密鍵", right: "本人だけが守る鍵", explanation: "復号や署名作成で使われます。" },
        { left: "デジタル署名", right: "本人性と改ざんなしを確認", explanation: "公開鍵暗号の考え方を応用します。" },
      ],
    },
  },

  "tech-keys": {
    lead: "DBMSの表は、主キーで1行を見分け、外部キーで別の表とつながります。",
    diagram: {
      type: "relationship",
      title: "会員表と注文表のつながり",
      nodes: [
        { id: "members", emoji: "👤", label: "会員テーブル", body: "会員IDが主キー。1人を一意に見分ける。" },
        { id: "orders", emoji: "🧾", label: "注文テーブル", body: "注文IDが主キー。会員IDを外部キーとして持つ。" },
      ],
      links: [
        { from: "orders", to: "members", label: "注文の会員IDが、会員表の会員IDを参照" },
      ],
    },
    interactive: {
      type: "tapReveal",
      title: "キーの見分け方",
      items: [
        { emoji: "🔑", label: "主キー", title: "その表の1行を見分ける", body: "重複しない、空欄にしない、が基本です。" },
        { emoji: "🔗", label: "外部キー", title: "別の表へつなぐ", body: "他テーブルの主キーを参照して関係を表します。" },
        { emoji: "🧰", label: "DBMS", title: "データベースを管理する仕組み", body: "データの保存、検索、整合性の管理を担当します。" },
      ],
    },
    miniGame: {
      type: "classification",
      title: "主キー・外部キーを分類",
      prompt: "注文管理の例で分けます。",
      buckets: [
        { id: "pk", label: "主キー" },
        { id: "fk", label: "外部キー" },
        { id: "other", label: "ただの項目" },
      ],
      cards: [
        { label: "会員テーブルの会員ID", belongsTo: "pk", explanation: "会員1人を見分ける主キーです。" },
        { label: "注文テーブルの会員ID", belongsTo: "fk", explanation: "会員表を参照する外部キーです。" },
        { label: "会員の好きな色", belongsTo: "other", explanation: "重複しやすく、1行を一意に見分けられません。" },
      ],
    },
  },

  "tech-cloud-models": {
    lead: "クラウドは「どこまで用意済みか」でSaaS・PaaS・IaaSを見分けます。",
    diagram: {
      type: "layers",
      title: "借りる範囲の違い",
      layers: [
        { emoji: "🍱", title: "SaaS: 完成アプリを使う", body: "メール、会計、チャットなどをそのまま使う。" },
        { emoji: "🍳", title: "PaaS: 作る土台を借りる", body: "アプリを作るための実行環境やDBを借りる。" },
        { emoji: "🧱", title: "IaaS: 基盤部品を借りる", body: "サーバ、ネットワーク、ストレージに近い部分を借りる。" },
      ],
    },
    miniGame: {
      type: "classification",
      title: "SaaS・PaaS・IaaSに分類",
      prompt: "どこまで完成しているかで分けます。",
      buckets: [
        { id: "saas", label: "SaaS" },
        { id: "paas", label: "PaaS" },
        { id: "iaas", label: "IaaS" },
      ],
      cards: [
        { label: "ブラウザで使うメールサービス", belongsTo: "saas", explanation: "完成したアプリを利用します。" },
        { label: "アプリ実行環境とDBを借りる", belongsTo: "paas", explanation: "開発の土台が用意されています。" },
        { label: "仮想サーバを借りてOSから設定", belongsTo: "iaas", explanation: "基盤に近い資源を借ります。" },
      ],
    },
  },

  "mgmt-pm-qcd": {
    lead: "プロジェクトは、良さ・お金・期限の3つを同時に見ながら進めます。",
    interactive: {
      type: "tapReveal",
      title: "QCDの引っぱり合い",
      items: [
        { emoji: "⭐", label: "品質", title: "Quality", body: "できあがりの良さ。高めるほど時間や費用が増えやすいです。" },
        { emoji: "💰", label: "費用", title: "Cost", body: "使える予算。削りすぎると品質や納期に影響します。" },
        { emoji: "📅", label: "納期", title: "Delivery", body: "いつまでに届けるか。急ぐほど調整が必要になります。" },
      ],
    },
    miniGame: {
      type: "classification",
      title: "QCDに分類",
      prompt: "会話の中でどの観点が問題になっているか分けます。",
      buckets: [
        { id: "q", label: "品質" },
        { id: "c", label: "費用" },
        { id: "d", label: "納期" },
      ],
      cards: [
        { label: "バグが多くて使いにくい", belongsTo: "q", explanation: "できばえの問題なので品質です。" },
        { label: "予算を超えそう", belongsTo: "c", explanation: "お金の問題なので費用です。" },
        { label: "公開日に間に合わない", belongsTo: "d", explanation: "期限の問題なので納期です。" },
      ],
    },
  },

  "strat-swot": {
    lead: "SWOTは、内側/外側とプラス/マイナスの2軸で状況を4つに分けます。",
    diagram: {
      type: "matrix",
      title: "SWOTの4マス",
      columns: ["プラス", "マイナス"],
      rows: ["内部環境", "外部環境"],
      cells: [
        { row: "内部環境", column: "プラス", emoji: "💪", title: "Strength", body: "自社の強み。活かせる武器。" },
        { row: "内部環境", column: "マイナス", emoji: "⚠️", title: "Weakness", body: "自社の弱み。補うべき課題。" },
        { row: "外部環境", column: "プラス", emoji: "🌱", title: "Opportunity", body: "市場の追い風。つかみたい機会。" },
        { row: "外部環境", column: "マイナス", emoji: "🌪️", title: "Threat", body: "外の向かい風。備えたい脅威。" },
      ],
    },
    miniGame: {
      type: "classification",
      title: "SWOTに分類",
      prompt: "カフェを例に4マスへ分けます。",
      buckets: [
        { id: "s", label: "強み" },
        { id: "w", label: "弱み" },
        { id: "o", label: "機会" },
        { id: "t", label: "脅威" },
      ],
      cards: [
        { label: "店員の接客が評判", belongsTo: "s", explanation: "自分たちの内側にあるプラスなので強みです。" },
        { label: "駅前に競合店が増えた", belongsTo: "t", explanation: "外部環境のマイナスなので脅威です。" },
        { label: "若者向けドリンク需要が伸びている", belongsTo: "o", explanation: "外部環境のプラスなので機会です。" },
        { label: "席数が少ない", belongsTo: "w", explanation: "自分たちの内側にあるマイナスなので弱みです。" },
      ],
    },
  },
};
