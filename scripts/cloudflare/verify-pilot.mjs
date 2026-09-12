import { createHmac } from "node:crypto";

const base = new URL(process.env.PILOT_BASE_URL ?? "http://127.0.0.1:3000");
const results = [];

function skip(name, reason) {
  results.push({ name, status: null, passed: true, verified: false, reason });
}

async function check(name, path, init, expected) {
  try {
    const response = await fetch(new URL(path, base), {
      redirect: "manual",
      ...init,
    });
    const passed = expected(response);
    results.push({ name, status: response.status, passed, verified: true });
  } catch {
    results.push({ name, status: null, passed: false, verified: true });
  }
}

await check("public login", "/login", {}, (response) => response.status === 200);

if (process.env.PILOT_EXPECT_AUTH_GATE === "1") {
  await check("protected today", "/today", {}, (response) => {
    const location = response.headers.get("location");
    return (
      [302, 303, 307, 308].includes(response.status) &&
      location !== null &&
      new URL(location, base).pathname === "/login"
    );
  });
} else {
  skip("protected today", "PILOT_EXPECT_AUTH_GATE is not enabled");
}

await check(
  "unauthenticated progress save",
  "/api/progress/save",
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  },
  (response) => response.status === 401,
);

if (process.env.LINE_CHANNEL_SECRET) {
  const body = '{"events":[]}';
  await check(
    "invalid LINE signature",
    "/api/line/webhook",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-line-signature": "invalid",
      },
      body,
    },
    (response) => response.status === 401,
  );

  const signature = createHmac("sha256", process.env.LINE_CHANNEL_SECRET)
    .update(body)
    .digest("base64");
  await check(
    "valid empty LINE event",
    "/api/line/webhook",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-line-signature": signature,
      },
      body,
    },
    (response) => response.status === 200,
  );
} else {
  skip("LINE webhook signatures", "LINE_CHANNEL_SECRET is unavailable");
}

if (process.env.STRIPE_WEBHOOK_SECRET) {
  await check(
    "invalid Stripe signature",
    "/api/billing/webhook",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": "t=0,v1=invalid",
      },
      body: "{}",
    },
    (response) => response.status === 400,
  );
} else {
  await check(
    "Stripe webhook fails closed when unconfigured",
    "/api/billing/webhook",
    { method: "POST", body: "{}" },
    (response) => response.status === 503,
  );
}

console.log(JSON.stringify({ baseURL: base.origin, results }, null, 2));
if (results.some((result) => !result.passed)) process.exitCode = 1;
