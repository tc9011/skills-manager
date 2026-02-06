import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SkillsList } from "@/components/skills/SkillsList";
import { AddSkillDialog } from "@/components/skills/AddSkillDialog";
import { SkillDetailDialog } from "@/components/skills/SkillDetailDialog";
import { SyncPanel } from "@/components/sync/SyncPanel";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { ProjectPanel } from "@/components/project/ProjectPanel";
import { useSkills } from "@/hooks/useSkills";
import type { Skill } from "@/types/skill";
import {
  Package,
  FolderOpen,
  RefreshCw,
  Plus,
  Settings,
} from "lucide-react";

interface AppSettings {
  global_skills_path: string;
  agents: unknown[];
  github_token?: string;
  recent_projects: string[];
  active_projects: string[];
}

function App() {
  const { skills, loading, error, refetch } = useSkills();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [activeProjects, setActiveProjects] = useState<string[]>([]);

  useEffect(() => {
    loadActiveProjects();
  }, []);

  const loadActiveProjects = async () => {
    try {
      const settings = await invoke<AppSettings>("get_app_settings");
      setActiveProjects(settings.active_projects || []);
    } catch {
      setActiveProjects([]);
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

  return (
    <div className="dark h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Skills Manager</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Skill
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setSettingsDialogOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Tabs defaultValue="global" className="h-full flex flex-col">
           <div className="border-b border-border px-4">
             <TabsList className="h-10 bg-transparent">
               <TabsTrigger value="global" className="gap-2">
                 <Package className="h-4 w-4" />
                 Global
               </TabsTrigger>
               <TabsTrigger value="project" className="gap-2">
                 <FolderOpen className="h-4 w-4" />
                 Project
               </TabsTrigger>
               <TabsTrigger value="sync" className="gap-2">
                 <RefreshCw className="h-4 w-4" />
                 Sync
               </TabsTrigger>
             </TabsList>
           </div>

           <ScrollArea className="flex-1">
             <TabsContent value="global" className="p-4 m-0">
               <SkillsList
                 skills={skills}
                 loading={loading}
                 error={error}
                 onRetry={refetch}
                 onSkillClick={handleSkillClick}
               />
             </TabsContent>

             <TabsContent value="project" className="p-4 m-0">
               <ProjectPanel
                 projects={activeProjects}
                 onProjectsChange={handleProjectsChange}
               />
             </TabsContent>

             <TabsContent value="sync" className="p-4 m-0">
               <SyncPanel />
             </TabsContent>
           </ScrollArea>
        </Tabs>
      </main>

      <AddSkillDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleAddSuccess}
      />

      <SkillDetailDialog
        skill={selectedSkill}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onDeleted={handleSkillDeleted}
      />

      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />
    </div>
  );
}

export default App;
