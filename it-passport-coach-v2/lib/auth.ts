export function isAdminEnabled(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function isValidBasicAuth(authorizationHeader: string | null): boolean {
  if (!process.env.ADMIN_PASSWORD) {
    return false;
  }

  if (!authorizationHeader?.startsWith("Basic ")) {
    return false;
  }

  const encoded = authorizationHeader.slice("Basic ".length);
  const decoded = atob(encoded);
  const [username, password] = decoded.split(":");
  const expectedUsername = process.env.ADMIN_USERNAME || "admin";

  return username === expectedUsername && password === process.env.ADMIN_PASSWORD;
}
