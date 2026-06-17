import { OnboardingForm } from "@/components/study/OnboardingForm";

type PageProps = {
  searchParams: Promise<{
    lineUserId?: string;
  }>;
};

export default async function OnboardingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <main className="page page-narrow">
      <p className="eyebrow">初回設定</p>
      <h1>試験日から、今日やることを作ります</h1>
      <p className="lead">
        使える時間、休みたい曜日、参考書、IT経験、苦手分野を登録してください。
        LINEから来た場合は、この設定がLINEの返信にも使われます。
      </p>
      <OnboardingForm lineUserId={params.lineUserId} />
    </main>
  );
}
