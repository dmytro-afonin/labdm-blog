import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";

import { siteConfig } from "./src/config/site";

export default defineConfig({
  site: siteConfig.url,
  /** Static prerender by default; opt out with `prerender: false` on server routes (e.g. `/api/subscribe`). */
  output: "static",
  adapter: vercel({
    /** Edge middleware (e.g. `x-request-id` on responses). */
    middlewareMode: "edge",
  }),
});
