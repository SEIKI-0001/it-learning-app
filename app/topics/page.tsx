import { redirect } from "next/navigation";

// 旧トピック一覧の恒久互換ルート。教材一覧は /learn に集約した。
export default function TopicsRedirectPage() {
  redirect("/learn");
}
