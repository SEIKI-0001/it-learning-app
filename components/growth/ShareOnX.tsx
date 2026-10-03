import { buildXShareUrl } from "@/lib/growth/share";

/**
 * 「Xでシェア」リンク。JS 不要の <a> なのでサーバー/クライアントどちらでも使える。
 * 見た目は呼び出し側の className に任せる（公開ページとアプリ内でトーンが違うため）。
 */
export default function ShareOnX({
  text,
  path,
  campaign,
  className,
  label = "Xでシェア",
}: {
  text: string;
  path: string;
  campaign: string;
  className?: string;
  label?: string;
}) {
  return (
    <a
      href={buildXShareUrl({ text, path, campaign })}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {label}
    </a>
  );
}
