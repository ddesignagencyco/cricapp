import { news } from '../data/news';
import { NewsArticle } from '../types/index';

export function fetchNews(
  { category, type }: { category?: string; type?: string } = {}
): NewsArticle[] {
  let list = news;
  if (category) list = list.filter((n) => n.category === category);
  if (type) list = list.filter((n) => n.type === type);
  return list;
}

export function fetchNewsById(id: string): NewsArticle | null {
  return news.find((n) => n.id === id) || null;
}

export { news };
