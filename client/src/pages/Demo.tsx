import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Wrench,
  Package,
  AlertTriangle,
  ChevronRight,
  RotateCcw,
  BookOpen,
} from "lucide-react";

interface DemoStep {
  step_number: number;
  title: string;
  tools_needed: string[];
  parts_needed: string[];
  substeps: string[];
  check: string;
  warning?: string;
  source_pages?: number[];
}

const DEMO_STEPS: DemoStep[] = [
  {
    step_number: 1,
    title: "Unpack and sort all parts",
    tools_needed: [],
    parts_needed: ["2x Side panels (A)", "1x Top panel (B)", "1x Bottom panel (C)", "4x Drawer fronts (D)", "Hardware bag"],
    substeps: [
      "Lay out all panels on a clean, carpeted floor to avoid scratches.",
      "Open the hardware bag and sort screws, cam locks, dowels, and brackets into separate groups.",
      "Check the parts list on page 1 of the manual and confirm all items are present.",
      "Keep the cardboard packaging nearby — it makes a good work surface.",
    ],
    check: "You should have 2 side panels, 1 top, 1 bottom, 4 drawer fronts, and a full hardware bag.",
    warning: "",
    source_pages: [2, 3],
  },
  {
    step_number: 2,
    title: "Attach cam lock nuts to the side panels",
    tools_needed: ["Coin or flat-head screwdriver"],
    parts_needed: ["2x Side panels (A)", "8x Cam lock nuts (E)", "8x Cam lock bolts (F)"],
    substeps: [
      "Lay the first side panel (A) flat with the pre-drilled holes facing up.",
      "Insert one cam lock bolt (F) into each of the 8 marked holes — the bolt head should sit flush.",
      "Drop a cam lock nut (E) into the large circular recess next to each bolt hole, arrow pointing toward the bolt.",
      "Repeat for the second side panel.",
    ],
    check: "Each side panel should have 8 cam lock bolts inserted and 8 cam lock nuts ready in their recesses.",
    warning: "Do not tighten the cam lock nuts yet — they will be locked in the next step.",
    source_pages: [4],
  },
  {
    step_number: 3,
    title: "Connect the bottom panel to the side panels",
    tools_needed: ["Coin or flat-head screwdriver"],
    parts_needed: ["2x Side panels (A)", "1x Bottom panel (C)", "4x Wooden dowels (G)"],
    substeps: [
      "Stand both side panels (A) upright and parallel, about 80cm apart.",
      "Insert 2 wooden dowels (G) into the bottom edge of each side panel at the marked holes.",
      "Align the bottom panel (C) so its holes match the dowels and cam lock bolts on both side panels.",
      "Press the bottom panel firmly onto the dowels until it seats fully.",
      "Use a coin to rotate each cam lock nut 90° clockwise until it locks with a click.",
    ],
    check: "The bottom panel should sit flush with both side panels and not wobble when you press on it.",
    warning: "Ensure the finished (smooth) side of the bottom panel faces upward into the cabinet.",
    source_pages: [5, 6],
  },
  {
    step_number: 4,
    title: "Attach the top panel",
    tools_needed: ["Coin or flat-head screwdriver"],
    parts_needed: ["1x Top panel (B)", "4x Wooden dowels (G)"],
    substeps: [
      "Insert 2 wooden dowels (G) into the top edge of each side panel.",
      "Lift the top panel (B) and align it with the dowels — the finished side faces up and outward.",
      "Press down firmly until the top panel seats on both side panels.",
      "Lock all 4 cam lock nuts on the top panel by rotating them 90° clockwise.",
    ],
    check: "The cabinet frame should now be rigid. Press on the top — it should not flex or creak.",
    warning: "",
    source_pages: [7],
  },
  {
    step_number: 5,
    title: "Install the drawer runners",
    tools_needed: ["Phillips screwdriver"],
    parts_needed: ["8x Drawer runners (H)", "16x Small screws (J)"],
    substeps: [
      "Locate the pre-drilled screw holes on the inside of both side panels at the 4 marked heights.",
      "Align a drawer runner (H) with the holes at the lowest position on the left side panel.",
      "Insert 2 screws (J) and tighten until snug — do not overtighten.",
      "Repeat for the right side panel at the same height, then continue for all 4 drawer levels.",
    ],
    check: "All 8 runners should be level and parallel. Slide your hand along each — they should feel smooth.",
    warning: "Use only the small screws (J) for runners. Larger screws will crack the panel.",
    source_pages: [8, 9],
  },
  {
    step_number: 6,
    title: "Assemble and insert the drawers",
    tools_needed: ["Phillips screwdriver", "Rubber mallet (optional)"],
    parts_needed: ["4x Drawer boxes (K)", "4x Drawer fronts (D)", "8x Drawer screws (L)"],
    substeps: [
      "Assemble each drawer box (K) by clicking the four sides together — the base slides in from the bottom.",
      "Slide each drawer box onto its runners from the front of the cabinet.",
      "Attach a drawer front (D) to each drawer box using 2 screws (L) from inside the drawer.",
      "Adjust the drawer front position so gaps are even, then tighten fully.",
    ],
    check: "Each drawer should slide in and out smoothly without catching. The fronts should be flush and evenly spaced.",
    warning: "",
    source_pages: [10, 11],
  },
  {
    step_number: 7,
    title: "Final checks and wall anchoring",
    tools_needed: ["Phillips screwdriver", "Wall anchor drill (if needed)"],
    parts_needed: ["1x Anti-tip strap (M)", "2x Wall screws (N)"],
    substeps: [
      "Open and close each drawer several times to confirm smooth operation.",
      "Check all cam locks are fully tightened — none should turn further.",
      "Attach the anti-tip strap (M) to the back of the top panel and anchor it to the wall stud.",
      "Place the unit in its final position and verify it stands level.",
    ],
    check: "The dresser should stand firm, all drawers operate smoothly, and the anti-tip strap is secured to the wall.",
    warning: "Always anchor tall furniture to the wall. Unsecured furniture is a tip-over hazard, especially around children.",
    source_pages: [12],
  },
];

export default function Demo() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const currentStep = DEMO_STEPS[currentStepIndex];
  const totalSteps = DEMO_STEPS.length;
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === totalSteps - 1;
  const isComplete = completedSteps.size === totalSteps;

  const handleDone = () => {
    setCompletedSteps((prev) => { const next = new Set(prev); next.add(currentStep.step_number); return next; });
    if (!isLast) {
      setDirection("forward");
      setCurrentStepIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) {
      setDirection("backward");
      setCurrentStepIndex((i) => i - 1);
    }
  };

  const handleReset = () => {
    setCurrentStepIndex(0);
    setCompletedSteps(new Set());
  };

  const handleClarify = () => {
    toast.info("Step clarification is coming soon — this feature is currently under development.");
  };

  const handleUploadCTA = () => {
    if (isAuthenticated) {
      navigate("/app");
    } else {
      window.location.href = getLoginUrl();
    }
  };

  const progressPercent = Math.round((completedSteps.size / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
              <Wrench className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">AssembleAI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-xs">Demo Mode</Badge>
            {isAuthenticated ? (
              <Link href="/app">
                <Button size="sm">
                  Go to Dashboard <ChevronRight className="ml-1 w-3.5 h-3.5" />
                </Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button size="sm">
                  Sign Up — 10 Free Credits <ChevronRight className="ml-1 w-3.5 h-3.5" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Demo Project</p>
              <h1 className="text-lg font-bold text-foreground">MALM 4-Drawer Dresser</h1>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">Progress</p>
              <p className="text-sm font-semibold text-foreground">{completedSteps.size} / {totalSteps} steps</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {/* Step dots */}
          <div className="flex gap-1.5 mt-2">
            {DEMO_STEPS.map((s, i) => (
              <button
                key={s.step_number}
                onClick={() => setCurrentStepIndex(i)}
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  completedSteps.has(s.step_number)
                    ? "bg-green-500"
                    : i === currentStepIndex
                    ? "bg-primary"
                    : "bg-border"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {isComplete ? (
        /* Completion screen */
        <div className="container py-20 text-center max-w-lg mx-auto">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">Assembly Complete!</h2>
          <p className="text-muted-foreground text-lg mb-8">
            You've successfully assembled your MALM dresser. This was a demo — upload your own manual to get started.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" /> Start Over
            </Button>
            <Button onClick={handleUploadCTA}>
              {isAuthenticated ? "Go to Dashboard" : "Upload My Manual"} <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="container py-6 max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main step card */}
            <div className="lg:col-span-2 space-y-4">
              {/* Navigation buttons row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBack}
                    disabled={isFirst}
                    className="w-28"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClarify}
                    className="w-28 text-muted-foreground border-border"
                  >
                    <HelpCircle className="w-4 h-4 mr-1.5" />
                    Clarify
                  </Button>
                </div>

                <Button
                  className="bg-green-600 hover:bg-green-700 text-white w-28"
                  size="sm"
                  onClick={handleDone}
                >
                  {isLast ? "Finish" : "Done"} <CheckCircle2 className="w-4 h-4 ml-1.5" />
                </Button>
              </div>

              {/* Step card */}
              <div
                key={`step-${currentStep.step_number}-${direction}`}
                className={`bg-card border border-border rounded-xl p-6 shadow-sm ${
                  direction === "forward" ? "step-enter-right" : "step-enter-left"
                }`}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-bold text-sm">{currentStep.step_number}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Step {currentStep.step_number} of {totalSteps}
                      </p>
                      {currentStep.source_pages && currentStep.source_pages.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/70 bg-muted px-2 py-0.5 rounded-full border border-border/60">
                          <BookOpen className="w-3 h-3" />
                          {currentStep.source_pages.length === 1
                            ? `PDF p. ${currentStep.source_pages[0]}`
                            : `PDF pp. ${currentStep.source_pages[0]}–${currentStep.source_pages[currentStep.source_pages.length - 1]}`}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-foreground">{currentStep.title}</h2>
                  </div>
                </div>

                {/* Substeps */}
                <ol className="space-y-3 mb-5">
                  {currentStep.substeps.map((substep, i) => (
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
            </div>

            {/* Sidebar: Tools & Parts */}
            <div className="space-y-4">
              {currentStep.tools_needed.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Wrench className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-semibold text-foreground text-sm">Tools Needed</h3>
                  </div>
                  <ul className="space-y-1.5">
                    {currentStep.tools_needed.map((tool, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full flex-shrink-0" />
                        {tool}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground text-sm">Parts Needed</h3>
                </div>
                {currentStep.parts_needed.length > 0 ? (
                  <ul className="space-y-1.5">
                    {currentStep.parts_needed.map((part, i) => (
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

              {/* Upload CTA — auth-aware */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
                <h3 className="font-semibold text-foreground text-sm mb-2">Upload your own manual</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {isAuthenticated
                    ? "Go to your dashboard to upload a PDF and get AI-powered steps."
                    : "Sign up now and get 10 free credits to try it with your own manual."}
                </p>
                <Button size="sm" className="w-full text-xs" onClick={handleUploadCTA}>
                  {isAuthenticated ? "Go to Dashboard" : "Sign Up — 10 Free Credits"}
                  <ArrowRight className="ml-1.5 w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
