import { invoke } from "@tauri-apps/api/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ConflictInfo } from "@/types/source";
import { toast } from "sonner";

interface ConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: ConflictInfo[];
  sourceId: string;
  onResolved: () => void;
}

export function ConflictDialog({
  open,
  onOpenChange,
  conflicts,
  sourceId,
  onResolved,
}: ConflictDialogProps) {
  const handleResolve = async (
    skillName: string,
    resolution: "KeepCentral" | "UseSource"
  ) => {
    try {
      await invoke("resolve_conflict", {
        skillName,
        sourceId,
        resolution,
      });
      toast.success(`Resolved conflict for ${skillName}`);
      onResolved();
    } catch (err) {
      toast.error(`Failed to resolve: ${err}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Resolve Conflicts ({conflicts.length})</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {conflicts.map((conflict) => (
            <div key={conflict.skill_name} className="border rounded-md p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">{conflict.skill_name}</h3>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded dark:bg-yellow-900 dark:text-yellow-200">
                  {conflict.conflict_type}
                </span>
              </div>

              <div className="flex gap-4 text-xs mb-3 text-muted-foreground">
                <span>
                  Source: <code className="bg-muted px-1">{conflict.source_version}</code>
                </span>
                <span>
                  Central: <code className="bg-muted px-1">{conflict.central_version}</code>
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResolve(conflict.skill_name, "KeepCentral")}
                >
                  Keep Central
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleResolve(conflict.skill_name, "UseSource")}
                >
                  Use Source
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
