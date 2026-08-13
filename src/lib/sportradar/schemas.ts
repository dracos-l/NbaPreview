import { z } from "zod";

const identifier = z.string().min(1);
const nullableString = z.string().nullable().optional();

/** Fields that identify a Sportradar player in every NBA feed captured so far. */
export const playerIdentitySchema = z.object({
  id: identifier,
  full_name: identifier,
  first_name: nullableString,
  last_name: nullableString,
  sr_id: nullableString,
  reference: nullableString,
  position: nullableString,
  primary_position: nullableString,
}).passthrough();

export const teamIdentitySchema = z.object({
  id: identifier,
  name: identifier,
  market: nullableString,
  alias: nullableString,
  sr_id: nullableString,
  reference: nullableString,
}).passthrough();

export const teamProfileSchema = teamIdentitySchema.extend({
  coaches: z.array(z.object({
    id: identifier,
    full_name: identifier,
    first_name: nullableString,
    last_name: nullableString,
    position: nullableString,
    reference: nullableString,
  }).passthrough()),
  players: z.array(playerIdentitySchema.extend({
    jersey_number: nullableString,
    status: nullableString,
  })),
});

export const depthChartSchema = teamIdentitySchema.extend({
  positions: z.record(z.object({
    id: identifier,
    name: identifier,
    desc: nullableString,
    players: z.array(playerIdentitySchema.extend({
      depth: z.number().int().positive(),
      jersey_number: nullableString,
    })),
  }).passthrough()),
});

const playerTotalsSchema = z.object({
  games_played: z.number().nonnegative().optional(),
  games_started: z.number().nonnegative().optional(),
  minutes: z.number().nonnegative().optional(),
  points: z.number().nonnegative().optional(),
  rebounds: z.number().nonnegative().optional(),
  assists: z.number().nonnegative().optional(),
}).passthrough();

export const seasonalStatsSchema = teamIdentitySchema.extend({
  season: z.object({ id: identifier, year: z.number().int(), type: identifier }).passthrough(),
  players: z.array(playerIdentitySchema.extend({
    total: playerTotalsSchema,
    average: playerTotalsSchema,
  })),
});

const transferSchema = z.object({
  id: identifier,
  desc: nullableString,
  effective_date: nullableString,
  last_modified: nullableString,
  transaction_type: nullableString,
  transaction_code: nullableString,
  from_team: teamIdentitySchema.optional(),
  to_team: teamIdentitySchema.optional(),
}).passthrough();

export const transfersSchema = z.object({
  league: z.object({ id: identifier, name: identifier }).passthrough(),
  start_time: nullableString,
  end_time: nullableString,
  players: z.array(playerIdentitySchema.extend({ transfers: z.array(transferSchema) })),
}).passthrough();

export type TeamProfile = z.infer<typeof teamProfileSchema>;
export type DepthChart = z.infer<typeof depthChartSchema>;
export type SeasonalStats = z.infer<typeof seasonalStatsSchema>;
export type Transfers = z.infer<typeof transfersSchema>;
