import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { SourceCard } from "./SourceCard";
import { AddSourceDialog } from "./AddSourceDialog";
import { ConflictDialog } from "./ConflictDialog";
import { Plus } from "lucide-react";
import type { SkillSource, SyncResult, ConflictInfo } from "@/types/source";
import { toast } from "sonner";

export function SourcesPanel() {
  const [sources, setSources] = useState<SkillSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [conflictSourceId, setConflictSourceId] = useState<string | null>(null);

  const loadSources = async () => {
    try {
      const result = await invoke<SkillSource[]>("get_sources");
      setSources(result);
    } catch (err) {
      console.error("Failed to load sources:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleSync = async (sourceId: string) => {
    setSyncingId(sourceId);
    try {
      const result = await invoke<SyncResult>("sync_from_source", { sourceId });
      if (result.conflicts.length > 0) {
        setConflicts(result.conflicts);
        setConflictSourceId(sourceId);
        toast.warning(`Synced with ${result.conflicts.length} conflicts`);
      } else {
        toast.success(`Synced ${result.skills_synced.length} skills`);
      }
    } catch (err) {
      toast.error(`Sync failed: ${err}`);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (sourceId: string) => {
    try {
      await invoke("remove_source", { sourceId });
      loadSources();
      toast.success("Source removed");
    } catch (err) {
      toast.error(`Failed to remove: ${err}`);
    }
  };

  const handleConflictResolved = () => {
    setConflicts([]);
    setConflictSourceId(null);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Loading sources...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Skill Sources</h2>
          <p className="text-sm text-muted-foreground">
            Add GitHub repos or local directories to sync skills from
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Source
        </Button>
      </div>

      <div className="space-y-3">
        {sources.map((source) => (
          <SourceCard
            key={source.id}
            source={source}
            onSync={() => handleSync(source.id)}
            onDelete={() => handleDelete(source.id)}
            syncing={syncingId === source.id}
          />
        ))}
        {sources.length === 0 && (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <p className="text-muted-foreground mb-2">No sources configured</p>
            <p className="text-sm text-muted-foreground">
              Add a GitHub repo or local directory to get started
            </p>
          </div>
        )}
      </div>

      <AddSourceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={loadSources}
      />

      <ConflictDialog
        open={conflicts.length > 0}
        onOpenChange={() => handleConflictResolved()}
        conflicts={conflicts}
        sourceId={conflictSourceId || ""}
        onResolved={handleConflictResolved}
      />
    </div>
  );
}
