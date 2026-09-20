"use client";
import { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui/Button";

type Status = { line: boolean; google: boolean };
export default function AccountLinkSettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [code, setCode] = useState("");
  const [issued, setIssued] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/account/link", { cache: "no-store" }).then(async (r) => {
      if (!r.ok) throw new Error();
      const value = await r.json() as Status;
      if (active) setStatus(value);
    }).catch(() => { if (active) setMessage("ログイン状態を確認できません。画面を開き直してください。"); });
    return () => { active = false; };
  }, []);
  async function submit(action: "create" | "complete") {
    setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/account/link", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, code }),
      });
      const result = await r.json() as { error?: string; code?: string };
      if (!r.ok) throw new Error(result.error ?? "連携できませんでした。");
      if (action === "create") setIssued(result.code ?? "");
      else window.location.assign("/?accountLinked=1");
    } catch (error) { setMessage(error instanceof Error ? error.message : "通信を確認してください。"); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4" aria-labelledby="account-link-title">
    <h2 id="account-link-title" className="font-semibold">LINE・Googleの学習記録を共有</h2>
    {status?.line && status.google ? <p>連携済みです。LINE・Googleのどちらで開いても同じ学習記録を利用できます。</p> : <>
      <p className="text-sm text-gray-600">最初の1回だけ連携すると、両方の学習済み記録をまとめて、別の端末でも続きから学習できます。</p>
      {status?.line && <>
        <p className="text-sm">ここでコードを発行し、Googleでログインした端末の「設定」で入力してください。コードの有効期限は10分です。</p>
        <button type="button" disabled={busy} className={buttonClass("secondary", "md")} onClick={() => void submit("create")}>連携コードを発行</button>
        {issued && <div><label htmlFor="issued-link-code" className="text-sm">自分のGoogleアカウントに入力するコード</label><input id="issued-link-code" readOnly value={issued} className="mt-1 w-full rounded border p-2 font-mono" onFocus={(e) => e.target.select()} /></div>}
      </>}
      {status?.google && <>
        <p className="text-sm">LINEの学習リンクを開き、「設定」で連携コードを発行してください。自分のLINEアカウントのコードだけを入力してください。</p>
        <label htmlFor="account-link-code" className="block text-sm">LINEで発行した連携コード</label>
        <input id="account-link-code" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" spellCheck={false} className="w-full rounded border p-2 font-mono" />
        <button type="button" disabled={busy || !code.trim()} className={buttonClass("primary", "md")} onClick={() => void submit("complete")}>学習記録を統合して連携</button>
      </>}
    </>}
    {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
  </section>;
}
