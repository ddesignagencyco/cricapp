# Sportradar Cricket API - All Endpoints & Responses

Spec: **cricket=sportradar-api**
Base Server: `https://api.sportradar.com/`
Security: API Key via query param `api_key`

## Path Variables
- `{access_level}` — API key access level. `t` (trial), `p` (production). Default: `t`
- `{language_code}` — 2-letter language code. Default: `en` (English is the only fully supported language)
- `{format}` — response format. `json` (default) or `xml`
- `{date}` — date in `YYYY-MM-DD` format
- `{match_id}` — e.g. `sr:match:58145219`
- `{player_id}` — e.g. `sr:player:646278`
- `{team_id}` — e.g. `sr:competitor:107203`
- `{tournament_id}` / `{tournament_or_season_id}` — tournament or season id
- `{team_id2}` — second team id

---

## 1. Daily Live Schedule
- **Method:** GET
- **Path:** `/cricket-{access_level}2/{language_code}/schedules/live/schedule.{format}`
- **Description:** Provides scheduled match information for all matches being played live.
- **Operation ID:** `cricket-daily-live-schedule`
- **Params:** access_level, language_code, format
- **Response (200) schema:**
```json
{
  "generated_at": "2026-08-04T19:30:59.451Z",
  "sport_events": [
    {
      "competitors": [{ "abbreviation", "age_group", "category": {"country_code","id","name"}, "country", "country_code", "gender", "id", "ioc_code", "name", "qualifier", "sport": {"id","name"}, "virtual" }],
      "id": "sr:match:...",
      "replaced_by": null,
      "scheduled": "...",
      "season": {"end_date","id","name","start_date","tournament_id","year"},
      "sport_event_conditions": {
        "comment": {"text"},
        "day_night", "neutral_venue",
        "outfield_info": {"outfield_conditions"},
        "pitch_info": {"boundary_position","grass_cover","pitch_moisture","pitch_quality"},
        "referees": {"referee": {...}, "umpires": [{...}]},
        "type", "weather_info": {"rain_conditions","sky_conditions","temperature_range","wind_conditions"}
      },
      "start_time_tbd", "status",
      "tour": {"category":{...},"id","name","sport":{...}},
      "tournament": {"category":{...},"current_season":{...},"gender","id","name","parent_id","season_coverage_info":{...},"sport":{...},"tour_id","type"},
      "tournament_round": {"competition_sport_event_number","cup_round_match_number","cup_round_matches","name","number","other_match_id","phase","type"},
      "venue": {"bowling_ends":[{"name"}],"capacity","city_id","city_name","country_code","country_name","id","map_coordinates","name","state","timezone"}
    }
  ]
}
```
**Example URL:** `https://api.sportradar.com/cricket-t2/en/schedules/live/schedule.json?api_key=YOUR_KEY`

---

## 2. Daily Results
- **Method:** GET
- **Path:** `/cricket-{access_level}2/{language_code}/schedules/{date}/results.{format}`
- **Description:** Provides a summary of all matches played on a given day.
- **Operation ID:** `cricket-daily-results`
- **Params:** access_level, language_code, date, format
- **Response (200) schema:**
```json
{
  "generated_at": "...",
  "results": [
    {
      "sport_event": { /* same sport_event structure as above */ },
      "sport_event_status": {
        "allotted_overs","current_inning","current_session","decided_by_fed","display_overs",
        "display_score","match_day","match_result_text","match_status",
        "period_scores": [{"allotted_overs","away_score","away_wickets","display_overs","display_score","home_score","home_wickets","number","type"}],
        "remaining_overs","required_run_rate","run_rate","run_rate_required","status","target",
        "toss_decision","toss_won_by","winner_id"
      }
    }
  ]
}
```
**Example URL:** `https://api.sportradar.com/cricket-t2/en/schedules/2025-05-06/results.json?api_key=YOUR_KEY`

---

## 3. Daily Schedule
- **Method:** GET
- **Path:** `/cricket-{access_level}2/{language_code}/schedules/{date}/schedule.{format}`
- **Description:** Provides schedule information for all matches played on a given day.
- **Operation ID:** `cricket-daily-schedule`
- **Params:** access_level, language_code, date, format
- **Response (200) schema:**
```json
{
  "generated_at": "...",
  "sport_events": [ /* same sport_event structure as endpoint 1 */ ]
}
```
**Example URL:** `https://api.sportradar.com/cricket-t2/en/schedules/2025-05-06/schedule.json?api_key=YOUR_KEY`

---

## 4. Match Lineups
- **Method:** GET
- **Path:** `/cricket-{access_level}2/{language_code}/matches/{match_id}/lineups.{format}`
- **Description:** Provides lineups and batting order for a given match.
- **Operation ID:** `cricket-match-lineups`
- **Params:** access_level, language_code, match_id, format
- **Response (200) schema:**
```json
{
  "generated_at": "...",
  "lineups": [
    {
      "formation", 
      "manager": {"country_code","date_of_birth","id","ioc_code","name","nationality"},
      "starting_lineup": [{
        "country_code","date_of_birth","gender","height","id","is_captain","is_wicketkeeper",
        "jersey_number","loaned_to_competitor_id","name","nationality","nickname","order","position","type","weight"
      }],
      "team": "string"
    }
  ],
  "sport_event": { /* same sport_event structure */ }
}
```
**Example URL:** `https://api.sportradar.com/cricket-t2/en/matches/sr:match:58145219/lineups.json?api_key=YOUR_KEY`

---

## 5. Match Summary
- **Method:** GET
- **Path:** `/cricket-{access_level}2/{language_code}/matches/{match_id}/summary.{format}`
- **Description:** Provides real-time match-level statistics for a given match. Including results and player and team stats. Data determined by coverage level.
- **Operation ID:** `cricket-match-summary`
- **Params:** access_level, language_code, match_id, format
- **Response (200) schema:**
```json
{
  "coverage": {"sport_event_properties":{"level":"post"},"type":"sport_event"},
  "generated_at": "...",
  "match_notes": [{"text"}],
  "sport_event": { /* same sport_event structure */ },
  "sport_event_conditions": { ... },
  "sport_event_status": { /* same status structure as endpoint 2 */ },
  "statistics": {
    "innings": [{
      "batting_team","bowling_team","number","overs_completed",
      "teams": [{
        // competitor object
        "statistics": {
          "batting": {
            "balls_faced","balls_remaining","batting_fifties","batting_hundreds","batting_left_alone",
            "batting_shots_*","dot_balls","fours","minutes_at_crease","overs_remaining",
            "partnerships": [{
              "balls_faced","dismissed_player","end","end_time","id","minutes_at_crease","name","overs",
              "players": [{"balls_faced","country_code","dot_balls","fours","id","name","ones","order","runs","sixes","status","strike_rate","threes","twos"}],
              "runs","runs_extras","start","start_time","wicket_number"
            }],
            "penalty_runs",
            "players": [{"id","name","statistics":{/* full player batting/bowling/dismissal stats */}}],
            "review_remaining","run_rate","runs","shots_attacking","sixes","strike_rate","threes","twos","wickets_lost"
          },
          "bowling": {
            "appeals","around_the_wicket","bowling_average_speed","bowling_beat_bats","bowling_bouncers",
            "bowling_catches","bowling_conceded_fours","bowling_conceded_sixes","bowling_extras",
            "bowling_rapped_on_pads","bowling_reviews_remaining","bowling_run_outs","bowling_slower_deliveries",
            "bowling_spells": [{
              "bowling_extras","byes","conceded_runs","dot_balls","economy_rate","end","end_time","maidens",
              "no_balls","overs_bowled","player":{"id","name"},"spell_order","start","start_time","wickets","wides"
            }],
            "bowling_stumpings","bowling_yorkers","byes","conceded_runs","dot_balls","edges","leg_byes",
            "maidens","no_balls","over_the_wicket","overs_bowled",
            "players": [{"id","name","statistics":{...}}],
            "wickets","wides"
          }
        },
        "virtual"
      }]
    }]
  },
  "venue": { ... }
}
```
**Example URL:** `https://api.sportradar.com/cricket-t2/en/matches/sr:match:58145219/summary.json?api_key=YOUR_KEY`

---

## 6. Match Timeline
- **Method:** GET
- **Path:** `/cricket-{access_level}2/{language_code}/matches/{match_id}/timeline.{format}`
- **Description:** Provides the sequence of events (balls, wickets, etc.) for a match.
- **Operation ID:** `cricket-match-timeline`
- **Params:** access_level, language_code, match_id, format
- **Response (200):** Contains `coverage`, `generated_at`, `match_notes`, `sport_event`, `sport_event_conditions`, `sport_event_status`, `statistics.innings`, a `timeline[]` array of event objects, and `venue`.
- **Example URL:** `https://api.sportradar.com/cricket-t2/en/matches/sr:match:58145219/timeline.json?api_key=YOUR_KEY`

*(Timeline event structure — see Match Timeline Delta below for the full per-event schema.)*

---

## 7. Match Timeline Delta
- **Method:** GET
- **Path:** `/cricket-{access_level}2/{language_code}/matches/{match_id}/timeline/delta.{format}`
- **Description:** Same data as match timeline but delivered in 5-minute increments during a live match.
- **Operation ID:** `cricket-match-timeline-delta`
- **Params:** access_level, language_code, match_id, format
- **Response (200) schema** — full response identical to Match Timeline plus `timeline[]`:
```json
"timeline": [{
  "ball_number", 
  "batting_params": {
    "angle_traversed","connect","crease_position","distance_travelled","hit_to_boundary",
    "non_striker": { /* player object + runs_scored_so_far */ },
    "runs_scored","shot_type",
    "striker": { /* player object + runs_scored_so_far */ },
    "stroke","trace","zone_played_in"
  },
  "bowling_params": {
    "beat_bat","bowler": {...},"bowling_end","bowling_from","delivery_type",
    "extra_runs_conceded","extra_runs_type","other_bowler": {...},"pitch_x","pitch_y","run_up"
  },
  "commentary": {"text"},
  "delivery",
  "dismissal_params": {
    "dismissal_details": {"bowler_id","decision_reason","fielder_id","fielding_position","is_substitute_fielder","on_strike","result_in_favor","team_referred","type"},
    "player": {...}
  },
  "dismissals_away","dismissals_home","display_overs","display_score","drs",
  "fielding_params": {
    "appeal","catch_dropped","catch_dropped_location","catch_dropper":{...},"difficulty_rating",
    "direct_hit","fielded","fielded_wicket_keeper","fielder":{...},"misfielded","overthrows",
    "pressure_applied","run_out_missed","run_out_missed_location","run_out_misser":{...},
    "runs_lost","runs_saved","stumping_missed","stumping_misser":{...}
  },
  "free_hit","id","inning","over_number","period_name","period_number","time","type",
  "umpiring_params": {
    "ball_changed","ball_changed_reason","field_umpire":{...},"referral_result","third_umpire":{...}
  }
}]
```
- **Example URL:** `https://api.sportradar.com/cricket-t2/en/matches/sr:match:58145219/timeline/delta.json?api_key=YOUR_KEY`

---

## 8. Player Profile
- **Method:** GET
- **Path:** `/cricket-{access_level}2/{language_code}/players/{player_id}/profile.{format}`
- **Description:** Provides player information, including current and historical team membership info and statistics broken down by match format.
- **Operation ID:** `cricket-player-profile`
- **Params:** access_level, language_code, player_id, format
- **Response (200) schema:**
```json
{
  "generated_at": "...",
  "player": {
    "batting_style","bowling_style","country_code","date_of_birth","full_name","gender",
    "height","id","jersey_number","name","nationality","nick_name","nickname","place_of_birth","type"
  },
  "roles": [{
    "active","end_date","jersey_number","start_date","team": { /* team object */ },"type"
  }],
  "teams": [ /* array of team objects */ ]
}
```
**Example URL:** `https://api.sportradar.com/cricket-t2/en/players/sr:player:646278/profile.json?api_key=YOUR_KEY`

---

## 9. Team Profile
- **Method:** GET
- **Path:** `/cricket-{access_level}2/{language_code}/teams/{team_id}/profile.{format}`
- **Description:** Provides team information and statistics by season.
- **Operation ID:** `cricket-team-profile`
- **Params:** access_level, language_code, team_id, format
- **Response (200) schema:**
```json
{
  "generated_at": "...",
  "manager": {"country_code","id","ioc_code","name","nationality"},
  "team": {
    "abbreviation","age_group","category":{"country_code","id","name"},"country","country_code",
    "gender","id","ioc_code","name","qualifier","sport":{"id","name"},"virtual"
  }
}
```
**Example URL:** `https://api.sportradar.com/cricket-t2/en/teams/sr:competitor:107203/profile.json?api_key=YOUR_KEY`

---

## 10. Team Results
- **Method:** GET
- **Path:** `/cricket-{access_level}2/{language_code}/teams/{team_id}/results.{format}`
- **Description:** Provides match info and statistics for the past 10 matches for a given team.
- **Operation ID:** `cricket-team-results`
- **Params:** access_level, language_code, team_id, format
- **Response (200) schema:**
```json
{
  "generated_at": "...",
  "results": [{
    "sport_event": { /* sport_event object */ },
    "sport_event_status": { /* match status object */ }
  }],
  "team": { /* team object */ }
}
```
**Example URL:** `https://api.sportradar.com/cricket-t2/en/teams/sr:competitor:107203/results.json?api_key=YOUR_KEY`

---

## 11. Team Schedule
- **Method:** GET
- **Path:** `/cricket-{access_level}2/{language_code}/teams/{team_id}/schedule.{format}`
- **Description:** Provides schedule information and statistics for a given team.
- **Operation ID:** `cricket-team-schedule`
- **Params:** access_level, language_code, team_id, format
- **Response (200):** `generated_at`, `sport_events[]`, and `team` object.
- **Example URL:** `https://api.sportradar.com/cricket-t2/en/teams/sr:competitor:107203/schedule.json?api_key=YOUR_KEY`

---

## 12. Team Versus Team
- **Method:** GET
- **Path:** `/cricket-{access_level}2/{language_code}/teams/{team_id}/versus/{team_id2}/matches.{format}`
- **Description:** Provides scheduling and results information for matches between two teams.
- **Operation ID:** `cricket-team-versus-team`
- **Params:** access_level, language_code, team_id, team_id2, format
- **Response (200):** `generated_at`, `results[]` (with `sport_event` and `sport_event_status`).
- **Example URL:** `https://api.sportradar.com/cricket-t2/en/teams/sr:competitor:107203/versus/sr:competitor:XXXX/matches.json?api_key=YOUR_KEY`

---

## 13. Tour List
- **Method:** GET
- **Path:** `/cricket-{access_level}2/{language_code}/tours.{format}`
- **Description:** Provides a list of tours.
- **Operation ID:** `cricket-tour-list`
- **Params:** access_level, language_code, format
- **Response (200):** `generated_at`, `tours[]` (each with `id`, `name`, `category`, `sport`).
- **Example URL:** `https://api.sportradar.com/cricket-t2/en/tours.json?api_key=YOUR_KEY`

---

## 14. Tournament Info
- **Method:** GET
- **Path:** `/cricket-{access_level}2/{language_code}/tournaments/{tournament_or_season_id}/info.{format}`
- **Description:** Provides tournament information and coverage info.
- **Operation ID:** `cricket-tournament-info`
- **Params:** access_level, language_code, tournament_or_season_id, format
- **Response (200):** `generated_at`, `tournament` object.
- **Example URL:** `https://api.sportradar.com/cricket-t2/en/tournaments/sr:tournament:XXXX/info.json?api_key=YOUR_KEY`

---

## 15. Tournament Leaders
- **Method:** GET
- **Path:** `/cricket-{access_level}2/{language_code}/tournaments/{tournament_or_season_id}/leaders.{format}`
- **Description:** Provides leaders for a given tournament.
- **Operation ID:** `cricket-tournament-leaders`
- **Params:** access_level, language_code, tournament_or_season_id, format
- **Response (200):** `generated_at`, leaders data.
- **Example URL:** `https://api.sportradar.com/cricket-t2/en/tournaments/sr:tournament:XXXX/leaders.json?api_key=YOUR_KEY`

---

## 16. Tournament List
- **Method:** GET
- **Path:** `/cricket-{access_level}2/{language_code}/tournaments.{format}`
- **Description:** Provides a list of tournaments.
- **Operation ID:** `cricket-tournament-list`
- **Params:** access_level, language_code, format
- **Response (200):** `generated_at`, `tournaments[]`.
- **Example URL:** `https://api.sportradar.com/cricket-t2/en/tournaments.json?api_key=YOUR_KEY`

---

## 17. Tournament Results
- **Method:** GET
- **Path:** `/cricket-{access_level}2/{language_code}/tournaments/{tournament_or_season_id}/results.{format}`
- **Description:** Provides results for a given tournament.
- **Operation ID:** `cricket-tournament-results`
- **Params:** access_level, language_code, tournament_or_season_id, format
- **Response (200):** `generated_at`, `results[]`.
- **Example URL:** `https://api.sportradar.com/cricket-t2/en/tournaments/sr:tournament:XXXX/results.json?api_key=YOUR_KEY`

---

## 18. Tournament Schedule
- **Method:** GET
- **Path:** `/cricket-{access_level}2/{language_code}/tournaments/{tournament_or_season_id}/schedule.{format}`
- **Description:** Provides schedule for a given tournament.
- **Operation ID:** `cricket-tournament-schedule`
- **Params:** access_level, language_code, tournament_or_season_id, format
- **Response (200):** `generated_at`, `sport_events[]`.
- **Example URL:** `https://api.sportradar.com/cricket-t2/en/tournaments/sr:tournament:XXXX/schedule.json?api_key=YOUR_KEY`

---

## 19. Tournament Seasons
- **Method:** GET
- **Path:** `/cricket-{access_level}2/{language_code}/tournaments/{tournament_id}/seasons.{format}`
- **Description:** Provides a list of seasons for a given tournament.
- **Operation ID:** `cricket-tournament-seasons`
- **Params:** access_level, language_code, tournament_id, format
- **Response (200):** `generated_at`, `seasons[]`.
- **Example URL:** `https://api.sportradar.com/cricket-t2/en/tournaments/sr:tournament:XXXX/seasons.json?api_key=YOUR_KEY`

---

## 20. Tournament Squads
- **Method:** GET
- **Path:** `/cricket-{access_level}2/{language_code}/tournaments/{tournament_or_season_id}/teams/{team_id}/squads.{format}`
- **Description:** Provides squad/player information for a given team in a tournament.
- **Operation ID:** `cricket-tournament-squads`
- **Params:** access_level, language_code, tournament_or_season_id, team_id, format
- **Response (200):** `generated_at`, `squad[]` (players) and `team`.
- **Example URL:** `https://api.sportradar.com/cricket-t2/en/tournaments/sr:tournament:XXXX/teams/sr:competitor:107203/squads.json?api_key=YOUR_KEY`

---

## 21. Tournament Standings
- **Method:** GET
- **Path:** `/cricket-{access_level}2/{language_code}/tournaments/{tournament_or_season_id}/standings.{format}`
- **Description:** Provides standings for a given tournament.
- **Operation ID:** `cricket-tournament-standings`
- **Params:** access_level, language_code, tournament_or_season_id, format
- **Response (200):** `generated_at`, `standings` (groups with team standings).
- **Example URL:** `https://api.sportradar.com/cricket-t2/en/tournaments/sr:tournament:XXXX/standings.json?api_key=YOUR_KEY`

---

## Quick Reference — Endpoint Summary Table

| # | Method | Path | Description |
|---|--------|------|-------------|
| 1 | GET | `schedules/live/schedule.{format}` | Daily Live Schedule |
| 2 | GET | `schedules/{date}/results.{format}` | Daily Results |
| 3 | GET | `schedules/{date}/schedule.{format}` | Daily Schedule |
| 4 | GET | `matches/{match_id}/lineups.{format}` | Match Lineups |
| 5 | GET | `matches/{match_id}/summary.{format}` | Match Summary |
| 6 | GET | `matches/{match_id}/timeline.{format}` | Match Timeline |
| 7 | GET | `matches/{match_id}/timeline/delta.{format}` | Match Timeline Delta |
| 8 | GET | `players/{player_id}/profile.{format}` | Player Profile |
| 9 | GET | `teams/{team_id}/profile.{format}` | Team Profile |
| 10 | GET | `teams/{team_id}/results.{format}` | Team Results |
| 11 | GET | `teams/{team_id}/schedule.{format}` | Team Schedule |
| 12 | GET | `teams/{team_id}/versus/{team_id2}/matches.{format}` | Team Versus Team |
| 13 | GET | `tours.{format}` | Tour List |
| 14 | GET | `tournaments/{tournament_or_season_id}/info.{format}` | Tournament Info |
| 15 | GET | `tournaments/{tournament_or_season_id}/leaders.{format}` | Tournament Leaders |
| 16 | GET | `tournaments.{format}` | Tournament List |
| 17 | GET | `tournaments/{tournament_or_season_id}/results.{format}` | Tournament Results |
| 18 | GET | `tournaments/{tournament_or_season_id}/schedule.{format}` | Tournament Schedule |
| 19 | GET | `tournaments/{tournament_id}/seasons.{format}` | Tournament Seasons |
| 20 | GET | `tournaments/{t_or_s_id}/teams/{team_id}/squads.{format}` | Tournament Squads |
| 21 | GET | `tournaments/{tournament_or_season_id}/standings.{format}` | Tournament Standings |

*(All paths prefixed with `/cricket-{access_level}2/{language_code}/` and base `https://api.sportradar.com/`)*

## Coverage
The `get-coverage` tool only returns basketball-specific coverage info (not relevant to cricket). For cricket coverage levels, see the Sportradar developer docs (developer.sportradar.com) or check the `season_coverage_info` field returned in sport_event data.
