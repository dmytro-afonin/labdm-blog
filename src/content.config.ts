import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/** Kebab-case slug used in URLs and RSS (must match the post filename stem). */
const slugSchema = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase kebab-case (letters, digits, single hyphens).",
  );

/**
 * Frontmatter contract for markdown posts (see docs/authoring-posts.md).
 * Draft posts validate like any other entry; routes should omit `draft: true` in production.
 */
const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string().min(1),
    /** URL segment; keep aligned with the file name (`{slug}.md`). */
    slug: slugSchema,
    description: z.string().min(1),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    excerpt: z.string().optional(),
    /** When true, omit from production listings and feeds (see authoring guide). */
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { posts };
