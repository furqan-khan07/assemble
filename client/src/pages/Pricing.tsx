import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { Check, Zap } from "lucide-react";
import { useEffect } from "react";

const PACKS = [
  {
    id: "pack_1",
    credits: 100,
    label: "Starter",
    price: "$4.29",
    perCredit: "$0.04",
    badge: null,
    description: "Try it out on a single manual.",
    features: ["Covers up to 10 MB of manuals", "Works with any PDF", "IKEA & LEGO vision support", "Up to 150 pages"],
  },
  {
    id: "pack_3",
    credits: 300,
    label: "Builder",
    price: "$11.29",
    perCredit: "$0.04",
    badge: null,
    description: "A few projects at a slight discount.",
    features: ["Covers up to 30 MB of manuals", "Works with any PDF", "IKEA & LEGO vision support", "Up to 150 pages"],
  },
  {
    id: "pack_5",
    credits: 500,
    label: "Maker",
    price: "$17.29",
    perCredit: "$0.03",
    badge: "Popular",
    description: "Best for active builders and hobbyists.",
    features: ["Covers up to 50 MB of manuals", "Works with any PDF", "IKEA & LEGO vision support", "Up to 150 pages"],
  },
  {
    id: "pack_10",
    credits: 1000,
    label: "Workshop",
    price: "$32.29",
    perCredit: "$0.03",
    badge: "Best Value",
    description: "Stock up for a full season of projects.",
    features: ["Covers up to 100 MB of manuals", "Works with any PDF", "IKEA & LEGO vision support", "Up to 150 pages", "Best per-credit rate"],
  },
  // Studio pack (pack_100) is hidden from public pricing page
];

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  const createCheckout = trpc.credits.createCheckout.useMutation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "cancelled") {
      toast.info("Payment cancelled — your credits were not charged.");
    }
  }, [location]);

  async function handleBuy(packId: string) {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
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
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 px-6 py-4 flex items-center justify-between">
        <Link href="/">
          <span className="font-bold text-lg tracking-tight text-foreground">AssembleAI</span>
        </Link>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link href="/app">
              <Button variant="outline" size="sm">Dashboard</Button>
            </Link>
          ) : (
            <a href={getLoginUrl()}>
              <Button size="sm">Sign up — 10 free credits</Button>
            </a>
          )}
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full mb-6">
            <Zap className="w-3.5 h-3.5" />
            Credits never expire · 10 free credits on signup
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
            Pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Buy credits once, use them whenever. Every new account gets 10 free credits — no card required.
          </p>
        </div>

        {/* Pricing grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PACKS.map((pack) => (
            <div
              key={pack.id}
              className={`relative rounded-xl border p-6 flex flex-col gap-5 transition-shadow hover:shadow-md ${
                pack.badge === "Popular"
                  ? "border-foreground/30 bg-card shadow-sm"
                  : "border-border bg-card"
              }`}
            >
              {pack.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full bg-foreground text-background whitespace-nowrap">
                  {pack.badge}
                </span>
              )}

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  {pack.label}
                </p>
                <div className="flex items-end gap-1.5">
                  <span className="text-3xl font-bold text-foreground">{pack.price}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{pack.perCredit} per credit</p>
              </div>

              <p className="text-sm text-muted-foreground">{pack.description}</p>

              <ul className="flex flex-col gap-2 flex-1">
                {pack.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-foreground/60" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full mt-auto"
                variant={pack.badge === "Popular" ? "default" : "outline"}
                onClick={() => handleBuy(pack.id)}
                disabled={createCheckout.isPending}
              >
                {pack.credits} credit{pack.credits > 1 ? "s" : ""} — {pack.price}
              </Button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-foreground mb-8 text-center">Common questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "What counts as one credit?",
                a: "Ten credits cover 1 MB of your PDF manual, rounded up. A 500 KB file costs 10 credits (minimum). A 3.2 MB file costs 40 credits. A 10 MB file costs 100 credits. You'll always see the exact cost before confirming an upload.",
              },
              {
                q: "Why do credits cost what they do?",
                a: "Each manual is processed using GPT-4o Vision — one of the most capable (and expensive) AI models available. We run two full passes over every page: the first generates the assembly steps, and the second independently verifies them to remove hallucinations and correct part labels and quantities. This two-pass approach is what makes the output reliable, but it means every page is analysed twice by a premium AI model. The credit price reflects that real cost.",
              },
              {
                q: "Do credits expire?",
                a: "No. Credits stay in your account indefinitely — buy when it suits you, use them whenever.",
              },
              {
                q: "What types of manuals work?",
                a: "Any PDF: IKEA image-only manuals, LEGO instruction booklets, flat-pack furniture, appliances, model kits, and more. Our vision AI handles diagrams just as well as text.",
              },
              {
                q: "What is your refund policy?",
                a: "All credit purchases are final — we do not offer monetary refunds for unused credits or completed purchases. However, if your PDF fails to process for any reason, the credits used for that upload are automatically refunded to your account balance immediately. No need to contact us.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-border pb-6">
                <p className="font-medium text-foreground mb-2">{q}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
