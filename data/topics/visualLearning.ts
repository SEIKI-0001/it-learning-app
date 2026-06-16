import type { VisualLearningSpec } from "@/types/content";

export const topicVisualLearning: Partial<Record<string, VisualLearningSpec>> = {
  "tech-computer-core": {
    lead: "役割名を覚える前に、保存されたデータが読み出され、処理され、必要なら保存される流れを見ます。",
    diagram: {
      type: "mechanismFlow",
      title: "保存済みデータが処理される流れ",
      actors: [
        {
          id: "storage",
          label: "ストレージ",
          role: "長く保存する場所",
          detail: "写真、アプリ、ファイルなどを電源オフ後も持つ。",
        },
        {
          id: "memory",
          label: "メモリ",
          role: "作業中だけ広げる場所",
          detail: "今使うデータを一時的に置く。広いほど同時作業しやすい。",
        },
        {
          id: "cpu",
          label: "CPU",
          role: "計算・判断する場所",
          detail: "命令を読んで処理する。保存場所ではない。",
        },
      ],
      steps: [
        {
          from: "storage",
          to: "memory",
          label: "必要なデータを読み出す",
          body: "保存場所から、今使う分だけ作業場所へ出す。",
        },
        {
          from: "memory",
          to: "cpu",
          label: "CPUへ渡して処理する",
          body: "CPUはメモリ上のデータを使って計算や判断をする。",
        },
        {
          from: "cpu",
          to: "memory",
          label: "処理結果を一時的に置く",
          body: "すぐ使う結果はメモリに戻る。",
        },
        {
          from: "memory",
          to: "storage",
          label: "残したい結果を保存する",
          body: "電源を切っても残したいものだけストレージに書き込む。",
        },
      ],
    },
    miniGame: {
      type: "matching",
      title: "役割をつなげる",
      prompt: "流れを見たあと、3つの担当を合わせます。",
      pairs: [
        { left: "CPU", right: "計算・判断する", explanation: "CPUは命令を処理する担当です。" },
        { left: "メモリ", right: "作業中のデータを置く", explanation: "メモリは一時的な作業場所です。" },
        { left: "ストレージ", right: "電源オフ後も保存する", explanation: "ストレージは長期保存の担当です。" },
      ],
    },
  },

  "tech-os-software-hardware": {
    lead: "OSは単なるアプリではなく、アプリのお願いを機械へ通す仲介役です。",
    diagram: {
      type: "mechanismFlow",
      title: "アプリの操作がハードウェアへ届く流れ",
      actors: [
        {
          id: "app",
          label: "アプリケーション",
          role: "利用者の目的を実行する",
          detail: "SNS、ブラウザ、表計算など。",
        },
        {
          id: "os",
          label: "OS",
          role: "アプリと機械の間を管理する",
          detail: "メモリ、ファイル、画面、入力装置の使い方を調整する。",
        },
        {
          id: "hardware",
          label: "ハードウェア",
          role: "実際に動く機械部品",
          detail: "CPU、メモリ、画面、カメラ、キーボードなど。",
        },
      ],
      steps: [
        {
          from: "app",
          to: "os",
          label: "アプリがOSへお願いする",
          body: "ファイルを開く、画面に出す、通信するなどをOSに依頼する。",
        },
        {
          from: "os",
          to: "hardware",
          label: "OSが機械の使い方を調整する",
          body: "複数アプリが同じ部品を奪い合わないように管理する。",
        },
        {
          from: "hardware",
          to: "os",
          label: "機械の結果がOSへ戻る",
          body: "入力、保存結果、画面表示に必要な情報が返る。",
        },
        {
          from: "os",
          to: "app",
          label: "OSがアプリへ結果を渡す",
          body: "利用者はアプリ画面で結果を見る。",
        },
      ],
    },
    miniGame: {
      type: "classification",
      title: "これはどの担当？",
      prompt: "アプリ、OS、ハードウェアに分けます。",
      buckets: [
        { id: "app", label: "アプリ" },
        { id: "os", label: "OS" },
        { id: "hardware", label: "ハードウェア" },
      ],
      cards: [
        { label: "ブラウザ", belongsTo: "app", explanation: "利用者の目的に合わせて使うソフトです。" },
        { label: "Android / iOS", belongsTo: "os", explanation: "スマホ全体を管理する基本ソフトです。" },
        { label: "カメラ部品", belongsTo: "hardware", explanation: "物理的に存在する部品です。" },
      ],
    },
  },

  "tech-network-address": {
    lead: "DNSは、文字の住所を番号の住所へ変換してから接続する仕組みです。",
    diagram: {
      type: "mechanismFlow",
      title: "ドメイン名でWebサイトへつながるまで",
      actors: [
        {
          id: "browser",
          label: "ブラウザ",
          role: "利用者の入力を受け取る",
          detail: "example.com のようなドメイン名を使う。",
        },
        {
          id: "dns",
          label: "DNS",
          role: "名前をIPアドレスへ変換する",
          detail: "ドメイン名とIPアドレスの対応を調べる。",
        },
        {
          id: "server",
          label: "Webサーバ",
          role: "ページを返す接続先",
          detail: "IPアドレスで特定される目的地。",
        },
      ],
      steps: [
        {
          from: "browser",
          to: "dns",
          label: "ドメイン名を問い合わせる",
          body: "ブラウザはまずDNSに、番号の住所を聞く。",
        },
        {
          from: "dns",
          to: "browser",
          label: "IPアドレスを返す",
          body: "DNSが、接続先の番号の住所を教える。",
        },
        {
          from: "browser",
          to: "server",
          label: "IPアドレスを使って接続する",
          body: "ここで初めてWebサーバへ通信できる。",
        },
        {
          from: "server",
          to: "browser",
          label: "Webページを返す",
          body: "サーバからページのデータが返ってくる。",
        },
      ],
    },
    miniGame: {
      type: "matching",
      title: "名前解決の役割合わせ",
      prompt: "DNSの流れに出てくるものを合わせます。",
      pairs: [
        { left: "ドメイン名", right: "人が覚えやすい名前", explanation: "example.com のような文字の住所です。" },
        { left: "IPアドレス", right: "通信先を示す番号", explanation: "実際の接続で使う住所です。" },
        { left: "DNS", right: "名前を番号に変換する", explanation: "名前解決を担当します。" },
      ],
    },
  },

  "tech-http-https": {
    lead: "HTTPとHTTPSは通る道が似ています。違いは、途中で読める形か、暗号化されているかです。",
    diagram: {
      type: "comparison",
      title: "同じWeb通信で、途中の見え方が違う",
      headers: ["場面", "HTTP", "HTTPS"],
      rows: [
        {
          label: "送る前",
          cells: ["入力内容をそのまま通信に乗せる", "入力内容を暗号化してから送る"],
        },
        {
          label: "通信中",
          cells: ["途中で見られると内容が読まれやすい", "途中で見られても内容を読みにくい"],
        },
        {
          label: "届いた後",
          cells: ["サーバがそのまま受け取る", "サーバ側で元に戻して処理する"],
        },
        {
          label: "注意",
          cells: ["個人情報入力には向かない", "暗号化はするが、サイト本物確認は別に必要"],
        },
      ],
    },
    miniGame: {
      type: "classification",
      title: "HTTPSが特に必要な場面",
      prompt: "送る情報の重さで分けます。",
      buckets: [
        { id: "must", label: "HTTPS必須" },
        { id: "light", label: "公開情報中心" },
      ],
      cards: [
        { label: "パスワードを入力する", belongsTo: "must", explanation: "認証情報は暗号化して送る必要があります。" },
        { label: "ニュース記事を読む", belongsTo: "light", explanation: "公開情報中心ですが、現在は多くのサイトがHTTPSです。" },
        { label: "カード番号を送る", belongsTo: "must", explanation: "重要情報なのでHTTPSを確認します。" },
      ],
    },
  },

  "tech-security-cia": {
    lead: "CIAは用語暗記ではなく、情報を安全に使うための3つの壊れ方を分ける図です。",
    diagram: {
      type: "matrix",
      title: "安全な情報利用を3つの観点で分類する",
      columns: ["守る状態", "壊れると", "代表的な対策"],
      rows: ["機密性", "完全性", "可用性"],
      cells: [
        {
          row: "機密性",
          column: "守る状態",
          title: "見てよい人だけが見られる",
          body: "秘密にすべき情報を限定して見せる。",
        },
        {
          row: "機密性",
          column: "壊れると",
          title: "漏えい・のぞき見",
          body: "関係ない人に情報が見える。",
        },
        {
          row: "機密性",
          column: "代表的な対策",
          title: "アクセス制御・暗号化",
          body: "見られる人と読める形を制限する。",
        },
        {
          row: "完全性",
          column: "守る状態",
          title: "正しい内容のまま保つ",
          body: "データが勝手に変わらない。",
        },
        {
          row: "完全性",
          column: "壊れると",
          title: "改ざん・入力ミス",
          body: "金額や記録が誤った状態になる。",
        },
        {
          row: "完全性",
          column: "代表的な対策",
          title: "権限管理・ログ・検証",
          body: "変更できる人と変更履歴を管理する。",
        },
        {
          row: "可用性",
          column: "守る状態",
          title: "必要なときに使える",
          body: "サービスやデータが止まらない。",
        },
        {
          row: "可用性",
          column: "壊れると",
          title: "停止・アクセス不能",
          body: "使いたいときに使えない。",
        },
        {
          row: "可用性",
          column: "代表的な対策",
          title: "冗長化・バックアップ",
          body: "止まっても復旧できるようにする。",
        },
      ],
    },
    miniGame: {
      type: "classification",
      title: "どの壊れ方？",
      prompt: "できごとをCIAへ分けます。",
      buckets: [
        { id: "c", label: "機密性" },
        { id: "i", label: "完全性" },
        { id: "a", label: "可用性" },
      ],
      cards: [
        { label: "会員情報が外部に漏れた", belongsTo: "c", explanation: "見てはいけない人に見られたので機密性です。" },
        { label: "注文金額が書き換わった", belongsTo: "i", explanation: "内容の正しさが壊れたので完全性です。" },
        { label: "サービスが停止した", belongsTo: "a", explanation: "必要なときに使えないので可用性です。" },
      ],
    },
  },

  "tech-public-key-crypto": {
    lead: "公開鍵暗号は、同じ鍵を配らずに安全に受け渡すための鍵ペアの仕組みです。",
    diagram: {
      type: "mechanismFlow",
      title: "公開鍵で閉めて、秘密鍵で開ける流れ",
      actors: [
        {
          id: "publicKey",
          label: "受信者の公開鍵",
          role: "相手に渡してよい鍵",
          detail: "暗号化に使う。公開されてもよい。",
        },
        {
          id: "sender",
          label: "送信者",
          role: "公開鍵で暗号化して送る",
          detail: "秘密鍵は持たないので、暗号文を開けない。",
        },
        {
          id: "cipher",
          label: "暗号文",
          role: "途中で読みにくい形",
          detail: "通信途中で見られても内容を読みにくい。",
        },
        {
          id: "privateKey",
          label: "受信者の秘密鍵",
          role: "本人だけが持つ鍵",
          detail: "公開鍵で閉めた内容を元に戻す。",
        },
      ],
      steps: [
        {
          from: "publicKey",
          to: "sender",
          label: "公開鍵を渡す",
          body: "受信者は、暗号化用の鍵を送信者に渡してよい。",
        },
        {
          from: "sender",
          to: "cipher",
          label: "公開鍵で暗号化する",
          body: "送信者は中身を読みにくい暗号文へ変える。",
        },
        {
          from: "cipher",
          to: "privateKey",
          label: "秘密鍵で復号する",
          body: "対応する秘密鍵を持つ受信者だけが元に戻せる。",
        },
      ],
    },
    miniGame: {
      type: "matching",
      title: "鍵ペアの役割合わせ",
      prompt: "公開鍵と秘密鍵の使い分けを合わせます。",
      pairs: [
        { left: "公開鍵", right: "相手に渡してよい", explanation: "暗号化や署名確認で使います。" },
        { left: "秘密鍵", right: "本人だけが守る", explanation: "復号や署名作成で使います。" },
        { left: "暗号文", right: "途中で読みにくい形", explanation: "通信中に内容を守る形です。" },
      ],
    },
  },

  "tech-keys": {
    lead: "主キーと外部キーは、表の中だけでなく、表どうしをつなぐ線として見ると理解しやすいです。",
    diagram: {
      type: "tableRelation",
      title: "注文表の会員IDが、会員表の会員IDを参照する",
      tables: [
        {
          id: "members",
          name: "会員テーブル",
          caption: "会員を1人ずつ管理する表",
          columns: [
            { name: "会員ID", keyType: "primary" },
            { name: "氏名", keyType: "normal" },
            { name: "メール", keyType: "normal" },
          ],
        },
        {
          id: "orders",
          name: "注文テーブル",
          caption: "注文の履歴を管理する表",
          columns: [
            { name: "注文ID", keyType: "primary" },
            {
              name: "会員ID",
              keyType: "foreign",
              references: "会員テーブル.会員ID",
            },
            { name: "商品名", keyType: "normal" },
          ],
        },
      ],
      relations: [
        {
          fromTable: "orders",
          fromColumn: "会員ID",
          toTable: "members",
          toColumn: "会員ID",
          label: "注文した人を会員表からたどる",
        },
      ],
    },
    miniGame: {
      type: "classification",
      title: "キーの種類を分類",
      prompt: "表の中での役割を分けます。",
      buckets: [
        { id: "pk", label: "主キー" },
        { id: "fk", label: "外部キー" },
        { id: "normal", label: "通常項目" },
      ],
      cards: [
        { label: "会員テーブルの会員ID", belongsTo: "pk", explanation: "会員1人を見分ける主キーです。" },
        { label: "注文テーブルの会員ID", belongsTo: "fk", explanation: "会員表を参照する外部キーです。" },
        { label: "商品名", belongsTo: "normal", explanation: "注文内容の項目で、キーではありません。" },
      ],
    },
  },

  "tech-cloud-models": {
    lead: "SaaS/PaaS/IaaSは、クラウド側がどこまで用意してくれるかで見分けます。",
    diagram: {
      type: "roleMap",
      title: "利用者が管理する範囲と、クラウドが用意する範囲",
      roles: [
        {
          id: "saas",
          label: "SaaS",
          responsibility: "完成したアプリをそのまま使う",
          handles: ["メール", "会計", "チャット", "ブラウザから利用"],
          notFor: "OSやサーバ構築を自分で管理する形ではない",
        },
        {
          id: "paas",
          label: "PaaS",
          responsibility: "アプリを作る土台を借りる",
          handles: ["実行環境", "DB", "開発基盤", "アプリ配置"],
          notFor: "完成アプリを使うだけではない",
        },
        {
          id: "iaas",
          label: "IaaS",
          responsibility: "サーバ資源に近い部品を借りる",
          handles: ["仮想サーバ", "ネットワーク", "ストレージ", "OS設定"],
          notFor: "アプリや実行環境まで全部用意済みではない",
        },
      ],
    },
    miniGame: {
      type: "classification",
      title: "クラウドの型を分類",
      prompt: "どこまで用意されているかで分けます。",
      buckets: [
        { id: "saas", label: "SaaS" },
        { id: "paas", label: "PaaS" },
        { id: "iaas", label: "IaaS" },
      ],
      cards: [
        { label: "Webメールを使う", belongsTo: "saas", explanation: "完成したアプリを利用します。" },
        { label: "アプリ実行環境へコードを置く", belongsTo: "paas", explanation: "開発の土台を利用します。" },
        { label: "仮想サーバを借りる", belongsTo: "iaas", explanation: "基盤資源を利用します。" },
      ],
    },
  },

  "mgmt-pm-qcd": {
    lead: "QCDは3つを別々に覚えるのではなく、どれかを動かすと他にも影響する関係として見ます。",
    diagram: {
      type: "balance",
      title: "QCDは3点のバランスで決まる",
      center: "プロジェクトの成功は、品質・費用・納期の釣り合いで見る",
      factors: [
        {
          label: "Quality: 品質",
          body: "求められる出来ばえや使いやすさを満たす。",
          ifOverdone: "品質を上げすぎると、時間や費用が増えやすい。",
        },
        {
          label: "Cost: 費用",
          body: "人件費、道具、外注費などを予算内に収める。",
          ifOverdone: "費用を削りすぎると、品質や納期にしわ寄せが出やすい。",
        },
        {
          label: "Delivery: 納期",
          body: "決めた期限までに完成・提供する。",
          ifOverdone: "急ぎすぎると、品質低下や追加費用が起きやすい。",
        },
      ],
      tradeoffs: [
        "納期を短くすると、品質を保つために費用が増えやすい",
        "費用を抑えすぎると、品質や納期の余裕が減る",
        "品質を上げるほど、時間や人手が必要になりやすい",
      ],
    },
    miniGame: {
      type: "classification",
      title: "どの観点の問題？",
      prompt: "会話に出ている問題をQCDへ分けます。",
      buckets: [
        { id: "q", label: "品質" },
        { id: "c", label: "費用" },
        { id: "d", label: "納期" },
      ],
      cards: [
        { label: "バグが多い", belongsTo: "q", explanation: "出来ばえの問題なので品質です。" },
        { label: "予算を超える", belongsTo: "c", explanation: "お金の問題なので費用です。" },
        { label: "公開日に間に合わない", belongsTo: "d", explanation: "期限の問題なので納期です。" },
      ],
    },
  },

  "strat-swot": {
    lead: "SWOTは、内側か外側か、プラスかマイナスかで情報を4つの箱へ分ける図です。",
    diagram: {
      type: "matrix",
      title: "内部/外部 × プラス/マイナスの2x2分類",
      columns: ["プラス", "マイナス"],
      rows: ["内部環境", "外部環境"],
      cells: [
        {
          row: "内部環境",
          column: "プラス",
          title: "Strength: 強み",
          body: "自社の中にあり、戦略に活かせる武器。",
        },
        {
          row: "内部環境",
          column: "マイナス",
          title: "Weakness: 弱み",
          body: "自社の中にあり、改善・補強したい課題。",
        },
        {
          row: "外部環境",
          column: "プラス",
          title: "Opportunity: 機会",
          body: "市場や社会の変化による追い風。",
        },
        {
          row: "外部環境",
          column: "マイナス",
          title: "Threat: 脅威",
          body: "競合や環境変化による向かい風。",
        },
      ],
    },
    miniGame: {
      type: "classification",
      title: "4つの箱へ分類",
      prompt: "カフェの状況をSWOTへ分けます。",
      buckets: [
        { id: "s", label: "強み" },
        { id: "w", label: "弱み" },
        { id: "o", label: "機会" },
        { id: "t", label: "脅威" },
      ],
      cards: [
        { label: "接客が評判", belongsTo: "s", explanation: "内部のプラスなので強みです。" },
        { label: "席数が少ない", belongsTo: "w", explanation: "内部のマイナスなので弱みです。" },
        { label: "若者需要が伸びている", belongsTo: "o", explanation: "外部のプラスなので機会です。" },
        { label: "近くに競合店が増えた", belongsTo: "t", explanation: "外部のマイナスなので脅威です。" },
      ],
    },
  },
};
