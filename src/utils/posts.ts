import { getCollection, type CollectionEntry } from "astro:content";

export type BlogPost = CollectionEntry<"posts">;

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

export async function getVisiblePosts() {
  const posts = await getCollection("posts", isVisiblePost);

  return sortPosts(posts);
}
