import { createHmac } from "node:crypto";

let base = null;
try {
  base = new URL(process.env.PILOT_BASE_URL ?? "http://127.0.0.1:3000");
} catch {
  // Do not pass the input or native error through: either may contain credentials.
}
const results = [];

function skip(name, reason) {
  results.push({ name, status: null, passed: true, verified: false, reason });
}

async function check(name, path, init, expected) {
  let response;
  try {
    response = await fetch(new URL(path, base), {
      redirect: "manual",
      ...init,
    });
  } catch {
    results.push({ name, status: null, passed: false, verified: false });
    return;
  }

  let passed = false;
  try {
    passed = expected(response);
  } catch {
    // An unusable HTTP response still means the contract was verified and failed.
  }
  results.push({ name, status: response.status, passed, verified: true });
}

if (base === null) {
  console.log(
    JSON.stringify(
      {
        baseURL: null,
        results,
        error: {
          code: "INVALID_PILOT_BASE_URL",
          message: "PILOT_BASE_URL must be a valid absolute URL",
        },
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} else {
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
}
