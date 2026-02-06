import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FolderOpen,
  Check,
  Loader2,
  Search,
} from "lucide-react";

interface AgentConfig {
  name: string;
  id: string;
  enabled: boolean;
  path: string;
  project_path: string;
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_AGENTS: AgentConfig[] = [
  { name: "AdaL", id: "adal", enabled: false, path: "~/.adal/skills/", project_path: ".adal/skills/" },
  { name: "Amp", id: "amp", enabled: false, path: "~/.config/agents/skills/", project_path: ".agents/skills/" },
  { name: "Antigravity", id: "antigravity", enabled: false, path: "~/.gemini/antigravity/skills/", project_path: ".agent/skills/" },
  { name: "Augment", id: "augment", enabled: false, path: "~/.augment/skills/", project_path: ".augment/skills/" },
  { name: "Claude Code", id: "claude-code", enabled: true, path: "~/.claude/skills/", project_path: ".claude/skills/" },
  { name: "Cline", id: "cline", enabled: true, path: "~/.cline/skills/", project_path: ".cline/skills/" },
  { name: "CodeBuddy", id: "codebuddy", enabled: false, path: "~/.codebuddy/skills/", project_path: ".codebuddy/skills/" },
  { name: "Codex", id: "codex", enabled: false, path: "~/.codex/skills/", project_path: ".agents/skills/" },
  { name: "Command Code", id: "command-code", enabled: false, path: "~/.commandcode/skills/", project_path: ".commandcode/skills/" },
  { name: "Continue", id: "continue", enabled: false, path: "~/.continue/skills/", project_path: ".continue/skills/" },
  { name: "Crush", id: "crush", enabled: false, path: "~/.config/crush/skills/", project_path: ".crush/skills/" },
  { name: "Cursor", id: "cursor", enabled: true, path: "~/.cursor/skills/", project_path: ".cursor/skills/" },
  { name: "Droid", id: "droid", enabled: false, path: "~/.factory/skills/", project_path: ".factory/skills/" },
  { name: "Gemini CLI", id: "gemini-cli", enabled: false, path: "~/.gemini/skills/", project_path: ".agents/skills/" },
  { name: "GitHub Copilot", id: "github-copilot", enabled: false, path: "~/.copilot/skills/", project_path: ".agents/skills/" },
  { name: "Goose", id: "goose", enabled: false, path: "~/.config/goose/skills/", project_path: ".goose/skills/" },
  { name: "iFlow CLI", id: "iflow-cli", enabled: false, path: "~/.iflow/skills/", project_path: ".iflow/skills/" },
  { name: "Junie", id: "junie", enabled: false, path: "~/.junie/skills/", project_path: ".junie/skills/" },
  { name: "Kilo Code", id: "kilo", enabled: false, path: "~/.kilocode/skills/", project_path: ".kilocode/skills/" },
  { name: "Kimi Code CLI", id: "kimi-cli", enabled: false, path: "~/.config/agents/skills/", project_path: ".agents/skills/" },
  { name: "Kiro CLI", id: "kiro-cli", enabled: false, path: "~/.kiro/skills/", project_path: ".kiro/skills/" },
  { name: "Kode", id: "kode", enabled: false, path: "~/.kode/skills/", project_path: ".kode/skills/" },
  { name: "MCPJam", id: "mcpjam", enabled: false, path: "~/.mcpjam/skills/", project_path: ".mcpjam/skills/" },
  { name: "Mistral Vibe", id: "mistral-vibe", enabled: false, path: "~/.vibe/skills/", project_path: ".vibe/skills/" },
  { name: "Mux", id: "mux", enabled: false, path: "~/.mux/skills/", project_path: ".mux/skills/" },
  { name: "Neovate", id: "neovate", enabled: false, path: "~/.neovate/skills/", project_path: ".neovate/skills/" },
  { name: "OpenClaw", id: "openclaw", enabled: false, path: "~/.moltbot/skills/", project_path: "skills/" },
  { name: "OpenCode", id: "opencode", enabled: true, path: "~/.config/opencode/skills/", project_path: ".agents/skills/" },
  { name: "OpenHands", id: "openhands", enabled: false, path: "~/.openhands/skills/", project_path: ".openhands/skills/" },
  { name: "Pi", id: "pi", enabled: false, path: "~/.pi/agent/skills/", project_path: ".pi/skills/" },
  { name: "Pochi", id: "pochi", enabled: false, path: "~/.pochi/skills/", project_path: ".pochi/skills/" },
  { name: "Qoder", id: "qoder", enabled: false, path: "~/.qoder/skills/", project_path: ".qoder/skills/" },
  { name: "Qwen Code", id: "qwen-code", enabled: false, path: "~/.qwen/skills/", project_path: ".qwen/skills/" },
  { name: "Replit", id: "replit", enabled: false, path: "~/.config/agents/skills/", project_path: ".agents/skills/" },
  { name: "Roo Code", id: "roo", enabled: false, path: "~/.roo/skills/", project_path: ".roo/skills/" },
  { name: "Trae", id: "trae", enabled: false, path: "~/.trae/skills/", project_path: ".trae/skills/" },
  { name: "Trae CN", id: "trae-cn", enabled: false, path: "~/.trae-cn/skills/", project_path: ".trae/skills/" },
  { name: "Windsurf", id: "windsurf", enabled: true, path: "~/.codeium/windsurf/skills/", project_path: ".windsurf/skills/" },
  { name: "Zencoder", id: "zencoder", enabled: false, path: "~/.zencoder/skills/", project_path: ".zencoder/skills/" },
];

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [agents, setAgents] = useState<AgentConfig[]>(DEFAULT_AGENTS);
  const [globalSkillsPath, setGlobalSkillsPath] = useState("~/.agents/skills");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    try {
      const config = await invoke<{
        global_skills_path?: string;
        agents?: AgentConfig[];
      }>("get_app_settings").catch(() => null);

      if (config) {
        if (config.global_skills_path) {
          setGlobalSkillsPath(config.global_skills_path);
        }
        if (config.agents) {
          setAgents(config.agents);
        }
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      await invoke("save_app_settings", {
        settings: {
          global_skills_path: globalSkillsPath,
          agents,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const toggleAgent = (id: string) => {
    setAgents((prev) =>
      prev.map((agent) =>
        agent.id === id ? { ...agent, enabled: !agent.enabled } : agent
      )
    );
  };

  const updateAgentPath = (id: string, path: string) => {
    setAgents((prev) =>
      prev.map((agent) =>
        agent.id === id ? { ...agent, path } : agent
      )
    );
  };

  const updateAgentProjectPath = (id: string, project_path: string) => {
    setAgents((prev) =>
      prev.map((agent) =>
        agent.id === id ? { ...agent, project_path } : agent
      )
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure Skills Manager preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="global-path">Global Skills Directory</Label>
            <div className="flex gap-2">
              <Input
                id="global-path"
                value={globalSkillsPath}
                onChange={(e) => setGlobalSkillsPath(e.target.value)}
                placeholder="~/.agents/skills"
                className="flex-1"
              />
              <Button variant="outline" size="icon" disabled>
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Where your global skills are stored
            </p>
          </div>

          <div className="space-y-3">
            <Label>Agent Directories</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Skills are symlinked to these directories for each agent
            </p>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agents..."
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {filteredAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
                  >
                    <Checkbox
                      id={`agent-${agent.id}`}
                      checked={agent.enabled}
                      onCheckedChange={() => toggleAgent(agent.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`agent-${agent.id}`}
                          className="font-medium cursor-pointer"
                        >
                          {agent.name}
                        </Label>
                        {agent.enabled ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs"
                          >
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Disabled
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-14">Global:</span>
                          <Input
                            value={agent.path}
                            onChange={(e) => updateAgentPath(agent.id, e.target.value)}
                            disabled={!agent.enabled}
                            placeholder={`~/.${agent.id}/skills`}
                            className="text-sm h-7 flex-1"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-14">Project:</span>
                          <Input
                            value={agent.project_path}
                            onChange={(e) => updateAgentProjectPath(agent.id, e.target.value)}
                            disabled={!agent.enabled}
                            placeholder={`.${agent.id}/skills`}
                            className="text-sm h-7 flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              {saved && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Check className="h-4 w-4" />
                  Settings saved
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
