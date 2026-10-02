-- Advertisement delivery config for the public site, stored on the single
-- `site_settings` row (id = 'default'). One JSONB document holding the mode
-- (off / house / adsense), the Google AdSense publisher id, a fallback ad unit
-- per size and per-placement overrides. `{}` is normalised to the defaults by
-- the API (`normalizeAdConfig`), so an existing row keeps rendering the built-in
-- house ads until an admin configures AdSense.
-- AlterTable
ALTER TABLE "site_settings"
    ADD COLUMN "ads" JSONB NOT NULL DEFAULT '{}';
