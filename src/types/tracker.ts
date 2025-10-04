export interface TrackerEntry {
  id: number;
  label: string;
  created_at: string;
  updated_at: string;
}

export interface TrackerLineDuration {
  id: number;
  entry_line_id: number;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackerLine {
  id: number;
  entry_id: number;
  desc: string;
  created_at: string;
  updated_at: string;
  durations: TrackerLineDuration[];
}
