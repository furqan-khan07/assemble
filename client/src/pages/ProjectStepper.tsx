import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import {
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Wrench,
  Package,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Home,
  Send,
  X,
  Info,
  Flag,
  BookOpen,
} from "lucide-react";
import type { AssemblyStep } from "@shared/assemblyTypes";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSourcePages(pages: number[] | undefined): string | null {
  if (!pages || pages.length === 0) return null;
  if (pages.length === 1) return `PDF p. ${pages[0]}`;
  // Collapse consecutive ranges: [3,4,5,7] → "pp. 3–5, 7"
  const sorted = [...pages].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}–${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}–${end}`);
  return `PDF pp. ${ranges.join(", ")}`;
}

// ─── One-time disclaimer banner ───────────────────────────────────────────────

function DisclaimerBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900 text-sm mb-1">Before you begin</h3>
          <p className="text-sm text-amber-800 leading-relaxed">
            These steps are <strong>AI-generated</strong> from your manual. While we do our best to be accurate,
            the AI may occasionally misread diagrams, mix up part labels, or miss a detail. Use your own judgement
            and refer to the original PDF whenever something seems unclear or doesn't match what you see in front
            of you.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 flex-shrink-0 -mt-1 -mr-1"
          aria-label="Dismiss disclaimer"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Persistent footer disclaimer ─────────────────────────────────────────────

function StepperFooter() {
  return (
    <footer className="border-t border-border bg-muted/40 py-3 mt-auto">
      <div className="container max-w-4xl mx-auto">
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          <AlertTriangle className="w-3 h-3 inline-block mr-1 mb-0.5 text-amber-500" />
          These steps are AI-generated and may be incorrect. Always consult your original PDF if a step seems
          off or something doesn't fit.
        </p>
      </div>
    </footer>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ProjectStepper() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [currentStepNumber, setCurrentStepNumber] = useState(0);
  const [currentStep, setCurrentStep] = useState<AssemblyStep | null>(null);
  const [showClarify, setShowClarify] = useState(false);
  const [clarifyQuestion, setClarifyQuestion] = useState("");
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [reportedSteps, setReportedSteps] = useState<Set<number>>(new Set());
  const initializedRef = useRef(false);

  // One-time disclaimer per project
  const disclaimerKey = `assembleai_disclaimer_seen_${projectId}`;
  const [showDisclaimer, setShowDisclaimer] = useState(() => {
    try { return !localStorage.getItem(disclaimerKey); } catch { return true; }
  });
  const handleDismissDisclaimer = () => {
    try { localStorage.setItem(disclaimerKey, "1"); } catch { /* ignore */ }
    setShowDisclaimer(false);
  };

  const utils = trpc.useUtils();

  const { data: project, isLoading: projectLoading } = trpc.projects.get.useQuery(
    { id: projectId },
    { enabled: isAuthenticated && !isNaN(projectId) }
  );

  const { data: statusData } = trpc.projects.status.useQuery(
    { id: projectId },
    {
      enabled: isAuthenticated && !isNaN(projectId),
      refetchInterval: project?.status === "processing" ? 3000 : false,
    }
  );

  const { data: session } = trpc.projects.getSession.useQuery(
    { projectId },
    { enabled: isAuthenticated && project?.status === "ready" }
  );

  const totalSteps = statusData?.totalSteps ?? session?.totalSteps ?? 0;
  const isComplete = completedSteps.size > 0 && completedSteps.size >= totalSteps;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps.size / totalSteps) * 100) : 0;

  const getStepMutation = trpc.projects.getStep.useMutation({
    onSuccess: (step) => setCurrentStep(step),
    onError: (err) => toast.error(`Failed to load step: ${err.message}`),
  });

  const clarifyMutation = trpc.projects.clarifyStep.useMutation({
    onSuccess: (step) => {
      setCurrentStep(step);
      setShowClarify(false);
      setClarifyQuestion("");
      toast.success("Step expanded with more detail.");
    },
    onError: (err) => toast.error(`Clarification failed: ${err.message}`),
  });

  const reportMutation = trpc.projects.reportInaccurate.useMutation({
    onSuccess: () => {
      setReportedSteps((prev) => new Set(prev).add(currentStepNumber));
      toast.success("Thanks — your report has been sent. We'll use it to improve accuracy.");
    },
    onError: (err) => toast.error(`Could not send report: ${err.message}`),
  });

  // Initialize from session — resume from the last step the user was on
  useEffect(() => {
    if (!session || initializedRef.current) return;
    initializedRef.current = true;

    const resumeStep = session.currentStep ?? 1;
    setCurrentStepNumber(resumeStep);

    const done = new Set<number>();
    const total = statusData?.totalSteps ?? session?.totalSteps ?? 0;
    // If the user was on the last step, they completed the project — mark all steps done.
    // Otherwise mark all steps before the current one as done.
    const limit = total > 0 && resumeStep >= total ? resumeStep : resumeStep - 1;
    for (let i = 1; i <= limit; i++) done.add(i);
    setCompletedSteps(done);

    if (session.stepsData) {
      const steps: AssemblyStep[] = JSON.parse(session.stepsData);
      const cached = steps.find((s) => s.step_number === resumeStep);
      if (cached) { setCurrentStep(cached); return; }
    }

    getStepMutation.mutate({ projectId, stepNumber: resumeStep });
  }, [session?.id]);

  useEffect(() => {
    if (project?.status === "ready" && isAuthenticated && !initializedRef.current && !session) {
      // waiting for session to load
    }
  }, [project?.status, isAuthenticated, session]);

  const navigateToStep = (stepNumber: number) => {
    if (stepNumber === currentStepNumber || getStepMutation.isPending) return;
    setDirection(stepNumber > currentStepNumber ? "forward" : "backward");
    setCurrentStepNumber(stepNumber);
    setCurrentStep(null);
    setShowClarify(false);

    if (session?.stepsData) {
      const steps: AssemblyStep[] = JSON.parse(session.stepsData);
      const cached = steps.find((s) => s.step_number === stepNumber);
      if (cached) {
        setCurrentStep(cached);
        getStepMutation.mutate({ projectId, stepNumber });
        return;
      }
    }

    getStepMutation.mutate({ projectId, stepNumber });
  };

  const handleDone = () => {
    setCompletedSteps((prev) => { const next = new Set(prev); next.add(currentStepNumber); return next; });
    if (currentStepNumber < totalSteps) navigateToStep(currentStepNumber + 1);
  };

  const handleBack = () => { if (currentStepNumber > 1) navigateToStep(currentStepNumber - 1); };

  const handleClarify = () => {
    if (!clarifyQuestion.trim() || !currentStep) return;
    clarifyMutation.mutate({ projectId, stepNumber: currentStepNumber, question: clarifyQuestion });
  };

  const handleReportInaccurate = () => {
    if (!currentStep || reportMutation.isPending) return;
    reportMutation.mutate({
      projectId,
      stepNumber: currentStepNumber,
      stepTitle: currentStep.title,
      sourcePages: currentStep.source_pages,
    });
  };

  const handleRestart = () => {
    initializedRef.current = false;
    setCurrentStepNumber(1);
    setCurrentStep(null);
    setCompletedSteps(new Set());
    setShowClarify(false);
    getStepMutation.mutate({ projectId, stepNumber: 1 });
  };

  if (authLoading || projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please sign in to view this project.</p>
          <a href={getLoginUrl()}><Button>Sign In</Button></a>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Project not found.</p>
          <Link href="/app"><Button variant="outline"><Home className="w-4 h-4 mr-2" />Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  const pageLabel = currentStep ? formatSourcePages(currentStep.source_pages) : null;
  const alreadyReported = reportedSteps.has(currentStepNumber);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <Link href="/app" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <Home className="w-4 h-4" />
            <span className="text-sm">Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Wrench className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm text-foreground hidden sm:block">AssembleAI</span>
          </div>
          <div className="w-24" />
        </div>
      </nav>

      {/* Project header */}
      <div className="border-b border-border bg-card">
        <div className="container py-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="font-bold text-foreground">{project.name}</h1>
              {project.status === "ready" && totalSteps > 0 && currentStepNumber > 0 && (
                <p className="text-xs text-muted-foreground">
                  Step {currentStepNumber} of {totalSteps}
                  {pageLabel && (
                    <span className="ml-2 inline-flex items-center gap-1 text-muted-foreground/70">
                      <BookOpen className="w-3 h-3" />
                      {pageLabel}
                    </span>
                  )}
                </p>
              )}
            </div>
            {project.status === "ready" && totalSteps > 0 && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{progressPercent}% complete</p>
              </div>
            )}
          </div>
          {project.status === "ready" && totalSteps > 0 && (
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 container py-6 max-w-4xl mx-auto">
        {/* Processing state */}
        {(project.status === "processing" || project.status === "new") && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 processing-pulse">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">
              {project.status === "new" ? "Waiting to process…" : "Reading your manual…"}
            </h2>
            <p className="text-muted-foreground max-w-sm">
              {project.status === "new"
                ? "Upload a PDF manual to get started."
                : "We're analysing every page and generating step-by-step instructions. This usually takes 1–3 minutes depending on the manual size."}
            </p>
            {project.status === "new" && (
              <Link href="/app" className="mt-6">
                <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back to Dashboard</Button>
              </Link>
            )}
          </div>
        )}

        {/* Failed state */}
        {project.status === "failed" && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Processing Failed</h2>
            <p className="text-muted-foreground max-w-sm mb-6">
              Something went wrong while processing your manual. Your credits have been refunded. Please try uploading again.
            </p>
            <Link href="/app">
              <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back to Dashboard</Button>
            </Link>
          </div>
        )}

        {/* Complete state */}
        {project.status === "ready" && isComplete && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-3">Assembly Complete!</h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-sm">
              You've finished assembling your {project.name}. Great work!
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleRestart}>
                <RotateCcw className="w-4 h-4 mr-2" /> Start Over
              </Button>
              <Link href="/app">
                <Button><Home className="w-4 h-4 mr-2" />Dashboard</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Ready + step view */}
        {project.status === "ready" && !isComplete && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-4">
              {/* One-time disclaimer banner */}
              {showDisclaimer && currentStepNumber <= 1 && (
                <DisclaimerBanner onDismiss={handleDismissDisclaimer} />
              )}

              {/* Action buttons */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBack}
                    disabled={currentStepNumber <= 1 || getStepMutation.isPending}
                    className="w-32"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info("Step clarification is coming soon — this feature is currently under development.")}
                    disabled={!currentStep || getStepMutation.isPending}
                    className="w-32 text-muted-foreground"
                  >
                    <HelpCircle className="w-4 h-4 mr-1.5" />
                    Clarify
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReportInaccurate}
                    disabled={!currentStep || reportMutation.isPending || alreadyReported}
                    className={`w-32 ${alreadyReported ? "text-amber-600 border-amber-300" : "text-muted-foreground"}`}
                    title="Flag this step as inaccurate to help us improve"
                  >
                    {reportMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <Flag className="w-4 h-4 mr-1.5" />
                    )}
                    {alreadyReported ? "Reported" : "Inaccurate"}
                  </Button>
                </div>

                <Button
                  className="bg-green-600 hover:bg-green-700 text-white w-32"
                  size="sm"
                  onClick={handleDone}
                  disabled={!currentStep || getStepMutation.isPending}
                >
                  {currentStepNumber >= totalSteps ? "Finish" : "Done"}{" "}
                  <CheckCircle2 className="w-4 h-4 ml-1.5" />
                </Button>
              </div>

              {/* Step card */}
              {getStepMutation.isPending || !currentStep ? (
                <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center justify-center min-h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground font-medium">Loading step {currentStepNumber}…</p>
                </div>
              ) : (
                <div
                  key={`step-${currentStep.step_number}-${direction}`}
                  className={`bg-card border border-border rounded-xl p-6 shadow-sm ${
                    direction === "forward" ? "step-enter-right" : "step-enter-left"
                  }`}
                >
                  {/* Step header */}
                  <div className="flex items-start gap-3 mb-5">
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary-foreground font-bold text-sm">{currentStep.step_number}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Step {currentStep.step_number} of {totalSteps}
                        </p>
                        {/* Page citation badge */}
                        {currentStep.source_pages && currentStep.source_pages.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/70 bg-muted px-2 py-0.5 rounded-full border border-border/60">
                            <BookOpen className="w-3 h-3" />
                            {formatSourcePages(currentStep.source_pages)}
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-foreground">{currentStep.title}</h2>
                    </div>
                    {completedSteps.has(currentStep.step_number) && (
                      <Badge className="bg-green-100 text-green-700 text-xs flex-shrink-0">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Done
                      </Badge>
                    )}
                  </div>

                  {/* Substeps */}
                  <ol className="space-y-3 mb-5">
                    {currentStep.substeps.map((substep: string, i: number) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-foreground leading-relaxed">{substep}</p>
                      </li>
                    ))}
                  </ol>

                  {/* Check */}
                  {currentStep.check && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
                      <div className="flex gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-green-800">
                          <span className="font-semibold">Check: </span>{currentStep.check}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Warning */}
                  {currentStep.warning && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800">
                          <span className="font-semibold">Warning: </span>{currentStep.warning}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Clarification panel */}
              {showClarify && (
                <div className="bg-card border border-primary/30 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-foreground text-sm">Need more clarification?</h3>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowClarify(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Ask a question and the AI will rewrite this step with more detail and a troubleshooting tip.
                  </p>
                  <Textarea
                    placeholder="e.g., How do I know if the cam lock is properly tightened?"
                    value={clarifyQuestion}
                    onChange={(e) => setClarifyQuestion(e.target.value)}
                    rows={3}
                    className="mb-3 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleClarify}
                    disabled={!clarifyQuestion.trim() || clarifyMutation.isPending}
                    className="w-full"
                  >
                    {clarifyMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {clarifyMutation.isPending ? "Thinking…" : "Get More Detail"}
                  </Button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {currentStep && currentStep.tools_needed.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Wrench className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-semibold text-foreground text-sm">Tools Needed</h3>
                  </div>
                  <ul className="space-y-1.5">
                    {currentStep.tools_needed.map((tool: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full flex-shrink-0" />
                        {tool}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {currentStep && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-semibold text-foreground text-sm">Parts Needed</h3>
                  </div>
                  {currentStep.parts_needed.length > 0 ? (
                    <ul className="space-y-1.5">
                      {currentStep.parts_needed.map((part: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-accent rounded-full flex-shrink-0" />
                          {part}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No specific parts for this step.</p>
                  )}
                </div>
              )}

              {/* Steps Overview */}
              {totalSteps > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-foreground text-sm mb-3">Steps Overview</h3>
                  <div className="grid grid-cols-5 gap-1.5">
                    {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        onClick={() => navigateToStep(n)}
                        disabled={getStepMutation.isPending}
                        title={`Jump to step ${n}`}
                        className={`h-7 rounded text-xs flex items-center justify-center font-medium transition-colors cursor-pointer select-none
                          ${completedSteps.has(n)
                            ? "bg-green-500 text-white hover:bg-green-600"
                            : n === currentStepNumber
                            ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1"
                            : "bg-muted text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Click any step to jump to it</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Persistent AI disclaimer footer */}
      <StepperFooter />
    </div>
  );
}
