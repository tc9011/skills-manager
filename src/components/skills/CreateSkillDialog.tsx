import { useState } from "react";
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
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface CreateSkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateSkillDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateSkillDialogProps) {
  const [skillName, setSkillName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim() || !content.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await invoke("create_skill_file", {
        skillName: skillName.trim(),
        description: description.trim(),
        content: content.trim(),
      });

      setSuccess(true);
      toast.success("Skill created successfully!");
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      toast.error("Failed to create skill", {
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSkillName("");
    setDescription("");
    setContent("");
    setSuccess(false);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Skill</DialogTitle>
          <DialogDescription>
            Write your own skill with a name, optional description, and
            markdown content.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="skill-name">Skill Name *</Label>
              <Input
                id="skill-name"
                placeholder="e.g., my-awesome-skill"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                disabled={loading}
                className="border-[hsl(30_10%_85%)]"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="skill-description">Description</Label>
              <Input
                id="skill-description"
                placeholder="What does this skill do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                className="border-[hsl(30_10%_85%)]"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="skill-content">Skill Content (Markdown) *</Label>
              <textarea
                id="skill-content"
                placeholder="# Your Skill Content&#10;&#10;Enter the markdown content for your skill..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={loading}
                className="w-full h-64 p-3 border border-[hsl(30_10%_85%)] rounded-md bg-white text-[hsl(20_10%_20%)] placeholder-[hsl(20_5%_55%)] font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(18_65%_52%)] focus:border-transparent"
              />
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-[hsl(20_5%_55%)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating skill...</span>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-emerald-500/10 text-emerald-700">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-sm">Skill created successfully!</p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-[hsl(0_65%_50%)]/10 text-[hsl(0_65%_50%)]">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !skillName.trim() || !content.trim()}
              className="bg-[hsl(18_65%_52%)] hover:bg-[hsl(18_65%_47%)] text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Skill"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
