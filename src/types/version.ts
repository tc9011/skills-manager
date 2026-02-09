export interface CommitInfo {
  id: string;
  short_id: string;
  message: string;
  author: string;
  email: string;
  timestamp: number;
  files_changed: number;
}

export interface FileStatus {
  path: string;
  status: "new" | "modified" | "deleted" | "renamed" | "untracked";
}

export interface DiffStats {
  files_changed: number;
  insertions: number;
  deletions: number;
}

export interface DiffResult {
  stats: DiffStats;
  summary: string;
}
