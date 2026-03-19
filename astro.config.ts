import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";

import { siteConfig } from "./src/config/site";

export default defineConfig({
  site: siteConfig.url,
  output: "static",
  adapter: vercel(),
});
