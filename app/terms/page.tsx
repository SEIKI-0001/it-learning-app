import type { Metadata } from "next";
import Link from "next/link";
import PublicFooter from "@/components/marketing/PublicFooter";

export const metadata: Metadata = {
  title: "利用規約｜ITパスポート学習コーチ",
};

/** 制定日・改定日。本文を変えたら更新し、sitemap の lastModified も合わせる。 */
export const TERMS_EFFECTIVE_DATE = "2026年10月4日";

type Article = {
  heading: string;
  paragraphs?: readonly string[];
  items?: readonly string[];
};

const ARTICLES: readonly Article[] = [
  {
    heading: "第1条（適用）",
    paragraphs: [
      "この利用規約（以下「本規約」）は、ITパスポート学習コーチ（以下「本サービス」）の提供者（以下「運営者」）と、本サービスを利用するすべての方（以下「利用者」）との間に適用されます。",
      "利用者は、本規約およびプライバシーポリシーに同意したうえで本サービスを利用するものとします。Googleでのログイン、またはLINE公式アカウントからの利用開始をもって、本規約に同意したものとみなします。",
      "本サービス上に別途表示する個別の条件（料金プラン、キャンペーン条件など）は本規約の一部を構成し、本規約と異なる定めがある場合はその個別の条件が優先します。",
    ],
  },
  {
    heading: "第2条（本サービスの内容）",
    paragraphs: [
      "本サービスは、ITパスポート試験の学習を支援するWebアプリケーションおよびLINE公式アカウントです。学習計画、トピック学習、用語・過去問の演習、復習、AIによる記述回答の採点や学習相談、LINEでのリマインドなどを提供します。",
      "本サービスは学習を支援するものであり、試験の合格や得点を保証するものではありません。",
    ],
  },
  {
    heading: "第3条（アカウント）",
    paragraphs: [
      "利用者は、GoogleアカウントまたはLINEアカウントを用いて本サービスを利用します。利用者は自己の責任でこれらのアカウントを管理し、第三者に利用させてはなりません。",
      "利用者のアカウントで行われた操作は、利用者本人による操作とみなします。ただし、運営者の故意または過失による場合はこの限りではありません。",
    ],
  },
  {
    heading: "第4条（有料プラン）",
    paragraphs: [
      "本サービスの一部機能は有料プラン（Pro）で提供します。料金、支払方法、提供開始時期、提供期間、返金条件は、購入画面および特定商取引法に基づく表示に定めるとおりとします。",
      "支払いはStripeを通じたクレジットカード決済で行います。月額プランは解約手続きをしない限り1か月ごとに自動更新され、次回更新日の前日までに解約すると次回以降の請求は発生しません。解約後も、支払い済みの期間の終了まではProの機能を利用できます。",
      "買い切りプランは自動更新されず、提供期間の満了をもって無料プランに戻ります。",
      "法令または特定商取引法に基づく表示に定める場合を除き、支払い済みの料金は返金しません。",
    ],
  },
  {
    heading: "第5条（AI機能）",
    paragraphs: [
      "本サービスのAI採点、学習相談などの機能は、外部のAI提供者の技術を用いて自動で生成した内容を表示します。生成内容は誤りや不正確な情報を含むことがあるため、学習の参考としてご利用ください。",
      "AI機能には、プランごとに1日あたりの利用回数の上限があります。",
    ],
  },
  {
    heading: "第6条（禁止事項）",
    paragraphs: ["利用者は、本サービスの利用にあたり、次の行為をしてはなりません。"],
    items: [
      "法令または公序良俗に違反する行為",
      "他人になりすます行為、他人のアカウントを利用する行為",
      "本サービスのコンテンツを、運営者の許可なく複製、転載、再配布、販売する行為",
      "自動化された手段で大量にアクセスする行為、AI機能の利用回数制限を回避しようとする行為など、本サービスの運営を妨げる行為",
      "本サービスのサーバーやネットワークへの不正アクセス、脆弱性を悪用する行為",
      "AI機能に対し、違法・有害な内容の生成を目的とした入力をする行為",
      "その他、運営者が不適切と合理的に判断する行為",
    ],
  },
  {
    heading: "第7条（知的財産）",
    paragraphs: [
      "本サービスの解説、問題、イラスト、キャラクター、プログラムその他のコンテンツに関する権利は、運営者または正当な権利者に帰属します。",
      "本サービスで掲載するITパスポート試験の公開問題は、独立行政法人情報処理推進機構（IPA）が公開したものであり、出典を表示しています。本サービスの解説はIPAの公式解説ではありません。",
      "利用者が本サービスに入力した回答や記述の権利は利用者に帰属します。運営者は、本サービスの提供、品質改善、統計の作成に必要な範囲で、これらを無償で利用できるものとします。",
    ],
  },
  {
    heading: "第8条（サービスの変更・中断・終了）",
    paragraphs: [
      "運営者は、保守、障害、外部サービスの停止その他やむを得ない事由がある場合、事前の通知なく本サービスの全部または一部を中断できます。",
      "運営者は、本サービスの内容を変更し、または本サービスを終了できます。有料プランの提供期間中に本サービスを終了する場合は、相当の期間をおいて本サービス上で告知し、未経過期間分の料金の取扱いを案内します。",
    ],
  },
  {
    heading: "第9条（利用停止）",
    paragraphs: [
      "利用者が本規約に違反した場合、運営者は、事前の通知なく、その利用者による本サービスの利用を停止し、またはアカウントを削除できます。",
    ],
  },
  {
    heading: "第10条（免責）",
    paragraphs: [
      "運営者は、本サービスの内容の正確性、完全性、特定目的への適合性を保証しません。",
      "運営者は、本サービスの利用により利用者に生じた損害について、運営者の故意または重大な過失による場合を除き、利用者が当該損害の発生した月の前12か月間に本サービスへ支払った金額を上限として賠償責任を負います。",
      "前項の定めは、消費者契約法その他の法令により運営者の責任を免除または制限できない場合には適用しません。",
    ],
  },
  {
    heading: "第11条（個人情報）",
    paragraphs: [
      "運営者は、利用者の個人情報をプライバシーポリシーに従って取り扱います。",
    ],
  },
  {
    heading: "第12条（規約の変更）",
    paragraphs: [
      "運営者は、民法第548条の4の定めに基づき、本規約を変更できます。変更する場合は、変更後の内容と効力発生日を、効力発生日より前に本サービス上で告知します。",
      "効力発生日以降に本サービスを利用した場合、利用者は変更後の本規約に同意したものとみなします。",
    ],
  },
  {
    heading: "第13条（準拠法・管轄）",
    paragraphs: [
      "本規約は日本法に準拠します。本サービスに関して紛争が生じた場合は、運営者の所在地を管轄する地方裁判所を第一審の専属的合意管轄裁判所とします。",
    ],
  },
  {
    heading: "第14条（お問い合わせ）",
    paragraphs: ["本規約に関するお問い合わせは、公式LINEで受け付けます。"],
  },
];

export default function TermsPage() {
  const lineUrl =
    process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL?.trim() || "";
  return (
    <>
      <main className="mx-auto min-h-screen max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-bold text-slate-900">利用規約</h1>
        <p className="mt-3 text-sm text-slate-600">制定日：{TERMS_EFFECTIVE_DATE}</p>
        <div className="mt-8 space-y-8">
          {ARTICLES.map((article) => (
            <section key={article.heading}>
              <h2 className="text-xl font-bold text-slate-900">{article.heading}</h2>
              {article.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-2 leading-8 text-slate-700">
                  {paragraph}
                </p>
              ))}
              {article.items && (
                <ol className="mt-2 list-decimal space-y-1 pl-6 leading-8 text-slate-700">
                  {article.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>
        <p className="mt-8 leading-8 text-slate-700">
          関連：
          <Link className="underline" href="/privacy">プライバシーポリシー</Link>
          ／
          <Link className="underline" href="/legal/tokusho">特定商取引法に基づく表示</Link>
        </p>
        {lineUrl && (
          <a className="mt-6 inline-block font-bold text-brand-700 underline" href={lineUrl}>
            公式LINEへ問い合わせる
          </a>
        )}
      </main>
      <PublicFooter />
    </>
  );
}
