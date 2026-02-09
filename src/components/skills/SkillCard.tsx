import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Skill } from "@/types/skill";
import { GitBranch, Trash2 } from "lucide-react";

export type DeleteMode = "global" | "agent" | "project";

interface SkillCardProps {
  skill: Skill;
  onClick?: () => void;
  onSync?: () => void;
  onDelete?: (path: string, mode: DeleteMode) => void;
  deleteMode?: DeleteMode;
}

export function SkillCard({ skill, onClick, onSync, onDelete, deleteMode = "global" }: SkillCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const getDeleteMessage = () => {
    switch (deleteMode) {
      case "global":
        return `This will permanently delete "${skill.name}" from the central skills directory. This action cannot be undone.`;
      case "agent":
        return `This will remove "${skill.name}" from this agent. The original skill in the central directory will not be affected.`;
      case "project":
        return `This will remove "${skill.name}" from this project. The original skill will not be affected.`;
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    setConfirmOpen(false);
    onDelete?.(skill.path, deleteMode);
  };

  return (
    <>
      <div 
        className="bg-white rounded-xl shadow-sm border border-[hsl(30_10%_90%)] overflow-hidden hover:shadow-md transition-shadow"
        onClick={onClick}
      >
        <div className="p-4">
          <h3 className="text-lg font-semibold text-[hsl(18_65%_52%)] mb-2">
            {skill.name}
          </h3>

          <div className="h-24 overflow-y-auto mb-4">
            <p className="text-sm text-[hsl(20_10%_40%)] leading-relaxed">
              <span className="text-[hsl(18_65%_52%)]">// </span>
              {skill.description || "No description available"}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-[hsl(30_10%_90%)]">
            <Button 
              variant="default" 
              size="sm" 
              className="flex-1 bg-[hsl(20_10%_20%)] hover:bg-[hsl(20_10%_15%)] text-white"
              onClick={(e) => {
                e.stopPropagation();
                onSync?.();
              }}
            >
              <GitBranch className="h-3.5 w-3.5 mr-1.5" />
              Sync
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-[hsl(0_65%_50%)] hover:text-[hsl(0_65%_45%)] hover:bg-[hsl(0_65%_50%)]/10"
              onClick={handleDeleteClick}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Delete Skill</DialogTitle>
            <DialogDescription>
              {getDeleteMessage()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              className="bg-[hsl(0_65%_50%)] hover:bg-[hsl(0_65%_45%)]"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
