// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import AttributionCapture from "@/components/growth/AttributionCapture";
import { ATTRIBUTION_COOKIE, parseAttributionCookie } from "@/lib/growth/attributionCookie";
const search="?utm_source=x&utm_medium=social&utm_campaign=organic_x&utm_content=x-abc&ref=x-abc";
function cookie() { return document.cookie.split(";").map(c=>c.trim()).find(c=>c.startsWith(`${ATTRIBUTION_COOKIE}=`))?.slice(ATTRIBUTION_COOKIE.length+1); }
beforeEach(()=>{ document.cookie=`${ATTRIBUTION_COOKIE}=; Max-Age=0; Path=/`; });
afterEach(()=>{ cleanup(); document.cookie=`${ATTRIBUTION_COOKIE}=; Max-Age=0; Path=/`; window.history.replaceState(null,"","/"); });
describe("X post clicks preserve first touch",()=>{
  it.each(["google","beta","x-earlier"])("preserves the existing %s attribution when an X post has ref", source=>{
    const original=encodeURIComponent(JSON.stringify({s:source,r:source,c:"old",t:Date.now()}));
    document.cookie=`${ATTRIBUTION_COOKIE}=${original}; Path=/`;
    window.history.replaceState(null,"",`/lp${search}`);
    render(<AttributionCapture/>);
    expect(cookie()).toBe(original);
  });
  it("captures an X post as the first visit",()=>{
    window.history.replaceState(null,"",`/lp${search}`);
    render(<AttributionCapture/>);
    expect(parseAttributionCookie(cookie())).toMatchObject({utmSource:"x",ref:"x-abc",utmCampaign:"organic_x"});
  });
  it("keeps the existing explicit beta invitation override",()=>{
    document.cookie=`${ATTRIBUTION_COOKIE}=${encodeURIComponent(JSON.stringify({s:"google",t:Date.now()}))}; Path=/`;
    window.history.replaceState(null,"","/lp?ref=beta");
    render(<AttributionCapture/>);
    expect(parseAttributionCookie(cookie())?.ref).toBe("beta");
  });
});
