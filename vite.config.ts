import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { cdnAdapter } from "@vinext/cloudflare/cache/cdn-adapter";
import { readFileSync } from "node:fs";
import { pilotPublicDefines } from "./scripts/cloudflare/public-build-env";

// Keep this configuration strict JSON so runtime and browser use one source.
const workerConfig = JSON.parse(
  readFileSync(new URL("./wrangler.jsonc", import.meta.url), "utf8"),
);

export default defineConfig({
  define: pilotPublicDefines(workerConfig.vars),
  plugins: [
    vinext({
      cache: { cdn: cdnAdapter() },
    }),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
