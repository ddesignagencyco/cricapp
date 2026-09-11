# CricApp — Backend update for leadership

**Period:** 10–11 September 2026  
**Owner:** Backend  
**Audience:** Product / engineering leadership  
**Tracker:** [`docs/Cricket-project-roadmap-progress.md`](./Cricket-project-roadmap-progress.md)

---

## 1. Why this sprint mattered

The sports data API was already serving matches, teams, PSL, and news. This pass made the **user, CMS, and admin** layer safe to put in front of a real admin panel and a browser app:

- Sessions work the way a website expects (cookie, not a token in JSON).
- Unverified accounts cannot log in.
- One protected owner account cannot be deleted by other admins.
- Editorial content uses **categories and slugs**, not leftover “featured / breaking / tags” fields.
- Admins can upload article images.
- Live scores no longer list finished games as live.
- The dashboard can show **favorites by type** (team / player / match).

Frontend login, CMS screens, and Predictions / Odds were **not** in this sprint.

---

## 2. What shipped

### Authentication and accounts

| Change | Why it matters |
|--------|----------------|
| HttpOnly cookie `cricapp_access_token` on login; `POST /api/auth/logout` | Browser session without exposing JWT in JavaScript |
| Signup returns **no** access token | Users must verify email first |
| Unverified login → **403** | Stops unverified access to comments, favorites, CMS |
| Password reset is **email link only** (`token` + `tokenId`) | OTP path removed |
| Branded CricApp verify / reset emails | SMTP verified locally (Gmail app password) |
| Verification token written **before** mail send | Signup no longer races with DB cleanup or failed mail |
| `isSuperAdmin` + `DELETE /api/admin/users/:id` | Owner cannot be demoted or deleted |

### Content and CMS

| Change | Why it matters |
|--------|----------------|
| Full category CRUD by id or slug | Admin panel can manage taxonomy |
| Article + category SEO slugs | Shareable `/news/{slug}` URLs |
| Title max **50 words** | Enforced in the API, not only in UI |
| Removed `isFeatured`, `isBreaking`, `tags` | Categories are the only editorial grouping |
| `POST /api/admin/media/upload` | Cloudinary image for `imageUrl` (admin, 10 MB, image types only) |

### Live product quality

| Change | Why it matters |
|--------|----------------|
| `GET /api/matches/live` uses Postgres `status = live` | Completed matches no longer appear as live |
| Ingestion updates Redis when reference sync completes a match | Live set stays in sync even if poll missed the finish |
| `GET/POST /api/streams/:id/comments` | Chat while watching a stream |
| `GET /api/tours` paginated `{ data, meta }` | Same list contract as tournaments / teams |
| `GET /api/admin/analytics` | Adds **tournaments**, **tours**, and **favorites.types** |

Example analytics shape now returned:

```json
{
  "users": 7,
  "matches": 0,
  "teams": 0,
  "players": 0,
  "tournaments": 0,
  "tours": 3,
  "comments": 1,
  "favorites": {
    "total": 0,
    "types": { "team": 0, "player": 0, "match": 0 }
  },
  "streams": 1,
  "pendingReports": 0,
  "publishedArticles": 0,
  "totalShares": 0
}
```

(Live counts depend on ingestion; match/team numbers drop if the local DB was reset or poll is 429-blocked.)

---

## 3. Quality bar

- Integration tests run against a **separate** `cricapp_test` database so `npm test` does not wipe local product data.
- Focused suites for auth, admin, and news: **28/28 passing** after the verification-token race fix.
- Live smoke on 11 Sep: cookie login, 403 unverified, categories, 50-word reject, tours pagination, live-match filter, stream comments, analytics, Cloudinary **201**.

---

## 4. Still open (honest blockers)

| Item | Status |
|------|--------|
| Sportradar **live poll** | Blocked on **429 / trial key**. Cached/reference data still works when present. |
| **Frontend** signup, login, profile, favorites UI, news/streams wiring | Not started in this sprint (backend contracts are ready). |
| Predictions (Phase 13) and Odds (Phase 14) | Not started. |
| CD / staging | Still manual deploy. |
| Production RSS list, Urdu workflow, Google News sitemap | Editorial backlog. |

---

## 5. What we need from leadership

1. **Sportradar production (or paid) key** so live scores can poll again.
2. **Frontend capacity** to consume cookie auth (`credentials: 'include'`), CMS, and analytics.
3. Confirm Cloudinary stays the image store for editorial (already wired).
4. Decision on Predictions vs Odds as the next **new** backend domain once CMS+auth UI is in flight.

---

## 6. Suggested talking points (2 minutes)

1. Users now have a real session model: verify email, cookie login, protected superadmin.  
2. CMS is admin-ready: categories, slugs, image upload, no unused featured/breaking flags.  
3. Live list and stream comments match the product spec.  
4. Admin dashboard can chart favorites by type.  
5. Live cricket feed is the remaining **external** risk; frontend wiring is the remaining **internal** one.

---

*This note covers backend work completed 10–11 Sep 2026. It does not claim frontend or Sportradar live polling as done.*
