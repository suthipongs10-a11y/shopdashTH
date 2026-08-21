import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/** บทความที่เผยแพร่แล้ว เรียงตาม order แล้วตามวันที่ล่าสุด */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.sort((a, b) => {
    if (a.data.order !== b.data.order) return a.data.order - b.data.order;
    return b.data.publishDate.getTime() - a.data.publishDate.getTime();
  });
}

export async function getFeaturedPosts(limit = 3): Promise<Post[]> {
  return (await getPosts()).slice(0, limit);
}

export function postPath(post: Post): string {
  return `/blog/${post.id}/`;
}

export function formatDateTh(date: Date): string {
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Bangkok',
  }).format(date);
}
