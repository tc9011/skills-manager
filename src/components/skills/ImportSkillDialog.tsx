import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
}

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
}

interface ImportSkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ImportSkillDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportSkillDialogProps) {
  const [skillName, setSkillName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CommandResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installedAgents, setInstalledAgents] = useState<AgentConfig[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  useEffect(() => {
    if (open) {
      loadInstalledAgents();
    }
  }, [open]);

  const loadInstalledAgents = async () => {
    setLoadingAgents(true);
    try {
      const settings = await invoke<AppSettings>("get_app_settings");
      if (settings.agents) {
        const agentPaths: [string, string][] = settings.agents.map((a) => [
          a.id,
          a.path,
        ]);
        const installedIds = await invoke<string[]>("detect_installed_agents", {
          agents: agentPaths,
        });
        const installed = settings.agents.filter((a) =>
          installedIds.includes(a.id)
        );
        setInstalledAgents(installed);
        setSelectedAgents(installed.map((a) => a.id));
      }
    } catch {
      setInstalledAgents([]);
      setSelectedAgents([]);
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleAgentToggle = (agentId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAgents(installedAgents.map((a) => a.id));
    } else {
      setSelectedAgents([]);
    }
  };

  const allSelected =
    installedAgents.length > 0 &&
    selectedAgents.length === installedAgents.length;
  const someSelected =
    selectedAgents.length > 0 &&
    selectedAgents.length < installedAgents.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);

    const toastId = toast.loading("Installing skill...");

    try {
      const res = await invoke<CommandResult>("run_skills_add", {
        skillName: skillName.trim(),
        agents: selectedAgents,
      });
      setResult(res);
      if (res.success) {
        toast.success("Skill imported successfully!", { id: toastId });
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 1500);
      } else {
        toast.error("Failed to import skill", {
          id: toastId,
          description: res.stderr || res.stdout || "Installation failed",
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      toast.error("Failed to import skill", {
        id: toastId,
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSkillName("");
    setResult(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Import Skill</DialogTitle>
          <DialogDescription>
            Install skills from a GitHub repository using{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">
              npx skills add
            </code>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="grid gap-4 py-4 px-1 overflow-y-auto min-h-0 flex-1 mb-4">
            <div className="grid gap-2">
              <Label htmlFor="skill-name">Repository Source</Label>
              <Input
                id="skill-name"
                placeholder="owner/repo"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                disabled={loading}
              />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Examples:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li>
                    <code className="bg-muted px-1 rounded">
                      anthropics/courses
                    </code>
                  </li>
                  <li>
                    <code className="bg-muted px-1 rounded">
                      different-ai/opencode
                    </code>
                  </li>
                  <li>
                    <code className="bg-muted px-1 rounded">
                      https://github.com/user/repo
                    </code>
                  </li>
                  <li>
                    <code className="bg-muted px-1 rounded">
                      https://github.com/anthropics/skills --skill xlsx
                    </code>
                  </li>
                </ul>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Install to Agents</Label>
              {loadingAgents ? (
                <div className="flex items-center gap-2 text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading agents...</span>
                </div>
              ) : installedAgents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No agents detected on this machine.
                </p>
              ) : (
                <div className="border rounded-md p-3 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      className={someSelected ? "opacity-50" : ""}
                    />
                    <label
                      htmlFor="select-all"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Select All ({installedAgents.length} agents)
                    </label>
                  </div>
                  <div className="border-t pt-2 space-y-2">
                    {installedAgents.map((agent) => (
                      <div
                        key={agent.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`agent-${agent.id}`}
                          checked={selectedAgents.includes(agent.id)}
                          onCheckedChange={() => handleAgentToggle(agent.id)}
                        />
                        <label
                          htmlFor={`agent-${agent.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {agent.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Installing skill...</span>
              </div>
            )}
          </div>

          {result && !result.success && (
            <div className="flex items-start gap-2 p-3 rounded-md mb-4 max-h-[30vh] overflow-y-auto bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="text-sm min-w-0 overflow-hidden">
                <pre className="whitespace-pre-wrap font-mono text-xs break-all">
                  {result.stderr || result.stdout || "Installation failed"}
                </pre>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive mb-4 max-h-[30vh] overflow-y-auto">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="text-sm break-all">{error}</p>
            </div>
          )}

          <DialogFooter className="shrink-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !skillName.trim()}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Installing...
                </>
              ) : (
                "Install"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
