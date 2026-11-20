import { rapidGet } from './providers/rapidHttp.js';

const provider = 'cricbuzz-content';
const CONTENT_TTL_S = Number(process.env.CRICBUZZ_CONTENT_TTL_S || 600);

const host = () =>
  process.env.RAPIDAPI_CRICBUZZ_HOST ||
  process.env.RAPIDAPI_HOST ||
  'cricbuzz-cricket.p.rapidapi.com';

const budget = () => {
  const limit = Number(process.env.RAPIDAPI_CRICBUZZ_MONTHLY_BUDGET || 0);
  return limit > 0 ? { period: 'month', limit } : undefined;
};

export function cricbuzzConfigured() {
  return Boolean(process.env.RAPIDAPI_KEY && host());
}

function get(path, query = {}, ttlSeconds = CONTENT_TTL_S) {
  return rapidGet({
    provider,
    cacheNamespace: 'cricbuzz-content',
    host: host(),
    path,
    query,
    ttlSeconds,
    budget: budget(),
  });
}

export async function fetchNewsList({ lastId } = {}) {
  const query = {};
  if (lastId != null && lastId !== '') query.lastId = lastId;
  return get('news/v1/index', query, 300);
}

export async function fetchNewsDetail(newsId) {
  return get(`news/v1/detail/${newsId}`, {}, 3600);
}

export async function fetchPhotoGalleries({ pt } = {}) {
  const query = {};
  if (pt != null && pt !== '') query.pt = pt;
  return get('photos/v1/index', query, 600);
}

export async function fetchPhotoGallery(galleryId) {
  return get(`photos/v1/detail/${galleryId}`, {}, 3600);
}

export async function fetchBuzzVideos({ itemOrder } = {}) {
  const query = {};
  if (itemOrder != null && itemOrder !== '') query.itemOrder = itemOrder;
  return get('buzz/v1/index', query, 600);
}

export function cricbuzzImageUrl(imageId, { width = 657, height = 0 } = {}) {
  if (imageId == null || imageId === '') return null;
  const id = String(imageId).replace(/^c/i, '');
  return `https://static.cricbuzz.com/a/img/v1/${width}x${height}/i1/c${id}/i.jpg`;
}

export function cricbuzzThumbUrl(imageId) {
  return cricbuzzImageUrl(imageId, { width: 400, height: 225 });
}
