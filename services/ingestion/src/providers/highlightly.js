/**
 * Highlightly (RapidAPI) fallback slot — NOT implemented.
 *
 * Its response shape was not verified (no key at the time of writing), and guessing a
 * mapping would put wrong scores in the database. Until the functions below exist the
 * facade treats this provider as "unsupported" and moves on. To implement: add
 * fetchLiveSchedule / fetchMatchSummary / fetchDailySchedule / fetchDailyResults that
 * return SportsRadar-shaped JSON (see cricbuzz.js), using rapidGet() with
 * budget { period: 'day', limit: RAPIDAPI_HIGHLIGHTLY_DAILY_BUDGET (default 100) }.
 */
export {};
