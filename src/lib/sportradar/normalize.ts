import "server-only";
import { readFixture } from "./fixtures";
import {
  depthChartSchema,
  seasonalStatsSchema,
  teamProfileSchema,
  transfersSchema,
  type DepthChart,
  type SeasonalStats,
  type TeamProfile,
  type Transfers,
} from "./schemas";

export type TeamPreview = {
  team: { id: string; name: string; market?: string | null; alias?: string | null; srId?: string | null; nbaReference?: string | null };
  coaches: Array<{ id: string; name: string; role?: string | null }>;
  roster: Array<{
    id: string;
    name: string;
    position?: string | null;
    primaryPosition?: string | null;
    jerseyNumber?: string | null;
    status?: string | null;
    srId?: string | null;
    nbaReference?: string | null;
    depth: Array<{ position: string; rank: number }>;
    previousSeason?: { gamesPlayed?: number; gamesStarted?: number; minutes?: number; points?: number; rebounds?: number; assists?: number };
  }>;
  relevantTransactions: Array<{ id: string; playerId: string; playerName: string; date?: string | null; type?: string | null; description?: string | null; fromTeamId?: string; toTeamId?: string }>;
};

function parseFixtures() {
  return Promise.all([
    readFixture("team-profile").then((data) => teamProfileSchema.parse(data)),
    readFixture("depth-chart").then((data) => depthChartSchema.parse(data)),
    readFixture("seasonal-stats").then((data) => seasonalStatsSchema.parse(data)),
    readFixture("transfers").then((data) => transfersSchema.parse(data)),
  ]);
}

/**
 * Converts raw saved provider payloads into the small, app-owned shape used by
 * the UI. The Sportradar UUID is the primary join key; absent joins are normal
 * because these endpoints are independently updated snapshots.
 */
export async function getBostonPreviewFromFixtures(): Promise<TeamPreview> {
  const [profile, depthChart, seasonalStats, transfers] = await parseFixtures();
  return normalizeTeamPreview(profile, depthChart, seasonalStats, transfers);
}

export function normalizeTeamPreview(profile: TeamProfile, depthChart: DepthChart, seasonalStats: SeasonalStats, transfers: Transfers): TeamPreview {
  const depthByPlayerId = new Map<string, Array<{ position: string; rank: number }>>();
  for (const position of Object.values(depthChart.positions)) {
    for (const player of position.players) {
      const entries = depthByPlayerId.get(player.id) ?? [];
      entries.push({ position: position.name, rank: player.depth });
      depthByPlayerId.set(player.id, entries);
    }
  }
  const statsByPlayerId = new Map(seasonalStats.players.map((player) => [player.id, player]));
  const currentPlayerIds = new Set(profile.players.map((player) => player.id));

  return {
    team: { id: profile.id, name: profile.name, market: profile.market, alias: profile.alias, srId: profile.sr_id, nbaReference: profile.reference },
    coaches: profile.coaches.map((coach) => ({ id: coach.id, name: coach.full_name, role: coach.position })),
    roster: profile.players.map((player) => {
      const stats = statsByPlayerId.get(player.id)?.total;
      return {
        id: player.id,
        name: player.full_name,
        position: player.position,
        primaryPosition: player.primary_position,
        jerseyNumber: player.jersey_number,
        status: player.status,
        srId: player.sr_id,
        nbaReference: player.reference,
        depth: (depthByPlayerId.get(player.id) ?? []).sort((a, b) => a.rank - b.rank),
        previousSeason: stats && { gamesPlayed: stats.games_played, gamesStarted: stats.games_started, minutes: stats.minutes, points: stats.points, rebounds: stats.rebounds, assists: stats.assists },
      };
    }),
    relevantTransactions: transfers.players.flatMap((player) => player.transfers
      .filter((transfer) => transfer.from_team?.id === profile.id || transfer.to_team?.id === profile.id)
      .map((transfer) => ({ id: transfer.id, playerId: player.id, playerName: player.full_name, date: transfer.effective_date, type: transfer.transaction_type, description: transfer.desc, fromTeamId: transfer.from_team?.id, toTeamId: transfer.to_team?.id }))),
  };
}
