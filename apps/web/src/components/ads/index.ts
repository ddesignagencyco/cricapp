/**
 * Compatibility alias for the requirements' preferred `components/ads/` path.
 *
 * The canonical implementation lives in `components/advertisements/` (the
 * project's existing convention); this module re-exports it so both
 * `components/ads` and `components/advertisements` resolve to the same
 * single-initialization system.
 */
export * from '../advertisements';
