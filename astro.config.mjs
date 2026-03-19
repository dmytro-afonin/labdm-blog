import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";

export default defineConfig({
  site: "https://blog.labdm.dev",
  output: "static",
  adapter: vercel(),
});
