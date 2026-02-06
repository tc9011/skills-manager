import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  GitBranch,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Link,
  Unlink,
  FolderOpen,
} from "lucide-react";

interface SyncConfig {
  repo_url: string | null;
  branch: string;
  auto_sync: boolean;
  last_sync: string | null;
}

interface GitResult {
  success: boolean;
  message: string;
}

export function SyncPanel() {
  const [config, setConfig] = useState<SyncConfig>({
    repo_url: null,
    branch: "main",
    auto_sync: false,
    last_sync: null,
  });
  const [isGitRepo, setIsGitRepo] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);
  const [hasExistingFolder, setHasExistingFolder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<GitResult | null>(null);

  const [repoUrlInput, setRepoUrlInput] = useState("");
  const [branchInput, setBranchInput] = useState("main");
  const [commitMessage, setCommitMessage] = useState("");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const [configResult, isRepo, remote, folderExists] = await Promise.all([
        invoke<SyncConfig>("get_sync_config"),
        invoke<boolean>("is_git_repo"),
        invoke<string | null>("get_git_remote"),
        invoke<boolean>("check_skills_folder_exists"),
      ]);

      setConfig(configResult);
      setIsGitRepo(isRepo);
      setRemoteUrl(remote);
      setHasExistingFolder(folderExists);
      setRepoUrlInput(configResult.repo_url || "");
      setBranchInput(configResult.branch || "main");
    } catch (err) {
      console.error("Failed to load sync status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleSetupRepo = async () => {
    if (!repoUrlInput.trim()) return;

    setSyncing(true);
    setResult(null);

    try {
      const res = await invoke<GitResult>("git_clone_repo", {
        repoUrl: repoUrlInput.trim(),
        branch: branchInput,
      });

      setResult(res);

      if (res.success) {
        await invoke("save_sync_config", {
          config: {
            repo_url: repoUrlInput.trim(),
            branch: branchInput,
            auto_sync: false,
            last_sync: new Date().toISOString(),
          },
        });
        loadStatus();
      }
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleInitRepo = async () => {
    if (!repoUrlInput.trim()) return;

    setSyncing(true);
    setResult(null);

    try {
      const res = await invoke<GitResult>("git_init_repo", {
        repoUrl: repoUrlInput.trim(),
        branch: branchInput,
      });

      setResult(res);

      if (res.success) {
        await invoke("save_sync_config", {
          config: {
            repo_url: repoUrlInput.trim(),
            branch: branchInput,
            auto_sync: false,
            last_sync: new Date().toISOString(),
          },
        });
        loadStatus();
      }
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSyncing(false);
    }
  };

  const handlePull = async () => {
    setSyncing(true);
    setResult(null);

    try {
      const res = await invoke<GitResult>("git_pull");
      setResult(res);

      if (res.success) {
        await invoke("save_sync_config", {
          config: {
            ...config,
            last_sync: new Date().toISOString(),
          },
        });
      }
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSyncing(false);
    }
  };

  const handlePush = async () => {
    if (!commitMessage.trim()) return;

    setSyncing(true);
    setResult(null);

    try {
      const res = await invoke<GitResult>("git_add_commit_push", {
        message: commitMessage.trim(),
      });
      setResult(res);

      if (res.success) {
        setCommitMessage("");
        await invoke("save_sync_config", {
          config: {
            ...config,
            last_sync: new Date().toISOString(),
          },
        });
      }
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Loading sync status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Repository Status
          </CardTitle>
          <CardDescription>
            Sync your skills with a GitHub repository
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isGitRepo && remoteUrl ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  <Link className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Remote: </span>
                <code className="bg-muted px-1 py-0.5 rounded text-xs">{remoteUrl}</code>
              </div>
              {config.last_sync && (
                <div className="text-sm text-muted-foreground">
                  Last synced: {new Date(config.last_sync).toLocaleString()}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-muted-foreground">
                <Unlink className="h-3 w-3 mr-1" />
                Not Connected
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {!isGitRepo ? (
        hasExistingFolder ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Initialize Repository
              </CardTitle>
              <CardDescription>
                Existing skills folder found. Connect it to a GitHub repository.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="repo-url">Repository URL</Label>
                <Input
                  id="repo-url"
                  placeholder="https://github.com/username/skills-repo.git"
                  value={repoUrlInput}
                  onChange={(e) => setRepoUrlInput(e.target.value)}
                  disabled={syncing}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="branch">Branch</Label>
                <Input
                  id="branch"
                  placeholder="main"
                  value={branchInput}
                  onChange={(e) => setBranchInput(e.target.value)}
                  disabled={syncing}
                />
              </div>
              <Button
                onClick={handleInitRepo}
                disabled={syncing || !repoUrlInput.trim()}
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <GitBranch className="h-4 w-4 mr-2" />
                    Initialize Repository
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Setup Repository</CardTitle>
              <CardDescription>
                Clone a GitHub repository to sync your skills
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="repo-url">Repository URL</Label>
                <Input
                  id="repo-url"
                  placeholder="https://github.com/username/skills-repo.git"
                  value={repoUrlInput}
                  onChange={(e) => setRepoUrlInput(e.target.value)}
                  disabled={syncing}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="branch">Branch</Label>
                <Input
                  id="branch"
                  placeholder="main"
                  value={branchInput}
                  onChange={(e) => setBranchInput(e.target.value)}
                  disabled={syncing}
                />
              </div>
              <Button
                onClick={handleSetupRepo}
                disabled={syncing || !repoUrlInput.trim()}
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cloning...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Clone Repository
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Pull Changes</CardTitle>
              <CardDescription>
                Download latest changes from the remote repository
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handlePull} disabled={syncing}>
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Pulling...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Pull Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Push Changes</CardTitle>
              <CardDescription>
                Upload local changes to the remote repository
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="commit-msg">Commit Message</Label>
                <Input
                  id="commit-msg"
                  placeholder="Update skills"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  disabled={syncing}
                />
              </div>
              <Button
                onClick={handlePush}
                disabled={syncing || !commitMessage.trim()}
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Pushing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Commit & Push
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {result && (
        <Card className={result.success ? "border-emerald-500/30" : "border-destructive/30"}>
          <CardContent className="pt-4">
            <div className={`flex items-start gap-2 ${result.success ? "text-emerald-400" : "text-destructive"}`}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {result.message}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={loadStatus}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Status
        </Button>
      </div>
    </div>
  );
}
