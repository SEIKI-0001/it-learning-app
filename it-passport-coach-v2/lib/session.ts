export const WEB_USER_ID = "web-demo-user";

export function lineUserIdToAppUserId(lineUserId: string): string {
  return `line-${lineUserId}`;
}
