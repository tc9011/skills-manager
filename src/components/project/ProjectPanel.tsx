import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SkillCard } from "@/components/skills/SkillCard";
import type { Skill } from "@/types/skill";
import {
  FolderOpen,
  Loader2,
  FileText,
  AlertCircle,
} from "lucide-react";

interface ProjectSkill {
  name: string;
  description: string;
  path: string;
}

interface ProjectPanelProps {
  projectPath: string;
  onSkillClick?: (skill: Skill) => void;
}

export function ProjectPanel({
  projectPath,
  onSkillClick,
}: ProjectPanelProps) {
  const [skills, setSkills] = useState<ProjectSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjectSkills = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await invoke<ProjectSkill[]>("scan_project_skills", {
        projectPath,
      });
      setSkills(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    loadProjectSkills();
  }, [loadProjectSkills]);

  const getProjectName = (path: string) => {
    const parts = path.split("/");
    return parts[parts.length - 1] || path;
  };

  const convertToSkill = (projectSkill: ProjectSkill): Skill => ({
    name: projectSkill.name,
    description: projectSkill.description,
    path: projectSkill.path,
    source: "local",
    installed_in: [],
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-[hsl(18_65%_52%)]" />
          <h2 className="text-lg font-medium">{getProjectName(projectPath)}</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[hsl(20_5%_55%)]">{skills.length} skills</span>
          <Button
            variant="outline"
            size="sm"
            onClick={loadProjectSkills}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Refresh"
            )}
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        <code className="bg-muted px-1.5 py-0.5 rounded">
          {projectPath}
        </code>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p>Scanning project skills...</p>
        </div>
      ) : error ? (
        <Card className="border-destructive/30">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2 text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : skills.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              No skills found in this project
            </p>
            <p className="text-xs text-muted-foreground">
              Create a{" "}
              <code className="bg-muted px-1 py-0.5 rounded">
                .opencode/skill
              </code>{" "}
              directory with SKILL.md files
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => {
            const skillData = convertToSkill(skill);
            return (
              <SkillCard
                key={skill.path}
                skill={skillData}
                onClick={() => onSkillClick?.(skillData)}
                hideAgentBadges
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
