import Link from 'next/link';
import { getGuide } from '@/lib/guide/guides';
import { buildGuideMetadata } from '@/lib/guide/seo';
import { GUIDE_FACTS as F } from '@/lib/guide/facts';
import { BILLING_PLANS, DAILY_LIMITS, FREE_RECORDING_DAYS } from '@/lib/billing/constants';
import GuideArticle from '@/components/guide/GuideArticle';
import { GuideTable } from '@/components/guide/GuideParts';

const guide = getGuide('it-passport-app');
const monthly = BILLING_PLANS.find((plan) => plan.key === 'sub_monthly')!;
export const metadata = buildGuideMetadata(guide);

export default function AppSelectionGuide() {
  return (
    <GuideArticle
      guide={guide}
      lead={[
        <>ITパスポートの勉強アプリは、<strong>無料で使える範囲・解説の分かりやすさ・間違えた問題の復習・学習計画</strong>の4点で選びましょう。初心者は「なぜそうなるか」を理解できる教材、基礎を学んだ人は解説付きの過去問と復習機能を優先すると、自分の目的に合わせて選べます。</>,
        <>このガイドはITパスポート学習コーチ（資格もちっと）の運営者が作成しています。他社を含むおすすめ順位ではなく、アプリを自分で試して判断するための確認項目と、当サービスでの具体例を紹介します。</>,
      ]}
      points={[
        { id: 'choose', label: '自分の学習状況に合わせて選ぶ' },
        { id: 'free', label: '「無料」はどこまでかを確認する' },
        { id: 'try', label: '登録前に教材と解説を試す手順' },
        { id: 'app-only', label: 'アプリだけで勉強する場合の確認点' },
      ]}
      service={<Service />}
      sources={[
        { label: '当サービスの機能・無料範囲・料金', url: '/lp#price' },
        { label: '登録不要のAND・OR体験教材', url: '/lp/try' },
        { label: '公式過去問と独自解説（年度別）', url: '/kakomon' },
      ]}
    >
      <h2 id="choose">ITパスポートアプリは、今困っていることから選ぶ</h2>
      <p>問題数が多くても、分からないまま答えだけを覚えてしまうなら学び方を変える必要があります。次の表で、自分が最初に確かめたい機能を決めてください。</p>
      <GuideTable caption="学習状況ごとの確認項目。特定のアプリの優劣を示す表ではありません。">
        <thead><tr><th scope="col">今の状態</th><th scope="col">先に確認したい機能</th><th scope="col">試すときの問い</th></tr></thead>
        <tbody>
          <tr><th scope="row">IT初心者・参考書の用語で止まる</th><td>図や操作を使った基礎解説、用語の説明</td><td>答えを見たあと、自分の言葉で理由を説明できるか？</td></tr>
          <tr><th scope="row">基礎は学んだ・過去問を解きたい</th><td>出典と年度が分かる過去問、選択肢ごとの解説</td><td>正解以外の選択肢が違う理由も分かるか？</td></tr>
          <tr><th scope="row">勉強が続かない・試験日が決まっている</th><td>毎日の学習量、間違えた問題の復習、記録</td><td>今日は何をやるか決められるか？遅れた日に立て直せるか？</td></tr>
        </tbody>
      </GuideTable>
      <p>何から始めるかも迷う場合は、<a href="/guide/it-passport-study-method">未経験者向けの勉強法</a>から全体の順番を確認できます。</p>

      <h2 id="free">無料アプリを選ぶときは、教材と記録を分けて確認する</h2>
      <p>「無料で始められる」と「すべての機能が期限なく無料」は同じではありません。登録する前に次の4点を確認すると、勉強を始めた後の食い違いを減らせます。</p>
      <ul>
        <li><strong>教材：</strong>解説や過去問を最後まで読めるか。一部だけの体験か、全範囲を利用できるか。</li>
        <li><strong>回数：</strong>問題演習・採点・質問などに1日あたりの上限があるか。</li>
        <li><strong>記録：</strong>進捗や間違いの保存に期限があるか。無料期間が終わった後に何が使えるか。</li>
        <li><strong>支払い：</strong>月額の自動更新か、期間を選ぶ買い切りか。解約方法や利用期間が明示されているか。</li>
      </ul>
      <p>例えば当サービスは、全{F.topicCount}トピックの教材と公式過去問{F.officialQuestionCount}問が無料です。一方、無料で学習記録を保存できるのは登録から{FREE_RECORDING_DAYS}日間で、無料プランのAI採点は1日{DAILY_LIMITS.free}回です。<a href="/lp#price">現在の無料範囲と料金</a>を確認してください。</p>

      <h2 id="try">登録前に、1つの教材と1問の解説を試す</h2>
      <p>機能名を読むだけで決めず、実際の説明と操作が自分に合うかを確かめましょう。当サービスなら次の順番で、登録なしで試せます。</p>
      <ol>
        <li><a href="/lp/try">AND・ORのスイッチ教材</a>を開く。AとBを切り替え、どの入力の組み合わせで出力が1になるかを比べます。</li>
        <li>画面を閉じて、「ANDは両方が1、ORは少なくとも片方が1のときに出力が1」と自分で説明できるか確かめます。分からなければ、入力を1つずつ変えてもう一度見ます。</li>
        <li><Link href="/kakomon">年度別の公開過去問</Link>から1問を開き、選択肢を選ぶ理由を考えてから解説を読みます。答えが合っていたかだけでなく、誤答の理由まで説明できるかを確認します。</li>
        <li>普段使うスマホで文字や図が読めるか、操作しやすいかを確かめます。毎日の通学・通勤で使うなら、普段の利用環境で試してください。</li>
      </ol>
      <p>体験教材の操作は学習記録に保存されません。自分の試験日から計画を作り、記録を残す学習には登録が必要です。</p>

      <h2 id="app-only">アプリだけでITパスポートを勉強してもいい？</h2>
      <p>アプリだけで進めるかは、教材の形よりも<strong>理解・演習・復習・本番形式の確認までできるか</strong>で判断しましょう。「正解を覚えている」状態と「理由を説明して解ける」状態を分けて確かめることが大切です。</p>
      <ul>
        <li>用語や仕組みが分からないまま問題を繰り返しているなら、解説に戻るか参考書を併用する。</li>
        <li>計算問題は紙に途中式を書き、答えまでの手順を自分で再現する。</li>
        <li>短い一問一答に加え、まとまった問題数と制限時間を意識した演習も行う。</li>
        <li>正答率だけで判断せず、苦手分野と時間配分を確認して復習する。</li>
      </ul>
      <p>演習を始める順番は<a href="/guide/past-exam-strategy">過去問の使い方</a>、日々の配分は<a href="/guide/study-plan">試験日から逆算する勉強計画</a>で詳しく説明しています。特定のアプリや学習時間だけで合格を保証することはできません。</p>
    </GuideArticle>
  );
}

function Service() {
  return (
    <>
      <p>ITパスポート学習コーチは、インストール不要でスマホ・PCのブラウザから使えます。操作する教材で理解し、公式過去問（{F.officialYearRange}）で確認し、試験日に向けて毎日の学習を組み立てたい人向けです。</p>
      <p>Proの月額プランは{monthly.totalJpy.toLocaleString('ja-JP')}円で、契約期間中の学習記録保存と1日{DAILY_LIMITS.pro}回のPro採点が使えます。自動更新のない期間制の買い切りプランもあります。</p>
      <p><a href="/lp">ITパスポートの勉強アプリの機能を見る</a>か、<a href="/lp/try">登録せずに教材を試す</a>ところから始めてください。</p>
    </>
  );
}
