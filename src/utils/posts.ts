import { getCollection, type CollectionEntry } from "astro:content";

export type BlogPost = CollectionEntry<"posts">;
const WORDS_PER_MINUTE = 200;

function comparePostsByDateDesc(left: BlogPost, right: BlogPost) {
  return right.data.pubDate.getTime() - left.data.pubDate.getTime();
}

export function isVisiblePost(post: BlogPost) {
  return import.meta.env.DEV || !post.data.draft;
}

export function sortPosts(posts: BlogPost[]) {
  return [...posts].sort(comparePostsByDateDesc);
}

export function getPostUrl(post: Pick<BlogPost, "id">) {
  return `/posts/${post.id}/`;
}

export function slugifyTag(tag: string) {
  const slug = tag
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug === "" ? "tag" : slug;
}

export function getTagUrl(tag: string) {
  return `/tags/${slugifyTag(tag)}/`;
}

export function getAllTagSlugsFromPosts(posts: BlogPost[]) {
  return [...new Set(posts.flatMap((post) => post.data.tags.map(slugifyTag)))];
}

export function getPostsForTagSlug(posts: BlogPost[], slug: string) {
  return posts.filter((post) =>
    post.data.tags.some((tag) => slugifyTag(tag) === slug),
  );
}

export function formatPostDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

function normalizeMarkdownBodyForWordCount(body: string | undefined) {
  if (body === undefined || body === "") {
    return "";
  }

  let text = body;
  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/`[^`\n]+`/g, " ");
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1 ");
  text = text.replace(/!\[([^\]]*)\]\s*\[[^\]]*\]/g, "$1 ");
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1 ");
  text = text.replace(/\[([^\]]+)\]\s*\[[^\]]*\]/g, "$1 ");
  text = text.replace(/<[^>]+>/g, " ");

  return text;
}

function countWords(content: string | undefined) {
  const normalized = normalizeMarkdownBodyForWordCount(content);
  const matches = normalized.match(/\b[\w'-]+\b/g);

  return matches?.length ?? 0;
}

export function getReadingTimeMinutes(post: Pick<BlogPost, "body">) {
  return Math.max(1, Math.ceil(countWords(post.body) / WORDS_PER_MINUTE));
}

export function formatReadingTime(minutes: number) {
  return `${minutes} min read`;
}

export function getReadingTimeLabel(post: Pick<BlogPost, "body">) {
  return formatReadingTime(getReadingTimeMinutes(post));
}

/** Short date for quiet index lines (UTC). */
export function formatPostDateQuiet(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Richer index preview: excerpt + description when both exist and differ. */
export function previewBlurb(post: BlogPost) {
  const ex = post.data.excerpt?.trim();
  const de = post.data.description?.trim();
  if (ex && de && ex !== de) {
    return `${ex} — ${de}`;
  }
  return ex || de || "";
}

export async function getVisiblePosts() {
  const posts = await getCollection("posts", isVisiblePost);

  return sortPosts(posts);
}
