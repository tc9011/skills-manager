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
import {
  FolderOpen,
  Check,
  Loader2,
} from "lucide-react";

interface AgentConfig {
  name: string;
  id: string;
  enabled: boolean;
  path: string;
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_AGENTS: AgentConfig[] = [
  {
    name: "OpenCode",
    id: "opencode",
    enabled: true,
    path: "~/.config/opencode/skills",
  },
  {
    name: "Claude Code",
    id: "claude",
    enabled: true,
    path: "~/.claude/skills",
  },
  {
    name: "Cursor",
    id: "cursor",
    enabled: true,
    path: "~/.cursor/skills",
  },
];

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [agents, setAgents] = useState<AgentConfig[]>(DEFAULT_AGENTS);
  const [globalSkillsPath, setGlobalSkillsPath] = useState("~/.agents/skills");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

            <div className="space-y-3">
              {agents.map((agent) => (
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
                    <Input
                      value={agent.path}
                      onChange={(e) => updateAgentPath(agent.id, e.target.value)}
                      disabled={!agent.enabled}
                      placeholder={`~/.${agent.id}/skills`}
                      className="text-sm h-8"
                    />
                  </div>
                </div>
              ))}
            </div>
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
