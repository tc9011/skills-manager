import { Layers, Settings, Plus, FolderOpen, X, GitBranch } from "lucide-react";

interface SidebarProps {
  agents: Array<{ id: string; name: string; enabled: boolean }>;
  projects: string[];
  activeSection: string;
  onSectionChange: (section: string) => void;
  onAddProject: () => void;
  onRemoveProject: (path: string) => void;
}

const getProjectName = (path: string) => {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
};

export function Sidebar({ agents, projects, activeSection, onSectionChange, onAddProject, onRemoveProject }: SidebarProps) {
  return (
    <div className="w-64 h-full bg-[hsl(30_15%_97%)] border-r border-[hsl(30_10%_90%)] flex flex-col overflow-hidden">
      <div className="p-4 shrink-0">
        <span className="font-semibold text-[hsl(20_10%_20%)]">Skills Manager</span>
      </div>
      
      <div className="px-3 py-2 shrink-0">
        <nav className="space-y-1">
          <button onClick={() => onSectionChange("all-skills")} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${activeSection === "all-skills" ? "bg-[hsl(30_20%_94%)] text-[hsl(20_10%_20%)]" : "text-[hsl(20_10%_30%)] hover:bg-[hsl(30_20%_94%)]/50"}`}>
            <Layers className="h-4 w-4" />
            Central Skills
          </button>
        </nav>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <div className="text-xs font-medium text-[hsl(20_5%_55%)] uppercase tracking-wider">Agents</div>
          </div>
          <nav className="space-y-1">
            {agents.map((agent) => (
              <button key={agent.id} onClick={() => onSectionChange(`agent-${agent.id}`)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${activeSection === `agent-${agent.id}` ? "bg-[hsl(30_20%_94%)] text-[hsl(20_10%_20%)]" : "text-[hsl(20_10%_30%)] hover:bg-[hsl(30_20%_94%)]/50"}`}>
                <span className="w-4 h-4 rounded-full bg-[hsl(30_10%_90%)] flex items-center justify-center text-[10px]">{agent.name.charAt(0)}</span>
                {agent.name}
              </button>
            ))}
          </nav>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2 px-2">
            <div className="text-xs font-medium text-[hsl(20_5%_55%)] uppercase tracking-wider">Projects</div>
            <Plus 
              className="h-3.5 w-3.5 text-[hsl(20_5%_55%)] cursor-pointer hover:text-[hsl(18_65%_52%)]" 
              onClick={onAddProject}
            />
          </div>
          <nav className="space-y-1">
            {projects.map((project) => (
              <div 
                key={project} 
                className={`group w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${activeSection === `project-${project}` ? "bg-[hsl(30_20%_94%)] text-[hsl(20_10%_20%)]" : "text-[hsl(20_10%_30%)] hover:bg-[hsl(30_20%_94%)]/50"}`}
              >
                <button 
                  className="flex items-center gap-2 flex-1 min-w-0"
                  onClick={() => onSectionChange(`project-${project}`)}
                >
                  <FolderOpen className="h-4 w-4 shrink-0" />
                  <span className="truncate">{getProjectName(project)}</span>
                </button>
                <button
                  className="p-0.5 rounded hover:bg-[hsl(0_60%_50%)]/20 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => { e.stopPropagation(); onRemoveProject(project); }}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </nav>
        </div>
      </div>
      
      <div className="p-3 border-t border-[hsl(30_10%_90%)] shrink-0 space-y-1">
        <button 
          onClick={() => onSectionChange("sync")}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${activeSection === "sync" ? "bg-[hsl(30_20%_94%)] text-[hsl(20_10%_20%)]" : "text-[hsl(20_10%_30%)] hover:bg-[hsl(30_20%_94%)]/50"}`}
        >
          <GitBranch className="h-4 w-4" />
          GitHub Sync
        </button>
        <button 
          onClick={() => onSectionChange("settings")}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${activeSection === "settings" ? "bg-[hsl(30_20%_94%)] text-[hsl(20_10%_20%)]" : "text-[hsl(20_10%_30%)] hover:bg-[hsl(30_20%_94%)]/50"}`}
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>
    </div>
  );
}
