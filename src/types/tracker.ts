export interface TrackerEntry {
  id: number;
  label: string;
  created_at: string;
  updated_at: string;
}

export interface TrackerLine {
  id: number;
  entry_id: number;
  desc: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}
