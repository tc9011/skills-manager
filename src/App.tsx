import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { SkillsList } from "@/components/skills/SkillsList";
import { ImportSkillDialog } from "@/components/skills/ImportSkillDialog";
import { CreateSkillDialog } from "@/components/skills/CreateSkillDialog";
import { SkillDetailDialog } from "@/components/skills/SkillDetailDialog";
import { SyncPanel } from "@/components/sync/SyncPanel";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { ProjectPanel } from "@/components/project/ProjectPanel";
import { Sidebar } from "@/components/layout/Sidebar";
import { useSkills } from "@/hooks/useSkills";
import type { Skill } from "@/types/skill";
import type { DeleteMode } from "@/components/skills/SkillCard";
import { Plus, Download } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

interface AgentConfig {
  id: string;
  name: string;
  enabled: boolean;
  path: string;
  project_path: string;
}

interface AppSettings {
  global_skills_path: string;
  agents: AgentConfig[];
  github_token?: string;
  recent_projects: string[];
  active_projects: string[];
}

function App() {
  const { skills, loading, error, refetch } = useSkills();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [activeProjects, setActiveProjects] = useState<string[]>([]);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [installedAgentIds, setInstalledAgentIds] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState("all-skills");

  useEffect(() => {
    loadActiveProjects();
    loadAgents();
  }, []);

  const loadActiveProjects = async () => {
    try {
      const settings = await invoke<AppSettings>("get_app_settings");
      setActiveProjects(settings.active_projects || []);
    } catch {
      setActiveProjects([]);
    }
  };

  const loadAgents = async () => {
    try {
      const settings = await invoke<AppSettings>("get_app_settings");
      if (settings.agents) {
        setAgents(settings.agents);
        const agentPaths: [string, string][] = settings.agents.map((a) => [
          a.id,
          a.path,
        ]);
        const installed = await invoke<string[]>("detect_installed_agents", {
          agents: agentPaths,
        });
        setInstalledAgentIds(installed);
      }
    } catch {
      setAgents([]);
    }
  };

  const handleProjectsChange = useCallback(async (projects: string[]) => {
    setActiveProjects(projects);
    try {
      const settings = await invoke<AppSettings>("get_app_settings");
      const updatedRecent = [
        ...projects,
        ...(settings.recent_projects || []).filter(
          (p) => !projects.includes(p)
        ),
      ].slice(0, 20);
      await invoke("save_app_settings", {
        settings: {
          ...settings,
          active_projects: projects,
          recent_projects: updatedRecent,
        },
      });
    } catch (err) {
      console.error("Failed to save active projects:", err);
    }
  }, []);

  const handleSkillClick = useCallback((skill: Skill) => {
    setSelectedSkill(skill);
    setDetailDialogOpen(true);
  }, []);

  const handleAddSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleSkillDeleted = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleDeleteSkill = useCallback(async (path: string, mode: DeleteMode) => {
    try {
      await invoke("delete_skill", { path, mode });
      refetch();
    } catch (err) {
      console.error("Failed to delete skill:", err);
    }
  }, [refetch]);

  const handleAddProject = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Project Folder",
      });
      if (selected && typeof selected === "string") {
        if (!activeProjects.includes(selected)) {
          const newProjects = [...activeProjects, selected];
          handleProjectsChange(newProjects);
          setActiveSection(`project-${selected}`);
        } else {
          setActiveSection(`project-${selected}`);
        }
      }
    } catch (err) {
      console.error("Failed to open folder dialog:", err);
    }
  }, [activeProjects, handleProjectsChange]);

  const handleRemoveProject = useCallback((path: string) => {
    const newProjects = activeProjects.filter(p => p !== path);
    handleProjectsChange(newProjects);
    if (activeSection === `project-${path}`) {
      setActiveSection("all-skills");
    }
  }, [activeProjects, activeSection, handleProjectsChange]);

  const filteredSkills = activeSection.startsWith("agent-")
    ? skills.filter((s) =>
        s.installed_in.includes(activeSection.replace("agent-", ""))
      )
    : skills;

  const getSkillsListTitle = () => {
    if (activeSection === "all-skills") {
      return "Central Skills";
    }
    if (activeSection.startsWith("agent-")) {
      const agentId = activeSection.replace("agent-", "");
      const agent = agents.find((a) => a.id === agentId);
      return agent ? `${agent.name} Skills` : "Agent Skills";
    }
    return "Skills";
  };

  const getDeleteMode = (): DeleteMode => {
    if (activeSection === "all-skills") return "global";
    if (activeSection.startsWith("agent-")) return "agent";
    if (activeSection.startsWith("project-")) return "project";
    return "global";
  };

  const renderMainContent = () => {
    if (activeSection === "settings") {
      return <SettingsPanel />;
    }
    if (activeSection.startsWith("project-")) {
      const projectPath = activeSection.replace("project-", "");
      return (
        <ProjectPanel
          projectPath={projectPath}
          onDelete={handleDeleteSkill}
          onSkillClick={handleSkillClick}
        />
      );
    }
    if (activeSection === "sync") {
      return <SyncPanel onNavigateToSettings={() => setActiveSection("settings")} />;
    }
    return (
      <SkillsList
        skills={filteredSkills}
        loading={loading}
        error={error}
        onRetry={refetch}
        onSkillClick={handleSkillClick}
        onDelete={handleDeleteSkill}
        deleteMode={getDeleteMode()}
        title={getSkillsListTitle()}
      />
    );
  };

  return (
    <div className="h-screen flex bg-[hsl(30_20%_98%)] text-[hsl(20_10%_20%)]">
      {/* Sidebar */}
      <Sidebar
        agents={agents.filter((a) => installedAgentIds.includes(a.id))}
        projects={activeProjects}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onAddProject={handleAddProject}
        onRemoveProject={handleRemoveProject}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-[hsl(30_10%_90%)] px-6 py-4 flex items-center justify-between bg-white">
          <h1 className="text-xl font-semibold">Skill Sync</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
              className="border-[hsl(30_10%_85%)]"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Skill
            </Button>
            <Button
              size="sm"
              onClick={() => setImportDialogOpen(true)}
              className="bg-[hsl(18_65%_52%)] hover:bg-[hsl(18_65%_47%)] text-white"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Import Skill
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {renderMainContent()}
        </main>
      </div>

      <ImportSkillDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={handleAddSuccess}
      />

      <CreateSkillDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleAddSuccess}
      />

      <SkillDetailDialog
        skill={selectedSkill}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onDeleted={handleSkillDeleted}
      />

      <Toaster position="top-right" />
    </div>
  );
}

export default App;
