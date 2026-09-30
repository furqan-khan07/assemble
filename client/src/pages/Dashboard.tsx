import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Upload,
  FolderOpen,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Trash2,
  FileText,
  LogOut,
  Coins,
  ShoppingCart,
  PartyPopper,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_CONFIG = {
  new: { label: "New", icon: Clock, color: "bg-muted text-muted-foreground" },
  processing: { label: "Processing…", icon: Loader2, color: "bg-blue-100 text-blue-700", spin: true },
  ready: { label: "Ready", icon: CheckCircle2, color: "bg-green-100 text-green-700" },
  failed: { label: "Failed — credits refunded", icon: AlertCircle, color: "bg-red-100 text-red-700" },
};

export default function Dashboard() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState<number | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null);
  const [projectName, setProjectName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  // Stable file size for the canUpload query — only update when file changes
  const [stableFileSize, setStableFileSize] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const [location, setLocation] = useLocation();

  // Handle Stripe redirect back with ?payment=success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      toast.success("Payment successful! Credits added to your account.", {
        icon: <PartyPopper className="w-4 h-4" />,
        duration: 6000,
      });
      // Fire Google Ads purchase conversion event
      if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
        (window as any).gtag("event", "conversion", {
          send_to: "AW-17969255807/q3cMCMmFvf4bEP-qtPhC",
          transaction_id: "",
        });
      }
      utils.credits.balance.invalidate();
      setLocation("/app", { replace: true });
    } else if (params.get("welcome") === "1") {
      // New user welcome — show after a short delay so auth loads first
      setTimeout(() => {
        toast.success(
          "Welcome to AssembleAI! 🎉 We've added 10 free credits to your account — upload your first manual to get started.",
          { icon: <PartyPopper className="w-4 h-4" />, duration: 8000 }
        );
      }, 800);
      setLocation("/app", { replace: true });
    }
  }, []);

  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const hasProcessing = data.some((p) => p.status === "processing");
      return hasProcessing ? 3000 : false;
    },
  });

  const { data: creditBalance } = trpc.credits.balance.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: uploadStatus } = trpc.projects.canUpload.useQuery(
    { fileSizeBytes: stableFileSize },
    { enabled: isAuthenticated }
  );

  const createCheckout = trpc.credits.createCheckout.useMutation();

  const createProject = trpc.projects.create.useMutation({
    onSuccess: (data) => {
      utils.projects.list.invalidate();
      utils.credits.balance.invalidate();
      setProjectName("");
      setShowCreateDialog(false);
      toast.success(`Project "${data.name}" created!`);
      setShowUploadDialog(data.id);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteProject = trpc.projects.delete.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      utils.credits.balance.invalidate();
      setDeleteProjectId(null);
      toast.success("Project deleted.");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreateProject = () => {
    if (!projectName.trim()) return;
    createProject.mutate({ name: projectName.trim() });
  };

  const handleFileUpload = async () => {
    if (!selectedFile || showUploadDialog === null) return;

    // Credit check
    const cost = uploadStatus?.creditCost ?? 1;
    const balance = creditBalance?.credits ?? 0;
    if (balance < cost) {
      toast.error(`Not enough credits. This manual costs ${cost} credit${cost > 1 ? "s" : ""} but you have ${balance}.`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("manual", selectedFile);

      const res = await fetch(`/api/projects/${showUploadDialog}/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        // Show specific error messages for known error codes
        if (data.code === "JOB_IN_PROGRESS") {
          toast.error(data.error ?? "A manual is already being processed. Please wait for it to finish.", { duration: 6000 });
        } else if (data.code === "INSUFFICIENT_CREDITS") {
          toast.error(data.error ?? "Not enough credits.", { duration: 6000 });
        } else if (data.code === "FILE_TOO_LARGE") {
          toast.error(data.error ?? "File is too large. Maximum is 50 MB.", { duration: 6000 });
        } else if (data.code === "INVALID_FILE" || data.code === "INVALID_PDF_HEADER") {
          toast.error(data.error ?? "Invalid file. Please upload a valid PDF.", { duration: 6000 });
        } else if (data.code === "SUSPICIOUS_FILE") {
          toast.error(data.error ?? "This file was rejected for security reasons. Please try a different PDF.", { duration: 6000 });
        } else {
          toast.error(data.error ?? "Upload failed. Please try again.");
        }
        return;
      }

      toast.success("Manual uploaded! Processing started…");
      setShowUploadDialog(null);
      setSelectedFile(null);
      setStableFileSize(0);
      utils.projects.list.invalidate();
      utils.credits.balance.invalidate();
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleBuyCredits = async (packId: string) => {
    try {
      const result = await createCheckout.mutateAsync({
        packId,
        origin: window.location.origin,
      });
      if (result.url) {
        toast.info("Redirecting to checkout…");
        window.open(result.url, "_blank");
      }
    } catch {
      toast.error("Could not start checkout. Please try again.");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <h2 className="text-xl font-bold text-foreground mb-2">Sign in to continue</h2>
          <p className="text-muted-foreground mb-6">You need to be signed in to access your projects.</p>
          <a href={getLoginUrl()}>
            <Button>Sign In / Sign Up</Button>
          </a>
        </div>
      </div>
    );
  }

  const credits = creditBalance?.credits ?? 0;
  const creditCost = uploadStatus?.creditCost ?? 1;
  const hasEnoughCredits = credits >= creditCost;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border/60 sticky top-0 z-50 bg-background/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between h-14">
          <Link href="/">
            <span className="font-bold text-foreground">AssembleAI</span>
          </Link>
          <div className="flex items-center gap-3">
            {/* Credit balance pill */}
            <div className="flex items-center gap-1.5 text-sm font-medium bg-muted px-3 py-1 rounded-full border border-border/60">
              <Coins className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{credits} credit{credits !== 1 ? "s" : ""}</span>
            </div>
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.name ?? user?.email ?? "Account"}
            </span>
            <Button variant="ghost" size="sm" onClick={() => logout()} className="text-muted-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Projects</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {credits > 0
                ? `You have ${credits} credit${credits !== 1 ? "s" : ""}. 10 credits per MB, rounded up.`
                : "You're out of credits. Buy some to process more manuals."}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/pricing">
              <Button variant="outline" size="sm">
                <ShoppingCart className="w-3.5 h-3.5 mr-1.5" /> Buy Credits
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              disabled={credits === 0}
            >
              <Plus className="w-4 h-4 mr-1.5" /> New Project
            </Button>
          </div>
        </div>

        {/* Low credits banner */}
        {credits === 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Coins className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-900">No credits remaining</p>
                <p className="text-xs text-amber-700 mt-0.5">Purchase credits to process new manuals.</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100" onClick={() => handleBuyCredits("pack_1")}>
                100 credits — $4.29
              </Button>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => handleBuyCredits("pack_5")}>
                500 credits — $17.29
              </Button>
            </div>
          </div>
        )}

        {/* Projects list */}
        {projectsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !projects?.length ? (
          <div className="text-center py-20 bg-card border border-dashed border-border rounded-xl">
            <FolderOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-foreground mb-2">No projects yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
              Create a project, upload a PDF manual, and start assembling.
            </p>
            <Button onClick={() => setShowCreateDialog(true)} disabled={credits === 0}>
              <Plus className="w-4 h-4 mr-2" /> Create First Project
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {projects.map((project) => {
              const statusConf = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.new;
              const StatusIcon = statusConf.icon;
              // Progress: currentStep is the step the user is currently viewing.
              // When currentStep === totalSteps the user has reached (and seen) the last step,
              // so treat it as 100%. Otherwise count completed = currentStep - 1.
              const cur = project.currentStep ?? 1;
              const total = project.totalSteps ?? 0;
              const progress = total > 0
                ? Math.min(100, Math.round((cur / total) * 100))
                : 0;

              return (
                <div key={project.id} className="bg-card border border-border/60 rounded-xl p-5 flex items-center gap-4">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-foreground truncate">{project.name}</h3>
                      <Badge className={`text-xs shrink-0 ${statusConf.color}`}>
                        <StatusIcon className={`w-3 h-3 mr-1 ${(statusConf as any).spin ? "animate-spin" : ""}`} />
                        {statusConf.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(project.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      {project.status === "ready" && project.totalSteps ? ` · ${project.totalSteps} steps` : ""}
                    </p>
                    {project.status === "failed" && (project as any).errorMessage && (
                      <p className="text-xs text-red-600 mt-0.5 truncate" title={(project as any).errorMessage}>
                        {(project as any).errorMessage}
                      </p>
                    )}
                    {project.status === "ready" && project.totalSteps ? (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-1">
                          <div
                            className="bg-foreground h-1 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{progress}%</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {project.status === "new" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowUploadDialog(project.id)}
                        disabled={!hasEnoughCredits}
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload
                      </Button>
                    )}
                    {project.status === "ready" && (
                      <Link href={`/projects/${project.id}`}>
                        <Button size="sm">
                          Continue <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      </Link>
                    )}
                    {project.status === "failed" && (
                      <Button size="sm" variant="outline" onClick={() => setShowUploadDialog(project.id)}>
                        <Upload className="w-3.5 h-3.5 mr-1.5" /> Re-upload
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteProjectId(project.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Assembly Project</DialogTitle>
            <DialogDescription>Give your project a name — e.g., "MALM Dresser" or "LEGO Technic 42154".</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="e.g., KALLAX Shelf Unit"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateProject} disabled={!projectName.trim() || createProject.isPending}>
                {createProject.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload PDF Dialog */}
      <Dialog
        open={showUploadDialog !== null}
        onOpenChange={(open) => { if (!open) { setShowUploadDialog(null); setSelectedFile(null); setStableFileSize(0); } }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Assembly Manual</DialogTitle>
            <DialogDescription>
              PDF only · Max 50 MB · No page limit. 10 credits per MB, rounded up (minimum 10). Works with text and image-only (IKEA, LEGO) manuals.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-foreground/30 hover:bg-muted/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <div>
                  <FileText className="w-9 h-9 text-foreground/60 mx-auto mb-2" />
                  <p className="font-medium text-foreground text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(selectedFile.size / 1024 / 1024).toFixed(1)} MB · costs {creditCost} credit{creditCost > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    ⏱ Est. processing time: {(() => { const mb = selectedFile!.size / 1024 / 1024; return mb <= 1 ? "~1–2 min" : mb <= 3 ? "~2–4 min" : mb <= 8 ? "~4–8 min" : mb <= 15 ? "~8–15 min" : "~15–30 min"; })()}
                  </p>
                </div>
              ) : (
                <div>
                  <Upload className="w-9 h-9 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="font-medium text-foreground text-sm">Click to select a PDF</p>
                  <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f) {
                  // Client-side type check
                  if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
                    toast.error("Only PDF files are accepted. Please select a PDF and try again.");
                    e.target.value = "";
                    return;
                  }
                  // Client-side size check (50 MB)
                  if (f.size > 50 * 1024 * 1024) {
                    toast.error("File is too large. Maximum allowed size is 50 MB. Please compress your PDF and try again.");
                    e.target.value = "";
                    return;
                  }
                }
                setSelectedFile(f);
                setStableFileSize(f?.size ?? 0);
              }}
            />
            {selectedFile && !hasEnoughCredits && (
              <p className="text-xs text-destructive text-center">
                Not enough credits. This file costs {creditCost} credit{creditCost > 1 ? "s" : ""} but you have {credits}.{" "}
                <Link href="/pricing" className="underline">Buy more</Link>
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowUploadDialog(null); setSelectedFile(null); }}>Cancel</Button>
              <Button onClick={handleFileUpload} disabled={!selectedFile || uploading || !hasEnoughCredits}>
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploading ? "Uploading…" : `Upload (${creditCost} credit${creditCost > 1 ? "s" : ""})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteProjectId !== null} onOpenChange={(open) => { if (!open) setDeleteProjectId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project and all its data. Credits are not refunded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteProjectId !== null && deleteProject.mutate({ id: deleteProjectId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
