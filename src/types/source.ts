export interface GitHubSource {
  type: "github";
  id: string;
  name: string;
  repo_url: string;
  branch: string;
  path?: string;
}

export interface LocalSource {
  type: "local";
  id: string;
  name: string;
  path: string;
}

export interface RegistrySource {
  type: "registry";
  id: string;
  name: string;
  url: string;
}

export type SkillSource = GitHubSource | LocalSource | RegistrySource;

export interface SyncResult {
  success: boolean;
  skills_synced: string[];
  conflicts: ConflictInfo[];
  message: string;
}

export interface ConflictInfo {
  skill_name: string;
  source_version: string;
  central_version: string;
  conflict_type: "modified_both" | "deleted_source" | "deleted_central";
}
