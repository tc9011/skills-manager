import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Skill } from "@/types/skill";
import { FolderSymlink, HardDrive, Cloud } from "lucide-react";

interface SkillCardProps {
  skill: Skill;
  onClick?: () => void;
}

const sourceIcons = {
  local: HardDrive,
  remote: Cloud,
  symlink: FolderSymlink,
};

const agentColors: Record<string, string> = {
  opencode: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  claude: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  cursor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export function SkillCard({ skill, onClick }: SkillCardProps) {
  const SourceIcon = sourceIcons[skill.source];

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent/50"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-medium">{skill.name}</CardTitle>
          <SourceIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <CardDescription className="line-clamp-2 text-sm">
          {skill.description || "No description available"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1">
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
              Not installed in any agent
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
