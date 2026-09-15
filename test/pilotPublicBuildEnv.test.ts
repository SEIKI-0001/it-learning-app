import { describe, expect, it } from "vitest";
import { pilotPublicDefines } from "../scripts/cloudflare/public-build-env";

describe("pilot browser configuration", () => {
  it("embeds the same public auth configuration used by the Worker", () => {
    expect(pilotPublicDefines({
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_test",
      NEXT_PUBLIC_APP_URL: "https://pilot.example",
    })).toEqual({
      "process.env.NEXT_PUBLIC_SUPABASE_URL": '"https://test.supabase.co"',
      "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": '"sb_publishable_test"',
      "process.env.NEXT_PUBLIC_APP_URL": '"https://pilot.example"',
    });
  });

  it("does not embed server secrets or unknown public-prefixed keys", () => {
    expect(pilotPublicDefines({
      SUPABASE_SERVICE_ROLE_KEY: "private",
      SESSION_SECRET: "private",
      NEXT_PUBLIC_ACCIDENTAL_SECRET: "private",
      NEXT_PUBLIC_LINE_ADD_FRIEND_URL: "https://line.me/test",
    })).toEqual({
      "process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL": '"https://line.me/test"',
    });
  });

  it("rejects non-string public configuration without printing values", () => {
    expect(() => pilotPublicDefines({NEXT_PUBLIC_SUPABASE_URL: {secret: "private"}}))
      .toThrow("Invalid public Worker variable: NEXT_PUBLIC_SUPABASE_URL");
  });
});
