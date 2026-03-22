import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/**
 * Frontmatter contract for markdown posts (see docs/authoring-posts.md).
 * Draft posts validate like any other entry; routes should omit `draft: true` in production.
 */
const posts = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/posts" }),
  schema: z
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
    .superRefine((data, ctx) => {
      if (
        data.updatedDate &&
        data.updatedDate.getTime() < data.pubDate.getTime()
      ) {
        ctx.addIssue({
          code: "custom",
          message: "`updatedDate` must be on or after `pubDate`.",
          path: ["updatedDate"],
        });
      }
    }),
});

export const collections = { posts };
