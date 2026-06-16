import type { VisualLearningSpec } from "@/types/content";

export const topicVisualLearning: Partial<Record<string, VisualLearningSpec>> = {
  "tech-lan-wan": {
    lead: "単語を覚える前に、ネットワークの広さを1枚の図で見ます。LANは近く、WANは離れたLAN同士をつなぐ考え方です。",
    heroDiagram: {
      type: "heroDiagram",
      diagramType: "compare",
      canvasLabel: "Network range",
      title: "LANは近い範囲、WANは離れた拠点をつなぐ広い範囲",
      subtitle: "家・学校・オフィスの中で閉じるか、遠くの拠点までまたぐかで見分ける。",
      lanes: [
        {
          id: "lan",
          label: "LAN",
          caption: "家・学校・同じオフィス内など、近い範囲のネットワーク",
          tone: "emerald",
          items: [
            "スマホ、PC、プリンタが同じWi-Fiにつながる",
            "同じ建物・フロア内の通信が中心",
            "ルータやスイッチで近くの機器をまとめる",
          ],
        },
        {
          id: "wan",
          label: "WAN",
          caption: "離れた場所にあるLAN同士を広い範囲でつなぐネットワーク",
          tone: "sky",
          items: [
            "東京本社と大阪支店をつなぐ",
            "通信回線やインターネットをまたぐ",
            "地域・国を越える広い通信に使う",
          ],
        },
      ],
      insight: "見分ける軸は「速さ」よりもまず範囲。近いまとまりがLAN、遠くのまとまり同士をつなぐのがWAN。",
    },
    miniGame: {
      type: "classification",
      title: "範囲で分類",
      prompt: "場面をLAN/WANに分けます。",
      buckets: [
        { id: "lan", label: "LAN" },
        { id: "wan", label: "WAN" },
      ],
      cards: [
        { label: "家のWi-FiでスマホとPCがつながる", belongsTo: "lan", explanation: "近い範囲の機器をつなぐのでLANです。" },
        { label: "東京本社と福岡支店をつなぐ", belongsTo: "wan", explanation: "離れた拠点同士を広くつなぐのでWANです。" },
        { label: "学校内のPC教室をつなぐ", belongsTo: "lan", explanation: "同じ施設内の近いネットワークなのでLANです。" },
      ],
    },
  },

  "mgmt-pdca": {
    lead: "PDCAは4つの単語ではなく、改善を回し続ける輪として見ます。",
    heroDiagram: {
      type: "heroDiagram",
      diagramType: "cycle",
      canvasLabel: "Continuous improvement",
      title: "Plan → Do → Check → Action を回して改善する",
      subtitle: "やって終わりではなく、結果を見て次の計画へ戻るところがポイントです。",
      cycle: {
        center: "小さく試す、結果を見る、直してまた回す",
        steps: [
          {
            label: "Plan: 計画",
            caption: "目標・やり方・期限を決める。",
            tone: "sky",
          },
          {
            label: "Do: 実行",
            caption: "計画した方法で実際にやってみる。",
            tone: "emerald",
          },
          {
            label: "Check: 評価",
            caption: "結果を見て、良かった点とズレを確認する。",
            tone: "amber",
          },
          {
            label: "Action: 改善",
            caption: "次に直すことを決め、次のPlanへつなげる。",
            tone: "violet",
          },
        ],
      },
      insight: "PDCAは一度きりの順番ではなく、改善を続けるためのサイクルです。",
    },
    miniGame: {
      type: "matching",
      title: "PDCAの段階を合わせる",
      prompt: "それぞれの段階で何をするかを合わせます。",
      pairs: [
        { left: "Plan", right: "目標とやり方を決める", explanation: "計画の段階です。" },
        { left: "Check", right: "結果を確認する", explanation: "評価してズレを見る段階です。" },
        { left: "Action", right: "改善して次へつなげる", explanation: "次の計画に反映します。" },
      ],
    },
  },

  "tech-computer-core": {
    lead: "役割名を覚える前に、保存されたデータが読み出され、処理され、必要なら保存される流れを1枚で見ます。",
    heroDiagram: {
      type: "heroDiagram",
      diagramType: "flow",
      canvasLabel: "Computer core",
      title: "ストレージから出し、メモリに広げ、CPUが処理する",
      subtitle: "3つは横並びの部品名ではなく、データが通る順番と担当が違います。",
      nodes: [
        {
          id: "storage",
          label: "ストレージ",
          badge: "長期保存",
          caption: "写真、アプリ、ファイルを電源オフ後も残す場所。",
          tone: "slate",
        },
        {
          id: "memory",
          label: "メモリ",
          badge: "作業場所",
          caption: "今使うデータを一時的に広げる場所。",
          tone: "sky",
        },
        {
          id: "cpu",
          label: "CPU",
          badge: "処理",
          caption: "命令を読み、計算・判断する場所。",
          tone: "amber",
        },
      ],
      steps: [
        {
          from: "storage",
          to: "memory",
          label: "必要なデータを読み出す",
          caption: "保存場所から、今使う分だけ作業場所へ出す。",
          tone: "sky",
        },
        {
          from: "memory",
          to: "cpu",
          label: "CPUがメモリ上のデータを処理する",
          caption: "CPUはストレージから直接全部を読むのではなく、主にメモリ上のデータを使う。",
          tone: "amber",
        },
        {
          from: "cpu",
          to: "memory",
          label: "処理結果を一時的に戻す",
          caption: "すぐ使う結果はメモリに置かれる。",
          tone: "emerald",
        },
        {
          from: "memory",
          to: "storage",
          label: "残したい結果だけ保存する",
          caption: "電源を切っても残したいものをストレージへ書き込む。",
          tone: "slate",
        },
      ],
      insight: "迷ったら「本棚=ストレージ、机=メモリ、作業する人=CPU」で流れを見る。",
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
    lead: "OSは単なるアプリではなく、アプリのお願いを機械へ通す仲介役です。層構造で見ます。",
    heroDiagram: {
      type: "heroDiagram",
      diagramType: "role-map",
      canvasLabel: "Software layers",
      title: "アプリはOSに頼み、OSがハードウェアを管理する",
      subtitle: "利用者に近いアプリ、仲介するOS、実際に動く機械部品という層で見る。",
      lanes: [
        {
          id: "app",
          label: "アプリケーション",
          caption: "利用者の目的を実現する画面や機能",
          tone: "violet",
          items: ["ブラウザ", "SNS", "表計算", "ゲーム"],
        },
        {
          id: "os",
          label: "OS",
          caption: "アプリからのお願いを整理し、機械の使い方を調整する",
          tone: "sky",
          items: ["ファイル管理", "メモリ管理", "画面表示", "入力装置の管理"],
        },
        {
          id: "hardware",
          label: "ハードウェア",
          caption: "実際に電気で動く物理的な部品",
          tone: "slate",
          items: ["CPU", "メモリ", "画面", "キーボード", "カメラ"],
        },
      ],
      links: [
        { from: "app", to: "os", label: "お願いする" },
        { from: "os", to: "hardware", label: "使い方を管理する" },
      ],
      insight: "OSは、アプリと機械が直接ぶつからないようにする交通整理役です。",
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
    lead: "DNSは、文字の住所を番号の住所へ変換してから接続する仕組みです。順番で見ます。",
    heroDiagram: {
      type: "heroDiagram",
      diagramType: "flow",
      canvasLabel: "Name resolution",
      title: "ドメイン名をDNSでIPアドレスに変えてからサーバへ行く",
      subtitle: "人が覚えやすい名前のままではなく、通信で使う番号の住所に直して接続します。",
      nodes: [
        {
          id: "browser",
          label: "ブラウザ",
          badge: "入力する",
          caption: "example.com のようなドメイン名を受け取る。",
          tone: "violet",
        },
        {
          id: "dns",
          label: "DNS",
          badge: "変換する",
          caption: "名前とIPアドレスの対応を調べる。",
          tone: "sky",
        },
        {
          id: "server",
          label: "Webサーバ",
          badge: "返す",
          caption: "IPアドレスでたどり着くWebページの置き場。",
          tone: "emerald",
        },
      ],
      steps: [
        {
          from: "browser",
          to: "dns",
          label: "ドメイン名を問い合わせる",
          caption: "ブラウザはまずDNSに、番号の住所を聞く。",
          tone: "sky",
        },
        {
          from: "dns",
          to: "browser",
          label: "IPアドレスを返す",
          caption: "DNSが接続先の番号を教える。",
          tone: "emerald",
        },
        {
          from: "browser",
          to: "server",
          label: "IPアドレスを使って接続する",
          caption: "ここで初めて目的のWebサーバへ通信できる。",
          tone: "violet",
        },
        {
          from: "server",
          to: "browser",
          label: "Webページを返す",
          caption: "サーバからページのデータが戻る。",
          tone: "amber",
        },
      ],
      insight: "DNSはサイト本体ではなく、サイトへ向かう前に住所を調べる案内係です。",
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
    lead: "HTTPとHTTPSは通る道が似ています。違いは、途中で読める形か、保護されている形かです。",
    heroDiagram: {
      type: "heroDiagram",
      diagramType: "compare",
      canvasLabel: "Web communication",
      title: "HTTPは中身が見えやすく、HTTPSは暗号化して守る",
      subtitle: "同じブラウザとサーバの通信でも、途中の見え方が変わります。",
      lanes: [
        {
          id: "http",
          label: "HTTP",
          caption: "Web通信の基本ルール。暗号化は前提ではない。",
          tone: "rose",
          items: [
            "送る内容がそのまま通信に乗る",
            "途中で見られると内容を読まれやすい",
            "ログイン・決済など重要情報には向かない",
          ],
        },
        {
          id: "https",
          label: "HTTPS",
          caption: "HTTPにSSL/TLSの暗号化を加えた通信。",
          tone: "emerald",
          items: [
            "送る前に内容を読みにくい形へ変える",
            "途中で見られても内容を読み取りにくい",
            "個人情報入力ではHTTPSを確認する",
          ],
        },
      ],
      insight: "HTTPSは通信内容を守る仕組み。サイト自体が安全かどうかは、URLや運営元も合わせて確認します。",
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
    lead: "CIAは用語暗記ではなく、情報を安全に使うための3つの壊れ方を分ける見取り図です。",
    heroDiagram: {
      type: "heroDiagram",
      diagramType: "relation",
      canvasLabel: "安全に情報を使う",
      title: "CIAは「漏えい」「改ざん」「停止」を防ぐ3つの観点",
      subtitle: "何が壊れると困るのかを具体例で対応づけます。",
      nodes: [
        {
          id: "c",
          label: "機密性",
          badge: "漏えいを防ぐ",
          caption: "見てよい人だけが見られる。例: 会員情報を外部に見せない。",
          tone: "sky",
        },
        {
          id: "i",
          label: "完全性",
          badge: "改ざんを防ぐ",
          caption: "正しい内容のまま保つ。例: 金額や記録を書き換えられない。",
          tone: "emerald",
        },
        {
          id: "a",
          label: "可用性",
          badge: "停止を防ぐ",
          caption: "必要なときに使える。例: サービス停止やアクセス不能を避ける。",
          tone: "amber",
        },
      ],
      links: [
        { from: "c", to: "i", label: "秘密でも、内容が正しくなければ困る" },
        { from: "i", to: "a", label: "正しくても、使えなければ困る" },
        { from: "a", to: "c", label: "使えても、漏れたら安全ではない" },
      ],
      insight: "セキュリティは1つの対策名ではなく、3つの壊れ方をまとめて防ぐ考え方です。",
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
    lead: "公開鍵暗号は、同じ鍵を配らずに安全に受け渡すための鍵ペアの流れです。",
    heroDiagram: {
      type: "heroDiagram",
      diagramType: "flow",
      canvasLabel: "Public key crypto",
      title: "公開鍵で閉じ、秘密鍵を持つ受信者だけが開ける",
      subtitle: "公開してよい鍵と、本人だけが守る鍵を分けるのが直感ポイントです。",
      nodes: [
        {
          id: "public",
          label: "公開鍵",
          badge: "渡してよい",
          caption: "暗号化に使う鍵。相手に知らせてもよい。",
          tone: "sky",
        },
        {
          id: "sender",
          label: "送信者",
          badge: "閉じる",
          caption: "受信者の公開鍵でメッセージを暗号化する。",
          tone: "violet",
        },
        {
          id: "private",
          label: "秘密鍵",
          badge: "本人だけ",
          caption: "対応する秘密鍵を持つ受信者だけが元に戻せる。",
          tone: "amber",
        },
      ],
      steps: [
        {
          from: "public",
          to: "sender",
          label: "受信者が公開鍵を渡す",
          caption: "公開鍵は暗号化用なので、相手に渡してよい。",
          tone: "sky",
        },
        {
          from: "sender",
          to: "private",
          label: "公開鍵で暗号化した文を送る",
          caption: "途中で見られても読みにくい暗号文になる。",
          tone: "violet",
        },
        {
          from: "private",
          to: "private",
          label: "秘密鍵で復号する",
          caption: "元に戻せるのは、対応する秘密鍵を持つ受信者だけ。",
          tone: "amber",
        },
      ],
      insight: "公開鍵は閉めるため、秘密鍵は開けるため。この非対称な役割を押さえると混乱しにくいです。",
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
    heroDiagram: {
      type: "heroDiagram",
      diagramType: "relation",
      canvasLabel: "Table relation",
      title: "注文テーブルの会員IDが、会員テーブルの会員IDを参照する",
      subtitle: "主キーは1行を見分けるID、外部キーは別の表のIDへ向かう線です。",
      groups: [
        {
          id: "members",
          label: "会員テーブル",
          caption: "会員を1人ずつ管理する表",
          tone: "sky",
          items: ["会員ID: 主キー", "氏名", "メール"],
        },
        {
          id: "orders",
          label: "注文テーブル",
          caption: "注文の履歴を管理する表",
          tone: "emerald",
          items: ["注文ID: 主キー", "会員ID: 外部キー", "商品名"],
        },
      ],
      links: [
        { from: "orders", to: "members", label: "注文テーブル.会員ID → 会員テーブル.会員ID" },
      ],
      insight: "外部キーは「外にある表の主キーを指す項目」と見ると、表どうしの関係が線で見えます。",
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
    heroDiagram: {
      type: "heroDiagram",
      diagramType: "compare",
      canvasLabel: "Cloud service models",
      title: "SaaSは完成品、PaaSは開発土台、IaaSは基盤資源を借りる",
      subtitle: "利用者が管理する範囲が、SaaS → PaaS → IaaS の順に広がります。",
      lanes: [
        {
          id: "saas",
          label: "SaaS",
          caption: "完成したアプリをそのまま使う",
          tone: "emerald",
          items: ["利用者: 設定とデータを使う", "事業者: アプリ・OS・サーバを管理", "例: Webメール、会計、チャット"],
        },
        {
          id: "paas",
          label: "PaaS",
          caption: "アプリを作るための土台を借りる",
          tone: "sky",
          items: ["利用者: 自分のアプリを作って配置", "事業者: 実行環境・DB・OSを管理", "例: アプリ実行環境"],
        },
        {
          id: "iaas",
          label: "IaaS",
          caption: "サーバ資源に近い部品を借りる",
          tone: "amber",
          items: ["利用者: OS設定やミドルウェアも管理", "事業者: 物理設備や仮想化基盤を管理", "例: 仮想サーバ、ネットワーク"],
        },
      ],
      insight: "完成品に近いほどSaaS、自由に作る範囲が広いほどIaaSに近づきます。",
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

  "strat-swot": {
    lead: "SWOTは、内側か外側か、プラスかマイナスかで情報を4つの箱へ分ける図です。",
    heroDiagram: {
      type: "heroDiagram",
      diagramType: "matrix",
      canvasLabel: "Strategy matrix",
      title: "内部/外部 × プラス/マイナスで4つに分ける",
      subtitle: "情報を置く場所を間違えなければ、戦略の材料が整理しやすくなります。",
      matrix: {
        columns: ["プラス", "マイナス"],
        rows: ["内部環境", "外部環境"],
        cells: [
          {
            row: "内部環境",
            column: "プラス",
            label: "Strength: 強み",
            caption: "自社の中にある武器。例: 技術力、ブランド、接客力。",
            tone: "emerald",
          },
          {
            row: "内部環境",
            column: "マイナス",
            label: "Weakness: 弱み",
            caption: "自社の中にある課題。例: 人手不足、資金不足。",
            tone: "rose",
          },
          {
            row: "外部環境",
            column: "プラス",
            label: "Opportunity: 機会",
            caption: "外から来る追い風。例: 市場拡大、流行、規制緩和。",
            tone: "sky",
          },
          {
            row: "外部環境",
            column: "マイナス",
            label: "Threat: 脅威",
            caption: "外から来る向かい風。例: 競合増加、価格高騰。",
            tone: "amber",
          },
        ],
      },
      insight: "強み・弱みは自分たちの内側、機会・脅威は外の環境。ここを混ぜないのがコツです。",
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

  "mgmt-pm-qcd": {
    lead: "QCDは3つを別々に覚えるのではなく、どれかを動かすと他にも影響する関係として見ます。",
    heroDiagram: {
      type: "heroDiagram",
      diagramType: "relation",
      canvasLabel: "Project balance",
      title: "品質・費用・納期は、1つを動かすと他にも影響する",
      subtitle: "プロジェクトは3点のバランスで見ると、調整の意味が分かりやすくなります。",
      nodes: [
        {
          id: "quality",
          label: "Quality: 品質",
          badge: "出来ばえ",
          caption: "求められる機能、正確さ、使いやすさを満たす。",
          tone: "emerald",
        },
        {
          id: "cost",
          label: "Cost: 費用",
          badge: "予算",
          caption: "人件費、道具、外注費などを予算内に収める。",
          tone: "amber",
        },
        {
          id: "delivery",
          label: "Delivery: 納期",
          badge: "期限",
          caption: "決めた日までに完成・提供する。",
          tone: "sky",
        },
      ],
      links: [
        { from: "delivery", to: "cost", label: "急ぐほど人手や費用が増えやすい" },
        { from: "cost", to: "quality", label: "削りすぎると品質にしわ寄せが出やすい" },
        { from: "quality", to: "delivery", label: "高めるほど時間が必要になりやすい" },
      ],
      insight: "QCDは三択ではなくバランス。どれかを優先すると、残り2つにも影響します。",
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
};
