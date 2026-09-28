-- R0 runtime settings. Defaults MUST match DEFAULT_CONFIG / DEFAULT_FEATURE_FLAGS in
-- packages/shared/src/config.ts (packages/shared/src/config.test.ts compares them).

insert into public.config (key, value, description) values
  ('min_age', '13',
   'Minimum age to register (D-009).'),
  ('recording', '{"segment_seconds":10,"rolling_buffer_segments":6,"clip_before_seconds":30,"clip_after_seconds":5,"resolution":"720p","fps":30,"video_bitrate_kbps":2000}',
   'Phone recording engine (spec §6.8). "Saves the last 30 seconds" = 30 s before the tap. Revisit after the R4a spike.'),
  ('trust_weights', '{"self_recorded":0.5,"dock":0.75,"verified":1}',
   'Rating multiplier per recording source (spec §6.10).'),
  ('ranking', '{"min_checkins_to_count":6,"min_counted_matches":5,"min_distinct_opponents":10,"neighborhood_top_n":10}',
   'Ranking eligibility and neighborhood standings (spec §6.10).'),
  ('rating', '{"base_rating":1000,"k_factor":24,"mvp_max_bonus":15,"shrinkage_k":5,"reciprocal_vote_min_matches":3,"reciprocal_vote_weight":0.5}',
   'Elo engine (spec §6.10).'),
  ('attributes', '{"floor":40,"ceiling":99,"prior_mean":3,"shrinkage_k":5,"max_rated_per_voter":6}',
   'Card attributes from peer ratings (spec §6.10, D-006.3).'),
  ('form', '{"prior":6,"shrinkage_k":3,"last_matches":10}',
   'Form rating x/10 (spec §6.10, D-006.4).'),
  ('voting', '{"window_hours":24}',
   'MVP voting window after the match ends (spec §6.10).'),
  ('checkin', '{"opens_minutes_before":30,"gps_radius_meters":300}',
   'QR check-in window and optional GPS radius (spec §6.7).'),
  ('media', '{"full_match_retention_days":30}',
   'Retention for full-match videos (spec §6.9).'),
  ('xp', '{"checkin":50,"match_counted":100,"mvp":150,"goal":30,"assist":20,"vote_cast":10}',
   'XP per action (spec §6.2). XP is progression only and cannot be spent.'),
  ('stars', '{"match_counted":10,"mvp":50,"hat_trick":30,"tournament_win":150,"tier_silver":300,"tier_gold":1000,"tier_legend":3000}',
   'Stars reward points and tiers by total earned (spec §6.2). No cash value (D-006.1).');

insert into public.feature_flags (key, enabled, description) values
  ('payments_enabled', false, 'Payments are off during the pilot (spec §5).'),
  ('missing_one_enabled', true, '"Missing one" open-spot requests (spec §6.5).'),
  ('full_match_mode_enabled', true, 'Organizers may keep all segments and upload on Wi-Fi (spec §6.8).'),
  ('map_enabled', false, 'Pitch map view; needs a Google Maps API key (spec §6.4).'),
  ('tournaments_enabled', false, 'Tournament leaderboard filter; M12 is LATER (D-006.7).');
