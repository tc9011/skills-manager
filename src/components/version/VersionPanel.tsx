import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GitBranch, GitCommit, RotateCcw, FolderGit2 } from "lucide-react";
import type { CommitInfo, FileStatus, DiffResult } from "@/types/version";
import { toast } from "sonner";

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatTimestamp(timestamp);
}

export function VersionPanel() {
  const [isGitRepo, setIsGitRepo] = useState<boolean | null>(null);
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [workingStatus, setWorkingStatus] = useState<FileStatus[]>([]);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [commitMessage, setCommitMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const checkRepo = async () => {
    try {
      const isRepo = await invoke<boolean>("is_central_git_repo");
      setIsGitRepo(isRepo);
      if (isRepo) {
        await loadRepoData();
      }
    } catch (err) {
      console.error("Failed to check repo status:", err);
      setIsGitRepo(false);
    } finally {
      setLoading(false);
    }
  };

  const loadRepoData = async () => {
    try {
      const [commitsData, statusData, diffData] = await Promise.all([
        invoke<CommitInfo[]>("get_commit_history", { limit: 50 }),
        invoke<FileStatus[]>("get_repo_status"),
        invoke<DiffResult>("get_working_diff"),
      ]);
      setCommits(commitsData);
      setWorkingStatus(statusData);
      setDiffResult(diffData);
    } catch (err) {
      console.error("Failed to load repo data:", err);
    }
  };

  useEffect(() => {
    checkRepo();
  }, []);

  const handleInitRepo = async () => {
    setInitializing(true);
    try {
      await invoke<string>("init_central_repo");
      setIsGitRepo(true);
      await loadRepoData();
      toast.success("Git repository initialized");
    } catch (err) {
      toast.error(`Failed to initialize: ${err}`);
    } finally {
      setInitializing(false);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      toast.error("Please enter a commit message");
      return;
    }
    setCommitting(true);
    try {
      await invoke<CommitInfo>("create_commit", { message: commitMessage });
      setCommitMessage("");
      await loadRepoData();
      toast.success("Changes committed");
    } catch (err) {
      toast.error(`Commit failed: ${err}`);
    } finally {
      setCommitting(false);
    }
  };

  const handleCheckout = async (commitId: string) => {
    try {
      await invoke<string>("checkout_commit", { commitId });
      await loadRepoData();
      toast.success("Checked out commit");
    } catch (err) {
      toast.error(`Checkout failed: ${err}`);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Loading version history...</p>
      </div>
    );
  }

  if (!isGitRepo) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <FolderGit2 className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">Central is not a Git repository</h2>
        <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
          Initialize a Git repository in your Central skills directory to track changes, view history, and rollback when needed.
        </p>
        <Button onClick={handleInitRepo} disabled={initializing}>
          <GitBranch className="h-4 w-4 mr-2" />
          {initializing ? "Initializing..." : "Initialize Git Repository"}
        </Button>
      </div>
    );
  }

  const hasChanges = workingStatus.length > 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Version History</h2>
        <p className="text-sm text-muted-foreground">
          Track and manage changes to your Central skills
        </p>
      </div>

      {hasChanges && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GitCommit className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Uncommitted Changes</span>
              {diffResult && (
                <span className="text-xs text-muted-foreground">
                  ({diffResult.stats.files_changed} files,{" "}
                  <span className="text-green-600">+{diffResult.stats.insertions}</span>{" "}
                  <span className="text-red-600">-{diffResult.stats.deletions}</span>)
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1 mb-4">
            {workingStatus.slice(0, 5).map((file) => (
              <div key={file.path} className="flex items-center gap-2 text-sm">
                <span
                  className={
                    file.status === "new" || file.status === "untracked"
                      ? "text-green-600"
                      : file.status === "deleted"
                        ? "text-red-600"
                        : "text-yellow-600"
                  }
                >
                  {file.status === "new" || file.status === "untracked"
                    ? "A"
                    : file.status === "deleted"
                      ? "D"
                      : "M"}
                </span>
                <span className="text-muted-foreground truncate">{file.path}</span>
              </div>
            ))}
            {workingStatus.length > 5 && (
              <p className="text-xs text-muted-foreground">
                +{workingStatus.length - 5} more files
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Commit message..."
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCommit()}
              className="flex-1"
            />
            <Button onClick={handleCommit} disabled={committing || !commitMessage.trim()}>
              {committing ? "Committing..." : "Commit"}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Commits
        </h3>
        {commits.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-lg">
            <p className="text-muted-foreground">No commits yet</p>
            <p className="text-sm text-muted-foreground">
              Make changes to your skills and commit them
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {commits.map((commit, index) => (
              <div
                key={commit.id}
                className="group flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <GitCommit className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {index < commits.length - 1 && (
                    <div className="w-px h-full bg-border mt-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{commit.message}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span className="font-mono">{commit.short_id}</span>
                    <span>by {commit.author}</span>
                    <span>{formatRelativeTime(commit.timestamp)}</span>
                  </div>
                  {commit.files_changed > 0 && (
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="text-muted-foreground">
                        {commit.files_changed} file{commit.files_changed !== 1 ? "s" : ""} changed
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleCheckout(commit.id)}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Checkout
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
