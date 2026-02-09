import { SkillCard, type DeleteMode } from "./SkillCard";
import type { Skill } from "@/types/skill";
import { Package, Loader2, AlertCircle, RefreshCw, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SkillsListProps {
  skills: Skill[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSkillClick?: (skill: Skill) => void;
  onDelete?: (path: string, mode: DeleteMode) => void;
  deleteMode?: DeleteMode;
  title?: string;
}

export function SkillsList({
  skills,
  loading,
  error,
  onRetry,
  onSkillClick,
  onDelete,
  deleteMode = "global",
  title = "Skills",
}: SkillsListProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Loading skills...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-destructive">
        <AlertCircle className="h-8 w-8 mb-4" />
        <p className="text-lg font-medium">Failed to load skills</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-[hsl(18_65%_52%)]" />
            <h2 className="text-lg font-medium">{title}</h2>
          </div>
          <span className="text-sm text-[hsl(20_5%_55%)]">0 skills</span>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No skills found</p>
          <p className="text-sm mt-1">
            Click "Import Skill" to add your first skill
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-[hsl(18_65%_52%)]" />
          <h2 className="text-lg font-medium">{title}</h2>
        </div>
        <span className="text-sm text-[hsl(20_5%_55%)]">{skills.length} skills</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {skills.map((skill) => (
          <SkillCard
            key={skill.path}
            skill={skill}
            onClick={() => onSkillClick?.(skill)}
            onDelete={onDelete}
            deleteMode={deleteMode}
          />
        ))}
      </div>
    </div>
  );
}
