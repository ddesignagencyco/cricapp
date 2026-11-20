import crypto from 'crypto';
import { query } from './db.js';
import { createLogger } from './logger.js';
import { shouldSync, markSynced } from './refState.js';
import {
  cricbuzzConfigured,
  fetchPhotoGalleries,
  fetchPhotoGallery,
  fetchBuzzVideos,
  cricbuzzImageUrl,
  cricbuzzThumbUrl,
} from './cricbuzzContent.js';

const log = createLogger('gallery');

const GALLERY_SYNC_INTERVAL_MS = Number(process.env.GALLERY_SYNC_INTERVAL_MS || 6 * 3600e3);
const CRICBUZZ_GALLERY_ENABLED =
  String(process.env.CRICBUZZ_GALLERY_SYNC ?? 'true').toLowerCase() !== 'false';
const CRICBUZZ_GALLERY_LIMIT = Math.max(0, Number(process.env.CRICBUZZ_GALLERY_LIMIT || 6));
const CRICBUZZ_PHOTOS_PER_GALLERY = Math.max(
  0,
  Number(process.env.CRICBUZZ_PHOTOS_PER_GALLERY || 12),
);
const CRICBUZZ_BUZZ_ENABLED =
  String(process.env.CRICBUZZ_BUZZ_SYNC ?? 'true').toLowerCase() !== 'false';
const CRICBUZZ_BUZZ_LIMIT = Math.max(0, Number(process.env.CRICBUZZ_BUZZ_LIMIT || 12));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Cricbuzz buzz clips arrive as Kaltura HLS playlists (`format/applehttp/.../a.m3u8`),
 * which the web gallery's player cannot play. The same signed manifest has a direct
 * `format/url/.../a.mp4` variant, so keep the token and swap the format.
 */
function directVideoUrl(url) {
  if (!url) return url;
  const value = String(url);
  if (!/kaltura\.com\/.*playManifest\//i.test(value)) return value;
  if (!/format\/applehttp/i.test(value) || !/a\.m3u8(?:\?|$)/i.test(value)) return value;
  return value
    .replace(/format\/applehttp/i, 'format/url')
    .replace(/a\.m3u8(?=\?|$)/i, 'a.mp4');
}

function parseEpochMs(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const ms = n > 1e12 ? n : n * 1000;
  const d = new Date(ms);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

async function upsertGalleryItem(item) {
  const existing = await query(`SELECT id FROM gallery_media WHERE public_id = $1`, [item.publicId]);
  if (existing.rows.length) {
    await query(
      `UPDATE gallery_media SET
         title = COALESCE($1, title),
         caption = COALESCE($2, caption),
         type = $3,
         purpose = COALESCE(purpose, 'gallery'),
         url = $4,
         resource_type = $5,
         thumbnail_url = COALESCE($6, thumbnail_url),
         duration = COALESCE($7, duration),
         width = COALESCE($8, width),
         height = COALESCE($9, height),
         format = COALESCE($10, format),
         bytes = COALESCE($11, bytes),
         updated_at = NOW()
       WHERE public_id = $12`,
      [
        item.title,
        item.caption,
        item.type,
        item.url,
        item.resourceType,
        item.thumbnailUrl,
        item.duration,
        item.width,
        item.height,
        item.format,
        item.bytes,
        item.publicId,
      ],
    );
    return { inserted: 0, updated: 1 };
  }

  await query(
    `INSERT INTO gallery_media
      (id, title, caption, type, purpose, url, public_id, resource_type, thumbnail_url, duration, width, height, format, bytes, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, COALESCE($15::timestamptz, NOW()), NOW())
     ON CONFLICT (public_id) DO NOTHING`,
    [
      crypto.randomUUID(),
      item.title,
      item.caption,
      item.type,
      item.purpose || 'gallery',
      item.url,
      item.publicId,
      item.resourceType,
      item.thumbnailUrl,
      item.duration,
      item.width,
      item.height,
      item.format,
      item.bytes,
      item.createdAt,
    ],
  );
  return { inserted: 1, updated: 0 };
}

export async function syncCricbuzzPhotoGalleries() {
  if (!CRICBUZZ_GALLERY_ENABLED || CRICBUZZ_GALLERY_LIMIT <= 0) return null;
  if (!cricbuzzConfigured()) {
    log.debug('cricbuzz gallery sync skipped (RAPIDAPI not configured)');
    return null;
  }
  if (!(await shouldSync('gallery', 'cricbuzz:photos'))) {
    log.debug('cricbuzz gallery sync skipped (fresh)');
    return null;
  }

  const index = await fetchPhotoGalleries();
  const galleries = (index?.photoGalleryInfoList || [])
    .map((g) => g?.photoGalleryInfo || g)
    .filter((g) => g && (g.galleryId || g.id))
    .slice(0, CRICBUZZ_GALLERY_LIMIT);

  let inserted = 0;
  let updated = 0;
  let photos = 0;

  for (const g of galleries) {
    const galleryId = g.galleryId || g.id;
    let detail = null;
    try {
      detail = await fetchPhotoGallery(galleryId);
    } catch (err) {
      log.warn('cricbuzz gallery detail failed', { galleryId, error: err.message });
      continue;
    }

    const headline = detail?.headline || g.headline || g.hline || 'Cricbuzz gallery';
    const intro = detail?.intro || null;
    const published = parseEpochMs(detail?.publishedTime || g.publishedTime);
    const items = (detail?.photoGalleryDetails || detail?.photos || [])
      .filter((p) => p && (p.imageId || p.id))
      .slice(0, CRICBUZZ_PHOTOS_PER_GALLERY);

    for (const p of items) {
      const imageId = p.imageId || p.id;
      const url = cricbuzzImageUrl(imageId, { width: 1200, height: 0 });
      if (!url) continue;
      const thumb = cricbuzzThumbUrl(imageId) || url;
      const caption = p.caption || intro || headline;
      const res = await upsertGalleryItem({
        title: headline,
        caption: caption ? String(caption).slice(0, 2000) : null,
        type: 'image',
        purpose: 'gallery',
        url,
        publicId: `cricbuzz:image:${galleryId}:${imageId}`,
        resourceType: 'image',
        thumbnailUrl: thumb,
        duration: null,
        width: null,
        height: null,
        format: 'jpg',
        bytes: null,
        createdAt: published,
      });
      inserted += res.inserted;
      updated += res.updated;
      photos += 1;
    }

    await sleep(150);
  }

  await markSynced('gallery', 'cricbuzz:photos', 60 * 60e3);
  log.info('cricbuzz photo galleries synced', { galleries: galleries.length, photos, inserted, updated });
  return { galleries: galleries.length, photos, inserted, updated };
}

export async function syncCricbuzzBuzzVideos() {
  if (!CRICBUZZ_BUZZ_ENABLED || CRICBUZZ_BUZZ_LIMIT <= 0) return null;
  if (!cricbuzzConfigured()) {
    log.debug('cricbuzz buzz sync skipped (RAPIDAPI not configured)');
    return null;
  }
  if (!(await shouldSync('gallery', 'cricbuzz:buzz'))) {
    log.debug('cricbuzz buzz sync skipped (fresh)');
    return null;
  }

  const data = await fetchBuzzVideos();
  const list = Array.isArray(data) ? data : data?.buzzList || [];
  const videos = list
    .map((x) => x?.buzzItem || x)
    .filter((v) => v && String(v.itemType || '').toLowerCase() === 'video' && (v.itemId || v.id))
    .slice(0, CRICBUZZ_BUZZ_LIMIT);

  let inserted = 0;
  let updated = 0;
  let imported = 0;

  for (const v of videos) {
    const rawUrl = v.videoUrl || v.playbackUrl || v.hlsUrl || v.url;
    const videoUrl = directVideoUrl(rawUrl);
    if (!videoUrl) continue; // need a playable URL for our video player
    const imageId = v.imageId || v.thumbImageId;
    const thumb = imageId ? cricbuzzImageUrl(imageId, { width: 600, height: 338 }) : null;
    const title = v.title || v.headline || 'Cricbuzz video';
    const ts = parseEpochMs(v.timeStamp || v.timestamp || v.publishTime);
    const res = await upsertGalleryItem({
      title: String(title).slice(0, 150),
      caption: v.shareURL ? `Source: ${v.shareURL}` : null,
      type: 'short',
      purpose: 'gallery',
      url: String(videoUrl),
      publicId: `cricbuzz:video:${v.itemId || v.id}`,
      resourceType: 'video',
      thumbnailUrl: thumb,
      duration: null,
      width: null,
      height: null,
      format: videoUrl.includes('/a.mp4') ? 'mp4' : 'video',
      bytes: null,
      createdAt: ts,
    });
    inserted += res.inserted;
    updated += res.updated;
    imported += 1;
  }

  await markSynced('gallery', 'cricbuzz:buzz', 30 * 60e3);
  log.info('cricbuzz buzz videos synced', { seen: videos.length, imported, inserted, updated });
  return { seen: videos.length, imported, inserted, updated };
}

export async function syncCricbuzzGalleryContent() {
  let photos = null;
  let videos = null;
  try {
    photos = await syncCricbuzzPhotoGalleries();
  } catch (err) {
    log.error('cricbuzz photo gallery sync failed', { error: err.message });
  }
  try {
    videos = await syncCricbuzzBuzzVideos();
  } catch (err) {
    log.error('cricbuzz buzz sync failed', { error: err.message });
  }
  return { photos, videos };
}

export async function startGallerySync() {
  try {
    await syncCricbuzzGalleryContent();
  } catch (err) {
    log.error('initial gallery sync failed', { error: err.message });
  }
  if (GALLERY_SYNC_INTERVAL_MS > 0) {
    setInterval(() => {
      syncCricbuzzGalleryContent().catch((err) =>
        log.error('gallery periodic sync failed', { error: err.message }),
      );
    }, GALLERY_SYNC_INTERVAL_MS);
  }
}
