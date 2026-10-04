/**
 * X（旧Twitter）への共有リンクを作る。
 * 共有されたURLには utm を付け、どの共有から登録が生まれたかを signup_attributions で追えるようにする。
 */
export const SHARE_SITE_URL = "https://shikaku-mochit.com";

export function withShareUtm(pathOrUrl: string, campaign: string): string {
  const url = new URL(pathOrUrl, SHARE_SITE_URL);
  url.searchParams.set("utm_source", "x");
  url.searchParams.set("utm_medium", "share");
  url.searchParams.set("utm_campaign", campaign);
  return url.toString();
}

export function buildXShareUrl(input: {
  text: string;
  path: string;
  campaign: string;
  hashtags?: string[];
}): string {
  const intent = new URL("https://x.com/intent/post");
  intent.searchParams.set("text", input.text);
  intent.searchParams.set("url", withShareUtm(input.path, input.campaign));
  const tags = input.hashtags ?? ["ITパスポート"];
  if (tags.length > 0) intent.searchParams.set("hashtags", tags.join(","));
  return intent.toString();
}
