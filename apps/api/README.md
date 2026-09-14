# @cricapp/api

NestJS API for CricApp. Swagger is available at `/docs`; application routes use
the `/api` prefix.

## Authentication contract

- `POST /api/auth/signup` creates an unverified account and sends verification
  email. It does not create a session.
- `POST /api/auth/login` requires a verified email and sets the
  `cricapp_access_token` HttpOnly cookie.
- Browser clients must send requests with credentials enabled.
- `POST /api/auth/logout` clears the session cookie.
- Password reset uses the one-time link token only (`token` + `tokenId`).

Cookie security is configured through `AUTH_COOKIE_*` variables in
`.env.example`. Production deployments should use HTTPS and
`AUTH_COOKIE_SECURE=true`.

## Content contracts

- News articles and categories expose SEO slugs.
- Article titles are limited to 50 words.
- Categories replace article tags and featured/breaking flags.
- Category CRUD is under `/api/news/categories`.
- Stream comments use `/api/streams/:id/comments` and the shared moderation
  system.
- `/api/tours` returns the standard `{ data, meta }` paginated envelope.

## Administration

`isSuperAdmin` identifies the protected owner account. It cannot be deleted or
demoted by an admin. Configure `SUPERADMIN_*` and run `npm run prisma:seed` for
a fresh installation.

`GET /api/admin/analytics` includes tournaments, tours, and favorite totals
grouped by every stored `targetType`.

Upload article images with a multipart `file` field at
`POST /api/admin/media/upload`. The endpoint accepts JPEG, PNG, WebP, GIF, and
AVIF images up to 10 MB and returns a `url` suitable for the article
`imageUrl`. Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
`CLOUDINARY_API_SECRET` before using it.

## Realtime matches

SSE remains available at `/api/matches/live/stream` and
`/api/matches/:matchId/stream`. Socket.IO clients connect to the `/matches`
namespace. Listen for `live:update` globally, or emit `subscribe:match` with
`{ matchId }` and listen for `match:update`.

## Newsletter and contact

- `POST /api/newsletter/subscribe` with `{ email }`
- `POST /api/newsletter/unsubscribe` with `{ token }`
- `GET /api/admin/newsletter/subscribers` (admin)
- `POST /api/contact` with `{ name, email, message }`
- `GET /api/admin/contact-submissions` and
  `PATCH /api/admin/contact-submissions/:id/status` (admin)

## Gallery

- `GET /api/gallery?type=image|short|video` (public, paginated)
- `GET /api/gallery/:id` (public)
- `POST /api/gallery` (admin multipart upload: `file`, `type`, optional
  `title`/`caption`)
- `DELETE /api/gallery/:id` (admin; removes Cloudinary asset and DB row)

Shorts are limited to 30 seconds and videos to 60 seconds. Over-limit
Cloudinary uploads are deleted immediately and return `400`.
