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

export async function getVisiblePosts() {
  const posts = await getCollection("posts", isVisiblePost);

  return sortPosts(posts);
}
