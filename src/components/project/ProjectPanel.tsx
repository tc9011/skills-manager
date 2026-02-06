import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { homeDir } from "@tauri-apps/api/path";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FolderOpen,
  Loader2,
  FileText,
  AlertCircle,
  Copy,
  Link,
  CheckCircle2,
} from "lucide-react";

interface ProjectSkill {
  name: string;
  description: string;
  path: string;
}

interface ProjectPanelProps {
  projectPath: string;
  onSkillClick?: (skill: ProjectSkill) => void;
}

export function ProjectPanel({
  projectPath,
  onSkillClick,
}: ProjectPanelProps) {
  const [skills, setSkills] = useState<ProjectSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<{
    skillPath: string;
    type: "copying" | "linking" | "success" | "error";
    message?: string;
  } | null>(null);

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

  const handleCopyToGlobal = async (skill: ProjectSkill, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setActionStatus({ skillPath: skill.path, type: "copying" });
      const home = await homeDir();
      const destDir = `${home}.agents/skills`;
      const result = await invoke<string>("copy_skill", {
        sourcePath: skill.path,
        destDir,
      });
      setActionStatus({ skillPath: skill.path, type: "success", message: result });
      setTimeout(() => setActionStatus(null), 3000);
    } catch (err) {
      setActionStatus({
        skillPath: skill.path,
        type: "error",
        message: err instanceof Error ? err.message : String(err),
      });
      setTimeout(() => setActionStatus(null), 3000);
    }
  };

  const handleSymlinkToGlobal = async (skill: ProjectSkill, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setActionStatus({ skillPath: skill.path, type: "linking" });
      const home = await homeDir();
      const destDir = `${home}.agents/skills`;
      const result = await invoke<string>("symlink_skill", {
        sourcePath: skill.path,
        destDir,
      });
      setActionStatus({ skillPath: skill.path, type: "success", message: result });
      setTimeout(() => setActionStatus(null), 3000);
    } catch (err) {
      setActionStatus({
        skillPath: skill.path,
        type: "error",
        message: err instanceof Error ? err.message : String(err),
      });
      setTimeout(() => setActionStatus(null), 3000);
    }
  };

  const getProjectName = (path: string) => {
    const parts = path.split("/");
    return parts[parts.length - 1] || path;
  };

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
        <div className="grid gap-3">
          {skills.map((skill) => {
            const isActionPending =
              actionStatus?.skillPath === skill.path &&
              (actionStatus.type === "copying" || actionStatus.type === "linking");
            const isActionResult =
              actionStatus?.skillPath === skill.path &&
              (actionStatus.type === "success" || actionStatus.type === "error");

            return (
              <Card
                key={skill.path}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => onSkillClick?.(skill)}
              >
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      {skill.name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => handleCopyToGlobal(skill, e)}
                        disabled={isActionPending}
                        title="Copy to Global Skills"
                      >
                        {actionStatus?.skillPath === skill.path &&
                        actionStatus.type === "copying" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => handleSymlinkToGlobal(skill, e)}
                        disabled={isActionPending}
                        title="Symlink to Global Skills"
                      >
                        {actionStatus?.skillPath === skill.path &&
                        actionStatus.type === "linking" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Link className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {skill.description || "No description"}
                  </p>
                  {isActionResult && actionStatus && (
                    <div
                      className={`mt-2 flex items-center gap-1 text-xs ${
                        actionStatus.type === "success"
                          ? "text-emerald-400"
                          : "text-destructive"
                      }`}
                    >
                      {actionStatus.type === "success" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      <span className="truncate">{actionStatus.message}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
