import { createClient } from '@libsql/client';
import type { Alien, AlienMarker, LeaderboardEntry } from './types';

const isProduction = !!(import.meta.env.DATABASE_URL && import.meta.env.DATABASE_TOKEN);

const client = createClient(
  isProduction
    ? {
        url: import.meta.env.DATABASE_URL,
        authToken: import.meta.env.DATABASE_TOKEN,
      }
    : {
        url: 'file:local.db',
      }
);

// ─── Markers para el mapa ────────────────────────────────────────────────────

export async function getMarkers(): Promise<AlienMarker[]> {
  const result = await client.execute(
    "SELECT id, codename, type, location_lat, location_lng, status, image_url, created_by, created_at, found_by, found_at FROM aliens WHERE status IN ('hidden', 'found')"
  );
  return result.rows.map((row) => ({
    id: row.id as string,
    codename: row.codename as string,
    type: row.type as string,
    location: {
      lat: row.location_lat as number,
      lng: row.location_lng as number,
    },
    status: row.status as AlienMarker['status'],
    image_url: row.image_url as string | null,
    created_by: row.created_by as string,
    created_at: row.created_at as number,
    found_by: row.found_by as string | null,
    found_at: row.found_at as number | null,
  }));
}

// ─── Leaderboard (solo los encontrados, ordenados por found_at) ──────────────

export async function getFoundCount(): Promise<number> {
  const result = await client.execute(`
    SELECT COUNT(*) as count
    FROM aliens
    WHERE status = 'found' AND found_by IS NOT NULL AND found_at IS NOT NULL
  `);
  return result.rows[0].count as number;
}

export async function getTotalFoundCount(): Promise<number> {
  const result = await client.execute(`
    SELECT COUNT(*) as count
    FROM aliens
    WHERE status = 'found' AND found_by IS NOT NULL AND found_at IS NOT NULL
  `);
  return result.rows[0].count as number;
}

export async function getUniqueClaimersCount(): Promise<number> {
  const result = await client.execute(`
    SELECT COUNT(DISTINCT found_by) as count
    FROM aliens
    WHERE status = 'found' AND found_by IS NOT NULL AND found_at IS NOT NULL
  `);
  return result.rows[0].count as number;
}

export async function getLastClaimer(): Promise<string | null> {
  const result = await client.execute(`
    SELECT found_by
    FROM aliens
    WHERE status = 'found' AND found_by IS NOT NULL AND found_at IS NOT NULL
    ORDER BY found_at DESC
    LIMIT 1
  `);
  return result.rows.length > 0 ? (result.rows[0].found_by as string) : null;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const result = await client.execute(`
    SELECT id, codename, type, image_url, found_by, found_at, created_at
    FROM aliens
    WHERE status = 'found' AND found_by IS NOT NULL AND found_at IS NOT NULL
    ORDER BY (found_at - created_at) ASC
    LIMIT 15
  `);
  return result.rows.map((row, i) => ({
    rank: i + 1,
    id: row.id as string,
    codename: row.codename as string,
    type: row.type as string,
    image_url: row.image_url as string | null,
    found_by: row.found_by as string,
    found_at: row.found_at as number,
    created_at: row.created_at as number,
    time_taken: (row.found_at as number) - (row.created_at as number),
  }));
}

// ─── Un alien por id ─────────────────────────────────────────────────────────

export async function getAlienById(id: string): Promise<Alien | null> {
  const result = await client.execute({
    sql: 'SELECT * FROM aliens WHERE id = ?',
    args: [id],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id as string,
    codename: row.codename as string,
    type: row.type as string,
    image_url: row.image_url as string | null,
    created_at: row.created_at as number,
    created_by: row.created_by as string,
    location_lat: row.location_lat as number | null,
    location_lng: row.location_lng as number | null,
    status: row.status as Alien['status'],
    found_by: row.found_by as string | null,
    found_at: row.found_at as number | null,
  };
}
