import { afterEach, describe, expect, it } from "vitest";
import { bookOrderFlag } from "@/lib/bookOrderFlag";

// 参考書順は opt-in で公開している（利用者が選んだときだけ）。ビルド時の環境変数で止められる。

const original = process.env.NEXT_PUBLIC_BOOK_ORDER_MODE;
afterEach(() => {
  process.env.NEXT_PUBLIC_BOOK_ORDER_MODE = original;
});

describe("bookOrderFlag", () => {
  it("is released as opt-in when nothing overrides it", () => {
    delete process.env.NEXT_PUBLIC_BOOK_ORDER_MODE;
    expect(bookOrderFlag()).toBe("optin");
    process.env.NEXT_PUBLIC_BOOK_ORDER_MODE = "  ";
    expect(bookOrderFlag()).toBe("optin");
  });

  it("can be turned off at build time for an emergency rollback", () => {
    process.env.NEXT_PUBLIC_BOOK_ORDER_MODE = "off";
    expect(bookOrderFlag()).toBe("off");
    // 不明な値は安全側（off）
    process.env.NEXT_PUBLIC_BOOK_ORDER_MODE = "on";
    expect(bookOrderFlag()).toBe("off");
  });
});
