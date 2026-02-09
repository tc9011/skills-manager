import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { SkillSource } from "@/types/source";
import { toast } from "sonner";

interface AddSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddSourceDialog({ open, onOpenChange, onSuccess }: AddSourceDialogProps) {
  const [sourceType, setSourceType] = useState<"github" | "local">("github");
  const [name, setName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [path, setPath] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let source: SkillSource;
      const id = crypto.randomUUID();

      if (sourceType === "github") {
        source = {
          type: "github",
          id,
          name: name || repoUrl.split("/").pop() || "GitHub Source",
          repo_url: repoUrl,
          branch,
          path: path || undefined,
        };
      } else {
        source = {
          type: "local",
          id,
          name: name || localPath.split("/").pop() || "Local Source",
          path: localPath,
        };
      }

      await invoke("add_source", { source });
      toast.success("Source added");
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (err) {
      toast.error(`Failed to add source: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setRepoUrl("");
    setBranch("main");
    setPath("");
    setLocalPath("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Skill Source</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <RadioGroup
            value={sourceType}
            onValueChange={(v) => setSourceType(v as "github" | "local")}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="github" id="github" />
              <Label htmlFor="github">GitHub</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="local" id="local" />
              <Label htmlFor="local">Local Directory</Label>
            </div>
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Skills"
            />
          </div>

          {sourceType === "github" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="repo">Repository URL</Label>
                <Input
                  id="repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/user/skills-repo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Input
                  id="branch"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="path">Subdirectory (optional)</Label>
                <Input
                  id="path"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="skills/"
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="localPath">Directory Path</Label>
              <Input
                id="localPath"
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                placeholder="/path/to/skills"
                required
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Source"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
