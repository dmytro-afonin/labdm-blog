import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/**
 * Frontmatter contract for markdown posts (see docs/authoring-posts.md).
 * Draft posts validate like any other entry; routes should omit `draft: true` in production.
 *
 * Cross-field date check uses `.transform()` instead of `.superRefine()` / `.refine()`.
 * Astro content sync calls `.extend({ $schema })` on ZodObject schemas; refined objects
 * throw under some Zod 4.1.x builds when that path runs. Transform yields a pipe schema,
 * so that path is skipped while validation still runs at parse time. The app also pins
 * `zod@4.3.6` (direct dep + overrides) so local / CI / Vercel resolve one Zod version.
 */
const postSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    excerpt: z.string().optional(),
    /** When true, omit from production listings and feeds (see authoring guide). */
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
  })
  .transform((data, ctx) => {
    if (
      data.updatedDate &&
      data.updatedDate.getTime() < data.pubDate.getTime()
    ) {
      ctx.addIssue({
        code: "custom",
        message: "`updatedDate` must be on or after `pubDate`.",
        path: ["updatedDate"],
      });
      return z.NEVER;
    }
    return data;
  });

const posts = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/posts" }),
  schema: postSchema,
});

export const collections = { posts };
