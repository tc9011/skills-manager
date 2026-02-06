import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Skill } from "@/types/skill";
import { GitBranch, Trash2 } from "lucide-react";

interface SkillCardProps {
  skill: Skill;
  onClick?: () => void;
  onSync?: () => void;
  onDelete?: () => void;
  hideAgentBadges?: boolean;
}

export function SkillCard({ skill, onClick, onSync, onDelete, hideAgentBadges }: SkillCardProps) {
  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-[hsl(30_10%_90%)] overflow-hidden hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="text-lg font-semibold text-[hsl(18_65%_52%)] mb-2">
          {skill.name}
        </h3>

        {/* Badges */}
        {!hideAgentBadges && (
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge className="bg-[hsl(18_65%_52%)] text-white hover:bg-[hsl(18_65%_47%)]">
              Hub
            </Badge>
            {skill.installed_in.length > 0 ? (
              skill.installed_in.map((agent) => (
                <Badge
                  key={agent}
                  variant="outline"
                  className="border-[hsl(30_10%_85%)] text-[hsl(20_10%_40%)]"
                >
                  {agent}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="border-[hsl(30_10%_85%)] text-[hsl(20_5%_55%)]">
                Not installed
              </Badge>
            )}
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-[hsl(20_10%_40%)] leading-relaxed mb-4">
          <span className="text-[hsl(18_65%_52%)]">// </span>
          {skill.description || "No description available"}
        </p>

        {/* Actions */}
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
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
