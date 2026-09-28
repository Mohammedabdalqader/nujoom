import { z } from 'zod';

/**
 * Typed view of the `public.config` table. Defaults here MUST match the rows inserted by
 * supabase/migrations/20260928000400_settings.sql (a test compares them). Admins can tune the
 * values at runtime (spec §6.10, §6.12).
 */
export const configSchemas = {
  min_age: z.number().int().min(13).max(18),
  recording: z.object({
    segment_seconds: z.number().int().min(2).max(60),
    rolling_buffer_segments: z.number().int().min(1).max(60),
    clip_before_seconds: z.number().int().min(0).max(120),
    clip_after_seconds: z.number().int().min(0).max(120),
    resolution: z.enum(['720p', '1080p']),
    fps: z.number().int().min(24).max(60),
    video_bitrate_kbps: z.number().int().min(500).max(10000),
  }),
  trust_weights: z.object({
    self_recorded: z.number().min(0).max(1),
    dock: z.number().min(0).max(1),
    verified: z.number().min(0).max(1),
  }),
  ranking: z.object({
    min_checkins_to_count: z.number().int().min(2),
    min_counted_matches: z.number().int().min(1),
    min_distinct_opponents: z.number().int().min(1),
    neighborhood_top_n: z.number().int().min(1).max(50),
  }),
  rating: z.object({
    base_rating: z.number(),
    k_factor: z.number().positive(),
    mvp_max_bonus: z.number().min(0),
    shrinkage_k: z.number().positive(),
    reciprocal_vote_min_matches: z.number().int().min(1),
    reciprocal_vote_weight: z.number().min(0).max(1),
  }),
  attributes: z.object({
    floor: z.number().int().min(1).max(98),
    ceiling: z.number().int().min(2).max(99),
    prior_mean: z.number().min(1).max(5),
    shrinkage_k: z.number().positive(),
    max_rated_per_voter: z.number().int().min(1).max(20),
  }),
  form: z.object({
    prior: z.number().min(1).max(10),
    shrinkage_k: z.number().positive(),
    last_matches: z.number().int().min(1).max(50),
  }),
  voting: z.object({
    window_hours: z.number().int().min(1).max(168),
  }),
  checkin: z.object({
    opens_minutes_before: z.number().int().min(0).max(180),
    gps_radius_meters: z.number().int().min(50).max(5000),
  }),
  media: z.object({
    full_match_retention_days: z.number().int().min(1),
  }),
  xp: z.object({
    checkin: z.number().int().min(0),
    match_counted: z.number().int().min(0),
    mvp: z.number().int().min(0),
    goal: z.number().int().min(0),
    assist: z.number().int().min(0),
    vote_cast: z.number().int().min(0),
  }),
  stars: z.object({
    match_counted: z.number().int().min(0),
    mvp: z.number().int().min(0),
    hat_trick: z.number().int().min(0),
    tournament_win: z.number().int().min(0),
    tier_silver: z.number().int().min(1),
    tier_gold: z.number().int().min(1),
    tier_legend: z.number().int().min(1),
  }),
} as const;

export type ConfigKey = keyof typeof configSchemas;
export type ConfigValue<K extends ConfigKey> = z.infer<(typeof configSchemas)[K]>;
export type AppConfig = { [K in ConfigKey]: ConfigValue<K> };

export const DEFAULT_CONFIG: AppConfig = {
  min_age: 13,
  recording: {
    segment_seconds: 10,
    rolling_buffer_segments: 6,
    clip_before_seconds: 30,
    clip_after_seconds: 5,
    resolution: '720p',
    fps: 30,
    video_bitrate_kbps: 2000,
  },
  trust_weights: { self_recorded: 0.5, dock: 0.75, verified: 1 },
  ranking: {
    min_checkins_to_count: 6,
    min_counted_matches: 5,
    min_distinct_opponents: 10,
    neighborhood_top_n: 10,
  },
  rating: {
    base_rating: 1000,
    k_factor: 24,
    mvp_max_bonus: 15,
    shrinkage_k: 5,
    reciprocal_vote_min_matches: 3,
    reciprocal_vote_weight: 0.5,
  },
  attributes: { floor: 40, ceiling: 99, prior_mean: 3, shrinkage_k: 5, max_rated_per_voter: 6 },
  form: { prior: 6, shrinkage_k: 3, last_matches: 10 },
  voting: { window_hours: 24 },
  checkin: { opens_minutes_before: 30, gps_radius_meters: 300 },
  media: { full_match_retention_days: 30 },
  xp: { checkin: 50, match_counted: 100, mvp: 150, goal: 30, assist: 20, vote_cast: 10 },
  stars: {
    match_counted: 10,
    mvp: 50,
    hat_trick: 30,
    tournament_win: 150,
    tier_silver: 300,
    tier_gold: 1000,
    tier_legend: 3000,
  },
};

/** Parses a raw config value; falls back to the default when it is missing or invalid. */
export function parseConfigValue<K extends ConfigKey>(key: K, raw: unknown): ConfigValue<K> {
  const result = configSchemas[key].safeParse(raw);
  return (result.success ? result.data : DEFAULT_CONFIG[key]) as ConfigValue<K>;
}

export const FEATURE_FLAGS = [
  'payments_enabled',
  'missing_one_enabled',
  'full_match_mode_enabled',
  'map_enabled',
  'tournaments_enabled',
] as const;
export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlag, boolean> = {
  payments_enabled: false,
  missing_one_enabled: true,
  full_match_mode_enabled: true,
  map_enabled: false,
  tournaments_enabled: false,
};
