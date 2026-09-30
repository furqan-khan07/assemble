import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { ArrowRight, Wrench, FileText, Eye, Zap, MessageSquare, ChevronDown } from "lucide-react";
import { useState } from "react";

const FAQ_ITEMS = [
  {
    q: "Is it really free to start?",
    a: "Yes — every new account gets 10 free credits automatically when you sign up. No credit card required. That's enough to process up to 1 MB of manuals and see exactly how it works.",
  },
  {
    q: "What file types are supported?",
    a: "AssembleAI works with PDF files only. It handles both text-based manuals and image-only PDFs (like IKEA or LEGO instruction booklets) using vision AI to read diagrams.",
  },
  {
    q: "How are credits used?",
    a: "Each manual costs 10 credits per MB of file size, rounded up (minimum 10 credits). A 3 MB IKEA manual costs 30 credits. Credits are only deducted when processing starts, and refunded automatically if something goes wrong.",
  },
  {
    q: "Is my PDF stored securely?",
    a: "Yes. Your PDF is uploaded to a private, encrypted S3 bucket with a randomised key — it is not publicly accessible or guessable. You can delete your project at any time to remove it.",
  },
  {
    q: "How accurate are the steps?",
    a: "AssembleAI uses a two-pass AI verification process — the model generates steps, then reviews them against the original pages to remove hallucinated parts or incorrect quantities. That said, AI can still make mistakes. Always cross-reference with your original PDF if a step seems off.",
  },
  {
    q: "What is the page limit?",
    a: "Manuals up to 50 MB are supported with no page limit. A 200-page LEGO set or a large IKEA manual will work fine — larger files simply cost more credits and take longer to process. Most real-world manuals are well within the limit.",
  },
  {
    q: "Why are credits priced the way they are?",
    a: "Each manual is processed using GPT-4o Vision — one of the most powerful AI models available. We run two full passes over every page: the first generates the assembly steps, and the second independently verifies them to remove errors, correct part labels, and check quantities. This two-pass process is what makes the output reliable, but it means every page is analysed twice by a premium AI model. The credit price reflects that real underlying cost.",
  },
  {
    q: "What is your refund policy?",
    a: "All credit purchases are final. We do not offer monetary refunds for unused credits or completed purchases. However, if your PDF fails to process for any reason, the credits used for that upload are automatically refunded to your account balance immediately — no need to contact us.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/60 last:border-0">
      <button
        className="w-full flex items-center justify-between py-4 text-left gap-4 group"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-foreground group-hover:text-foreground/80 transition-colors">{q}</span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="text-sm text-muted-foreground leading-relaxed pb-4 pr-8">{a}</p>
      )}
    </div>
  );
}

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/60">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <span className="font-bold text-base tracking-tight">AssembleAI</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/demo">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Demo
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Pricing
              </Button>
            </Link>
            {isAuthenticated ? (
              <Link href="/app">
                <Button size="sm" className="ml-2">Dashboard</Button>
              </Link>
            ) : (
              <>
                <a href={getLoginUrl()}>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    Sign in
                  </Button>
                </a>
                <a href="/register">
                  <Button size="sm" className="ml-1">Sign up — free credit</Button>
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            Sign up free — get 10 credits instantly, no card required
          </div>
          <h1 className="text-[3.25rem] md:text-[4rem] font-bold leading-[1.08] tracking-tight text-foreground mb-6">
            Assemble easier.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl">
            Upload any PDF instruction manual and get clear, one-step-at-a-time guidance powered by AI. Works for IKEA furniture, LEGO sets, model kits, and flat-pack desk manuals. Even works on image-only manuals with no text.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/demo">
              <Button variant="outline" size="lg" className="px-6">
                See it in action
              </Button>
            </Link>
            {!isAuthenticated && (
              <a href="/register">
                <Button size="lg" className="px-6">
                  Start free — 10 credits on us <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </a>
            )}
            {isAuthenticated && (
              <Link href="/app">
                <Button size="lg" className="px-6">
                  Go to Dashboard <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Compatibility chips */}
        <div className="flex flex-wrap gap-2 mt-10">
          {["IKEA manuals", "LEGO sets", "Model kits", "Flat-pack furniture", "Appliances", "Any PDF"].map((tag) => (
            <span
              key={tag}
              className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full border border-border/60"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-t border-border/60 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-2">How it works</h2>
            <p className="text-muted-foreground">Three steps, no frustration.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-px bg-border/60 rounded-xl overflow-hidden border border-border/60">
            {[
              {
                n: "1",
                title: "Upload your manual",
                body: "Drop in any PDF — IKEA, LEGO, flat-pack, or otherwise. We handle the rest.",
              },
              {
                n: "2",
                title: "AI reads every page",
                body: "We extract text or use vision AI to understand diagrams and image-only manuals.",
              },
              {
                n: "3",
                title: "Follow along, step by step",
                body: "Work at your own pace. Each step shows exactly what parts and tools you need.",
              },
            ].map((step) => (
              <div key={step.n} className="bg-card p-8">
                <span className="text-4xl font-black text-border leading-none block mb-5">{step.n}</span>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-2">Built for real builds</h2>
          <p className="text-muted-foreground">Not just furniture — anything with a PDF manual.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {[
            {
              icon: FileText,
              title: "Text & image manuals",
              body: "Works equally well on text-heavy manuals and pure-diagram IKEA-style PDFs. No manual is too simple or too visual.",
            },
            {
              icon: Eye,
              title: "Vision AI for diagrams",
              body: "Our AI reads part diagrams, identifies components, and turns visual instructions into plain language you can actually follow.",
            },
            {
              icon: Zap,
              title: "One step at a time",
              body: "No more scanning back and forth across a page. Each step is isolated, with the exact parts and tools listed.",
            },
            {
              icon: MessageSquare,
              title: "Ask for clarification",
              body: "Confused by a step? Ask a question in plain English and get a detailed explanation tailored to where you are in the build.",
            },
          ].map((f) => (
            <div key={f.title} className="flex gap-4 p-6 rounded-xl border border-border/60 bg-card">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-muted flex items-center justify-center mt-0.5">
                <f.icon className="w-4.5 h-4.5 text-foreground/70" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="border-t border-border/60 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-2">Frequently asked questions</h2>
            <p className="text-muted-foreground">Everything you need to know before you start.</p>
          </div>
          <div className="max-w-2xl">
            {FAQ_ITEMS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
          {!isAuthenticated && (
            <div className="mt-10">
              <a href="/register">
                <Button size="lg" className="px-6">
                  Sign up free — 10 credits included <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </a>
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="bg-foreground text-background rounded-2xl px-10 py-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">Ready to build smarter?</h2>
            <p className="text-background/70 text-sm max-w-sm">
              Sign up now and get 10 free credits instantly — no card required. Upload your first manual and see the difference.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link href="/demo">
              <Button variant="secondary" size="lg" className="bg-background/15 hover:bg-background/25 text-background border-0">
                Try the demo
              </Button>
            </Link>
            {!isAuthenticated && (
              <a href="/register">
                <Button size="lg" className="bg-background text-foreground hover:bg-background/90">
                  Sign up — 10 free credits <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </a>
            )}
            {isAuthenticated && (
              <Link href="/app">
                <Button size="lg" className="bg-background text-foreground hover:bg-background/90">
                  Go to Dashboard <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/60 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-semibold text-sm text-foreground">AssembleAI</span>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/demo">Demo</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/app">Dashboard</Link>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} AssembleAI
          </p>
        </div>
        <div className="max-w-6xl mx-auto px-6 mt-4 pt-4 border-t border-border/40 flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-4 shrink-0">
            <Link href="/terms" className="text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors whitespace-nowrap">Terms</Link>
            <Link href="/privacy" className="text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors whitespace-nowrap">Privacy</Link>
            <a
              href="mailto:helpfromassembleai@gmail.com"
              className="text-xs text-muted-foreground/70 hover:text-muted-foreground whitespace-nowrap transition-colors"
            >
              helpfromassembleai@gmail.com
            </a>
          </div>
          <p className="text-xs text-muted-foreground/70 text-right max-w-sm">
            AssembleAI is an AI assistant. Steps are generated automatically from your manual and may contain errors.
            Always verify instructions against your original PDF before proceeding with your build.
          </p>
        </div>
      </footer>

    </div>
  );
}
