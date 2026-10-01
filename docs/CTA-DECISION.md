# CTA & House Ads - what belongs in the frontend, what belongs in the backend, and what to delete

**Date:** 2026-10-01 · **From:** frontend engineering · **Status:** decision record, no code changed

**Scope:** the CTA question, raised separately from `docs/HANDOFF-backend.md` because that
document's §7 covers *third-party ad networks* and does not mention a CTA at all. This file
covers the thing §7 does not: **ads we sell ourselves, with a button of our own.**

**Relationship to `HANDOFF-backend.md` §7:** that section says a second network is "a new
adapter, not a rewrite" and that "nothing in `apps/api` needs to change." Both statements are
directionally right and literally wrong, for reasons in [§7](#7-corrections-to-the-other-handoff).
Nothing here contradicts §7's two asks (category-policy decision, optional per-placement
click counter); it adds the custom-ads question §7 never received.

---

# 1. The starting fact: there is no CTA system in this repo

Verified by searching `apps/*/src`, `services/`, `scripts/` and `docs/` for `CTA`, `cta`,
`callToAction`, `call_to_action`, `call-to-action`, `sponsor`, `sponsorship`, `advertorial`,
`selfPromo`, `promoted`, `houseAd`, `Bet now`, `Read more`.

**There is no CTA type, no CTA field, no CTA component, no CTA route, no CTA admin UI, no CTA
test, and no CTA table.**

What exists instead:

| Thing | Reality |
|---|---|
| `.float-cta` CSS class | A floating-button utility. Used by `AssistantLauncher.tsx:23` and `ScrollTopButton.tsx:21`. **Not** a CTA system. |
| `scripts/build-ad-creatives.mjs` | The only place `cta` is a real domain word — it paints button text (`'Shop Gear'`, `'Book Now'`) onto PNGs. **Orphaned**, see §5. |
| `View all` (17 call sites) | Navigation links. `SectionHeader`, `RelatedNewsPanel`, `SearchBar`, admin dashboard. **Not** ad CTAs. |
| AdSense's own CTA button | Rendered by Google **inside its iframe**. Not ours to build, style, retarget or measure. See §2. |

So this is not a migration. It is greenfield, and the useful question is not *"where does the
existing CTA code go"* but *"if we build one, where should it live."*

---

# 2. "CTA" is two different things. Decide which one is meant.

This is the source of the confusion, and the two have **opposite** answers.

### 2a. The ad network's CTA button — not ours, never ours

Adsterra, Ezoic, PropellerAds, InfoLinks and AdSense each render their own clickable button
("Ad · Bet now", "Shop now") **inside the ad iframe**, from their own script.

- We cannot style it, relabel it, or add `target="_blank"` — the network owns the document.
- We do not host it, do not store it, and do not serve it.
- Our only involvement is the `<ins data-ad-slot>` in `AdSlot.tsx` and the provider script in
  `AdProvider.tsx`.

**Backend involvement: none. There is nothing to build and nothing to own.**

This is the same category as the Google search box — embedded, not authored.

### 2b. Our own CTA — a link we control inside an ad we control

If we run a house ad (an in-house banner for a sponsor, an affiliate, a paid promo, or a
promotion for our own product), *we* author the button and *we* choose where it goes. That
needs a creative, a headline, a destination URL, and a way to change all three.

**This is the case this document is about.** It does not exist yet.

---

# 3. What is already correct in the frontend — keep it

The ad layer is genuinely well built and does not need rework:

| Component | Verdict |
|---|---|
| `lib/advertisements/registry.ts` | **Good.** 26 placements, one `shouldRenderAd()` gate applied inside `AdSlot` rather than at 26 call sites, so a new placement cannot forget a check. |
| `components/advertisements/AdSlot.tsx` | **Good.** Mode routing, ad-block/no-fill collapse, StrictMode-safe `adsbygoogle.push()` queueing. |
| `components/advertisements/HouseAd.tsx` | **Good, and the key finding.** Already a self-served renderer: image **and video** creatives (`mediaKind`, `HouseAd.tsx:41-66`), `Ad` disclosure badge, responsive 4-breakpoint leaderboard. It is a pure presentational leaf. |
| `AdConfigPanel.tsx` | **Good.** Validates, reconciles from the server response on save, dirty-checks semantically. |
| `shouldRenderAd()` | **Good.** `off` / route gate / per-placement toggle / slot-id resolution, in one place. |

**A house ad is already implemented as a rendering path.** What is missing is that its
*content* is hardcoded.

---

# 4. The actual gap: `house` mode is a placeholder, not a product

`house` is AdSense's own jargon for "the site's own ad," so the name is right. The
implementation is not.

```ts
// placements.ts — fixed, hardcoded, no admin control
'PowerPlay Fitness' / 'Built for Every Innings'
'NightWatch Optics'  / 'See every delivery'
'TourKit Luggage'    / 'Pack for the away series'
```

and every image is fetched live from a third-party service:

```ts
// placements.ts:116-119
`https://picsum.photos/seed/${seed}/${w}/${h}`
```

`AdConfigPanel` exposes **zero** fields for house mode. An admin cannot set a headline, a
destination URL, an image, a campaign, a start or end date, a priority, or a frequency cap.
The seven brand names in `placements.ts:26-84` are fiction.

**So the honest statement is: the delivery machinery for a custom ad exists and is tested;
only the creative input is missing.**

---

# 5. What to delete — verified dead code

These are removals, not refactors. Each was checked for live references before being listed.

| # | Remove | Evidence | Size / risk |
|---|---|---|---|
| 1 | `apps/web/scripts/build-ad-creatives.mjs` | Hardcodes an input path **outside the repo**: `const ASSETS = 'C:/Users/Sajid/.cursor/projects/c-Users-Sajid-Desktop-cric-info/assets'` (line 6). Not referenced by any `package.json` script. **Cannot run for anyone but its author.** | 124 lines, no risk |
| 2 | The 6 PNGs in `apps/web/public/advertisements/` | Searched all of `src` for every filename (`half-page-300x600.png`, `large-rectangle-336x280.png`, `leaderboard-970x90.png`, `mobile-320x100.png`, `rectangle-300x250.png`, `tablet-468x60.png`): **zero references.** Only the deleted generator produces them. | **~625 KB**, no risk |
| 3 | `DUMMY_AD_CREATIVES` and `RESPONSIVE_LEADERBOARD` | Both marked `@deprecated` (`placements.ts:147-161`), kept alive only by `catalogAds.test.ts`. Nothing in `src` imports them. | Small, low risk |
| 4 | `layout-sidebar` from `AD_PLACEMENTS` **or** give it a call site | It is a registered, admin-editable placement (`registry.ts:131`) with **no production call site** — zero matches for `placement="layout-sidebar"` in `src`. | Needs a decision, see below |

### On #4 — pick one, do not leave it half-wired

`layout-sidebar` is not merely dead weight; it makes a **user-visible claim false**. Four
separate places assert that the sidebar and the global top banner both render on `/odds` and
`/predictions` when `gamblingAds` is on — `registry.ts:205-208`, `AdConfigPanel.tsx:444-446`,
`adRegistry.test.ts:234-247`, and `HANDOFF-backend.md`. The banner half is true. **The sidebar
half is false.** An admin configuring that row sees it in the panel, sees it counted in the
"N of 26 placements have no ad unit id" warning, and sees no ad.

Two honest options:

- **Render it** in the shared layout, which makes the documentation true and uses a slot an
  admin can already configure — or
- **Delete it**, and fix the four comments that claim it exists.

Deleting without fixing the comments is not acceptable. Whichever is chosen, `AD_PLACEMENTS`
should stay at 26 or become 25 **consistently** — `adRegistry.test.ts:127-133` also asserts no
single group holds half the placements, so that check must be re-run.

---

# 6. Recommendation: frontend first, backend only on a trigger

**Do not build a backend ad system now. There are no sponsors.**

A `house_ads` table plus admin CRUD would be infrastructure for zero rows, and the moment it
lands it acquires fields that need migrations, permissions, scheduling, and an audit trail. That
is a poor trade against a need that has not happened yet.

The existing `site_settings.ads` JSONB column is already a working persistence seam. The
recommendation is to use it.

### Phase 1 — a real ad, still frontend-only (roughly one day, no migration)

Make house mode's creative data-driven, in one file, and give it a real destination:

```
apps/web/src/lib/advertisements/houseCreatives.ts   (new)
```

- A typed record per placement: `advertiser`, `headline`, `image`, `href`, `startsAt`, `endsAt`.
- `HouseAd` renders `href` and keeps its existing `Ad` badge and disclosure.
- Point `image` at local assets in `public/`, **replacing the `picsum.photos` dependency** —
  see the risks in §8.
- Reuse the existing per-placement enable/disable; no new admin surface is required for one
  house ad per placement.

This delivers a genuine CTA and touches no migration, no new endpoint, and no new table.

### Phase 2 — move to the backend only when one of these is true

Any one of these justifies `house_ads` as a table:

1. **More than one house ad needs rotating** across the same placement (weighted or by date).
2. **A flight window** — an ad that must start and stop without a deploy.
3. **Someone non-technical must edit the creative.** A `.ts` file is a code change and needs a
   review and a deploy; that is not a marketing workflow.
4. **You need to count clicks on your own ads** to decide whether a placement is worth it.

Only then: a `house_ads` table, `GET /api/ads/house` returning active creatives for a
placement, and a public delivery endpoint. That is the first moment backend work is honest.

### What must **not** be built now

- A `sponsor` / `advertorial` concept. No sponsors exist, and the naming commits us to a
  policy decision (disclosure, `rel="sponsored"`) that has not been made.
- A general "ad server". Three modes is not a platform.
- Per-placement click tracking. Unjustifiable until there is a second provider to compare
  against — which is the *existing* §7 ask, not a new one.

---

# 7. Corrections to the other handoff

`HANDOFF-backend.md` §7 says a second network is "a new adapter, not a rewrite" and that
"nothing in `apps/api` needs to change." The **conclusion is right**; the **reasoning
overstates** the frontend's shape. Correcting it here so nobody is surprised mid-implementation:

**There is no adapter interface.** There is no `Provider` type, no provider registry, and no
provider object. What exists is a mode string and a hardcoded branch:

```ts
// AdSlot.tsx:206-222
if (config.mode === 'house') return <HouseAd ... />;
...
return <AdSenseUnit ... />;

// AdProvider.tsx:33
value.mode === 'adsense' && clientId   // the only provider script gate
```

`AdPlacement` (`registry.ts:115-127`) describes a *placement*, not a provider. A second network
is a **third `else if`**, not a plug-in. Cheap, but not the abstraction §7 implies.

Five concrete couplings a new mode will hit — all small, all currently unguarded:

| # | Coupling | Location | What happens |
|---|---|---|---|
| 1 | `MODE_TITLES` / `MODE_DESCRIPTIONS` are `Record<AdMode, …>` | `AdConfigPanel.tsx:47,53` | **Will not typecheck** until both are extended. |
| 2 | `AD_MODES` is duplicated in two source files | `registry.ts:16`, `api/.../ad.config.ts:3` | Change one, forget the other. Also asserted in 2 tests (`adRegistry.test.ts:291`, `adConfigPanel.test.ts:130`). |
| 3 | **The privacy page is config-driven** | `privacy/page.tsx:65` | `advertisingLive = ads.mode === 'adsense' && Boolean(ads.clientId)`. **A new ad-bearing mode leaves the site claiming "We do not use third-party advertising trackers" while serving third-party ad trackers.** This is the one to not miss. |
| 4 | The mode radiogroup is `grid-cols-3` | `AdConfigPanel.tsx:364` | Hardcoded to 3 columns. A 4th mode wraps to two rows. Cosmetic, but a signal the panel was not written to grow. |
| 5 | Three separate route-hiding lists | `registry.ts:209`, `placements.ts:174-186`, `ClientLayout.tsx:27-37` | A new provider inherits `shouldRenderAd` and therefore the hardcoded `/odds` + `/predictions` gambling list, which the API deliberately does not validate. |

Item 3 is a compliance issue, not a code-quality one, and it should be treated as a blocker
for any new ad-bearing mode.

---

# 8. Risks in the current house mode

- **`picsum.photos` is a third-party request on every house impression.** It is an external
  service the site does not control, on a cricket site, and it is not named in the privacy
  page's disclosure (which is keyed to `mode === 'adsense'` only). Replacing it with local
  assets is the single highest-value item in this document.
- **The fictional advertisers look real.** Seven invented brand names across nine hardcoded
  creatives (`placements.ts:26-84`; `PowerPlay Fitness` and `Stadium Mobile` are each reused
  for a leaderboard variant) — "PowerPlay Fitness" and "TourKit Luggage" are placeholders, and
  the `Ad` badge implies a paid placement. Fine as a dev placeholder; it should not survive
  into a public launch.
- **No frequency cap and no rotation.** A house creative renders on every page load of every
  enabled placement.
- **`shouldHideDummyAds` is over-broad by design and documented as such** — it matches
  `/administrators-guide`. Harmless today (no such route); a trap if route names grow.

---

# 9. Decision summary

| Question | Answer |
|---|---|
| Is there a CTA system today? | **No.** Greenfield. |
| Is the third-party CTA button ours? | **No.** Rendered in the network's iframe. Backend: nothing. |
| Is the frontend ad layer sound? | **Yes** — keep it. One gate, tested, provider script injected once. |
| What is actually missing? | A **data-driven creative + destination URL** for house mode. Not new machinery. |
| Frontend or backend? | **Frontend**, via `houseCreatives.ts` + the existing `site_settings.ads` seam. |
| When does it become backend? | Rotation, flight dates, non-technical editing, or click counting. Not before. |
| Delete now? | Orphaned generator script, 6 dead PNGs (~625 KB), 2 deprecated maps, and resolve `layout-sidebar`. |
| Biggest risk | The privacy page will not disclose a new ad mode (§7 item 3). |

**Bottom line:** the hard part of custom ads is already built and tested. What is missing is
roughly one file of creative data and a `href`. Build that, delete the dead assets, and do not
open a migration until a sponsor actually needs one.
