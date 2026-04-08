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

function countWords(content: string | undefined) {
  const matches = content?.match(/\b[\w'-]+\b/g);

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

export function getAdjacentPosts(posts: BlogPost[], currentPostId: BlogPost["id"]) {
  const currentIndex = posts.findIndex((post) => post.id === currentPostId);

  if (currentIndex === -1) {
    return {
      newerPost: null,
      olderPost: null,
    };
  }

  return {
    newerPost: currentIndex > 0 ? posts[currentIndex - 1] : null,
    olderPost:
      currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null,
  };
}

export async function getVisiblePosts() {
  const posts = await getCollection("posts", isVisiblePost);

  return sortPosts(posts);
}
