import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FolderOpen,
  Loader2,
  FileText,
  AlertCircle,
  X,
  Plus,
  Clock,
} from "lucide-react";

interface ProjectSkill {
  name: string;
  description: string;
  path: string;
}

interface OpenProject {
  path: string;
  skills: ProjectSkill[];
  loading: boolean;
  error: string | null;
}

interface AppSettings {
  recent_projects: string[];
  active_projects: string[];
}

interface ProjectPanelProps {
  projects: string[];
  onProjectsChange: (projects: string[]) => void;
  onSkillClick?: (skill: ProjectSkill) => void;
}

export function ProjectPanel({
  projects: projectPaths,
  onProjectsChange,
  onSkillClick,
}: ProjectPanelProps) {
  const [projectData, setProjectData] = useState<Map<string, OpenProject>>(
    new Map()
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentProjects, setRecentProjects] = useState<string[]>([]);

  useEffect(() => {
    loadRecentProjects();
  }, []);

  useEffect(() => {
    projectPaths.forEach((path) => {
      if (!projectData.has(path)) {
        loadProjectSkills(path);
      }
    });
  }, [projectPaths]);

  const loadRecentProjects = async () => {
    try {
      const settings = await invoke<AppSettings>("get_app_settings");
      setRecentProjects(settings.recent_projects || []);
    } catch {
      setRecentProjects([]);
    }
  };

  const loadProjectSkills = useCallback(async (path: string) => {
    setProjectData((prev) => {
      const updated = new Map(prev);
      updated.set(path, { path, skills: [], loading: true, error: null });
      return updated;
    });

    try {
      const result = await invoke<ProjectSkill[]>("scan_project_skills", {
        projectPath: path,
      });
      setProjectData((prev) => {
        const updated = new Map(prev);
        updated.set(path, { path, skills: result, loading: false, error: null });
        return updated;
      });
    } catch (err) {
      setProjectData((prev) => {
        const updated = new Map(prev);
        updated.set(path, {
          path,
          skills: [],
          loading: false,
          error: err instanceof Error ? err.message : String(err),
        });
        return updated;
      });
    }
  }, []);

  const openProject = useCallback(
    async (path: string) => {
      const existingIndex = projectPaths.indexOf(path);
      if (existingIndex >= 0) {
        setActiveIndex(existingIndex);
        return;
      }

      onProjectsChange([...projectPaths, path]);
      setActiveIndex(projectPaths.length);

      const updatedRecent = [
        path,
        ...recentProjects.filter((p) => p !== path),
      ].slice(0, 10);
      setRecentProjects(updatedRecent);
    },
    [projectPaths, recentProjects, onProjectsChange]
  );

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Project Folder",
      });

      if (selected && typeof selected === "string") {
        openProject(selected);
      }
    } catch (err) {
      console.error("Failed to open folder dialog:", err);
    }
  };

  const handleCloseProject = (index: number) => {
    const newProjects = projectPaths.filter((_, i) => i !== index);
    onProjectsChange(newProjects);

    if (activeIndex === index) {
      setActiveIndex(Math.max(0, index - 1));
    } else if (activeIndex > index) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const getProjectName = (path: string) => {
    const parts = path.split("/");
    return parts[parts.length - 1] || path;
  };

  const activeProjectPath = projectPaths[activeIndex];
  const activeProject = activeProjectPath
    ? projectData.get(activeProjectPath)
    : undefined;

  if (projectPaths.length === 0) {
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
        {recentProjects.length > 0 && (
          <div className="mt-6 w-full max-w-sm">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Recent Projects
            </p>
            <div className="space-y-1">
              {recentProjects.slice(0, 5).map((path) => (
                <button
                  key={path}
                  onClick={() => openProject(path)}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent flex items-center gap-2 transition-colors"
                >
                  <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{getProjectName(path)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 border-b border-border pb-2 overflow-x-auto">
        {projectPaths.map((path, index) => (
          <div
            key={path}
            className={`group flex items-center gap-1 px-3 py-1.5 rounded-t-md cursor-pointer transition-colors ${
              index === activeIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted"
            }`}
            onClick={() => setActiveIndex(index)}
          >
            <FolderOpen className="h-3.5 w-3.5 shrink-0" />
            <span className="text-sm truncate max-w-32">
              {getProjectName(path)}
            </span>
            <button
              className="ml-1 p-0.5 rounded hover:bg-destructive/20 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                handleCloseProject(index);
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={handleSelectFolder}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {activeProject && (
        <>
          <div className="text-xs text-muted-foreground">
            <code className="bg-muted px-1.5 py-0.5 rounded">
              {activeProject.path}
            </code>
          </div>

          {activeProject.loading ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Scanning project skills...</p>
            </div>
          ) : activeProject.error ? (
            <Card className="border-destructive/30">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p className="text-sm">{activeProject.error}</p>
                </div>
              </CardContent>
            </Card>
          ) : activeProject.skills.length === 0 ? (
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
              {activeProject.skills.map((skill) => (
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

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadProjectSkills(activeProject.path)}
              disabled={activeProject.loading}
            >
              {activeProject.loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Refresh"
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
