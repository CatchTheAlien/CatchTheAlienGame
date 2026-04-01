export type AlienStatus = 'pending' | 'hidden' | 'found';

export interface Alien {
  id: string;
  type: string;
  image_url: string | null;
  created_at: number; // Unix timestamp (segundos)
  location_lat: number | null;
  location_lng: number | null;
  status: AlienStatus;
  found_by: string | null;
  found_at: number | null; // Unix timestamp (segundos), null si no encontrado
}

// Vista simplificada para el mapa
export interface AlienMarker {
  id: string;
  type: string;
  location: { lat: number; lng: number };
  status: AlienStatus;
  image_url: string | null;
}

// Vista simplificada para el leaderboard
export interface LeaderboardEntry {
  rank: number;
  id: string;
  type: string;
  image_url: string | null;
  found_by: string;
  found_at: number; // Unix timestamp (segundos)
}
