import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FolderOpen,
  Loader2,
  FileText,
  AlertCircle,
  X,
} from "lucide-react";

interface ProjectSkill {
  name: string;
  description: string;
  path: string;
}

interface ProjectPanelProps {
  onSkillClick?: (skill: ProjectSkill) => void;
}

export function ProjectPanel({ onSkillClick }: ProjectPanelProps) {
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [skills, setSkills] = useState<ProjectSkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjectSkills = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await invoke<ProjectSkill[]>("scan_project_skills", {
        projectPath: path,
      });
      setSkills(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Project Folder",
      });

      if (selected && typeof selected === "string") {
        setProjectPath(selected);
        loadProjectSkills(selected);
      }
    } catch (err) {
      console.error("Failed to open folder dialog:", err);
    }
  };

  const handleCloseProject = () => {
    setProjectPath(null);
    setSkills([]);
    setError(null);
  };

  if (!projectPath) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FolderOpen className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">No project selected</p>
        <p className="text-sm mb-4">
          Open a project folder to manage its skills
        </p>
        <Button onClick={handleSelectFolder}>
          <FolderOpen className="h-4 w-4 mr-2" />
          Open Project Folder
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderOpen className="h-4 w-4" />
                Current Project
              </CardTitle>
              <CardDescription className="mt-1">
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  {projectPath}
                </code>
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseProject}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

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
              Create a <code className="bg-muted px-1 py-0.5 rounded">.opencode/skill</code> directory with SKILL.md files
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {skills.map((skill) => (
            <Card
              key={skill.path}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => onSkillClick?.(skill)}
            >
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  {skill.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {skill.description || "No description"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <Button variant="outline" size="sm" onClick={handleSelectFolder}>
          <FolderOpen className="h-4 w-4 mr-2" />
          Change Folder
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadProjectSkills(projectPath)}
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
  );
}
