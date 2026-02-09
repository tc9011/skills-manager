import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import ReactMarkdown from "react-markdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  FolderOpen,
  Copy,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import type { Skill } from "@/types/skill";

interface SkillDetailDialogProps {
  skill: Skill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

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
      const rawError = err instanceof Error ? err.message : String(err);
      const cleanError = rawError.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
      setError(cleanError);
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
      onOpenChange(false);
      toast.success("Skill deleted successfully!");
      onDeleted();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      toast.error("Failed to delete skill", {
        description: errorMsg,
      });
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
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {skill.name}
          </DialogTitle>
          <DialogDescription>{skill.description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 max-h-[50vh] overflow-y-auto border rounded-md bg-muted/30">
          {loading ? (
            <div className="flex items-center justify-center py-8 px-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error && !content ? (
            <div className="flex items-start gap-2 text-destructive p-4 overflow-hidden">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="break-all overflow-wrap-anywhere min-w-0">{error}</span>
            </div>
          ) : (
            <div className="p-4 text-sm prose prose-sm prose-invert max-w-none [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h3]:text-base [&_h3]:font-medium [&_h3]:mb-2 [&_h3]:mt-2 [&_p]:mb-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-1 [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:overflow-x-auto [&_pre]:my-2 [&_pre]:font-mono [&_pre]:text-xs [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-xs [&_blockquote]:border-l-4 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-2 [&_a]:text-primary [&_a]:underline [&_hr]:my-4 [&_hr]:border-muted [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-muted [&_th]:p-2 [&_th]:text-left [&_th]:bg-muted/50 [&_td]:border [&_td]:border-muted [&_td]:p-2">
              <ReactMarkdown>
                {contentWithoutFrontmatter || "No content available"}
              </ReactMarkdown>
            </div>
          )}
        </div>

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
