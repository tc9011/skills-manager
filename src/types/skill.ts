export interface Skill {
  name: string;
  description: string;
  path: string;
  source: "local" | "remote" | "symlink";
  installed_in: string[];
}
