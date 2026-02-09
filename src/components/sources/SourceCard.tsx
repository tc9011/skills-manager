import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitBranch, Folder, Globe, RefreshCw, Trash2 } from "lucide-react";
import type { SkillSource } from "@/types/source";

interface SourceCardProps {
  source: SkillSource;
  onSync: () => void;
  onDelete: () => void;
  syncing?: boolean;
}

export function SourceCard({ source, onSync, onDelete, syncing }: SourceCardProps) {
  const getIcon = () => {
    switch (source.type) {
      case "github":
        return <GitBranch className="h-5 w-5" />;
      case "local":
        return <Folder className="h-5 w-5" />;
      case "registry":
        return <Globe className="h-5 w-5" />;
    }
  };

  const getSubtitle = () => {
    switch (source.type) {
      case "github":
        return `${source.repo_url} @ ${source.branch}`;
      case "local":
        return source.path;
      case "registry":
        return source.url;
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-muted rounded-md">{getIcon()}</div>
          <div>
            <h3 className="font-medium">{source.name}</h3>
            <p className="text-sm text-muted-foreground truncate max-w-[300px]">
              {getSubtitle()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
            Sync
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
