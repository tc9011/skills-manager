import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  FolderOpen,
  Copy,
} from "lucide-react";
import type { Skill } from "@/types/skill";

interface SkillDetailDialogProps {
  skill: Skill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

const agentColors: Record<string, string> = {
  opencode: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  claude: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  cursor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export function SkillDetailDialog({
  skill,
  open,
  onOpenChange,
  onDeleted,
}: SkillDetailDialogProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open && skill) {
      loadContent();
    } else {
      setContent(null);
      setDeleteConfirm(false);
      setDeleteSuccess(false);
      setCopySuccess(null);
      setError(null);
    }
  }, [open, skill]);

  const loadContent = async () => {
    if (!skill) return;
    setLoading(true);
    try {
      const result = await invoke<string>("get_skill_content", {
        path: skill.path,
      });
      setContent(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!skill) return;

    setDeleting(true);
    setError(null);

    try {
      await invoke("delete_skill_directory", { path: skill.path });
      setDeleteSuccess(true);
      setTimeout(() => {
        onDeleted();
        onOpenChange(false);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyToProject = async () => {
    if (!skill) return;

    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        title: "Select destination folder for skill",
      });

      if (selected && typeof selected === "string") {
        setCopying(true);
        setError(null);
        setCopySuccess(null);

        const result = await invoke<string>("copy_skill", {
          sourcePath: skill.path,
          destDir: selected,
        });
        setCopySuccess(result);
        setTimeout(() => setCopySuccess(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCopying(false);
    }
  };

  if (!skill) return null;

  const contentWithoutFrontmatter = content
    ? content.replace(/^---[\s\S]*?---\n*/m, "").trim()
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {skill.name}
          </DialogTitle>
          <DialogDescription>{skill.description}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2">
          <span className="text-sm text-muted-foreground">Installed in:</span>
          {skill.installed_in.length > 0 ? (
            skill.installed_in.map((agent) => (
              <Badge
                key={agent}
                variant="outline"
                className={agentColors[agent] || ""}
              >
                {agent}
              </Badge>
            ))
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              No agents
            </Badge>
          )}
        </div>

        <ScrollArea className="flex-1 min-h-0 border rounded-md p-4 bg-muted/30">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error && !content ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : (
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {contentWithoutFrontmatter || "No content available"}
            </pre>
          )}
        </ScrollArea>

        {deleteSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>Skill deleted successfully!</span>
          </div>
        )}

        {copySuccess && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>{copySuccess}</span>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                invoke("tauri_plugin_opener::open", { path: skill.path })
              }
            >
              <FolderOpen className="h-4 w-4 mr-1" />
              Open Folder
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyToProject}
              disabled={copying}
            >
              {copying ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              Copy to Project
            </Button>
          </div>

          <div className="flex gap-2">
            {deleteConfirm ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Confirm Delete"
                  )}
                </Button>
              </>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Skill
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
