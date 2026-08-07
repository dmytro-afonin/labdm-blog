import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";

import { siteConfig } from "./src/config/site";

export default defineConfig({
  site: siteConfig.url,
  /** Static prerender by default; opt out with `prerender: false` on server routes (e.g. `/api/subscribe`). */
  output: "static",
  adapter: vercel({
    /**
     * Classic middleware runs in the Node request path (not a separate Edge
     * proxy). Edge mode forwards POST bodies via fetch and breaks when API
     * routes return redirects ("one-time-use body" / missing duplex).
     */
    middlewareMode: "classic",
  }),
});
