import React, { useState } from "react";
import { useUser } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Check, ShieldCheck, Sparkles, Star } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { useRouter } from "next/router";
import Script from "next/script";

const PLANS = [
  {
    name: "Bronze",
    price: 10,
    watchLimit: "7 minutes per video",
    downloads: "Unlimited downloads",
    badge: "Basic Upgrade",
    icon: Star,
    color: "from-amber-600 to-amber-800",
  },
  {
    name: "Silver",
    price: 50,
    watchLimit: "10 minutes per video",
    downloads: "Unlimited downloads",
    badge: "Popular Plan",
    icon: Sparkles,
    color: "from-slate-400 to-slate-600",
  },
  {
    name: "Gold",
    price: 100,
    watchLimit: "Unlimited watching time",
    downloads: "Unlimited downloads",
    badge: "Best Value",
    icon: ShieldCheck,
    color: "from-yellow-500 to-yellow-600",
  },
];

export default function Upgrade() {
  const { user, login } = useUser();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const router = useRouter();

  const handleUpgrade = async (planName: string, price: number) => {
    if (!user) {
      toast.error("Please sign in first to upgrade");
      return;
    }

    if (!razorpayReady) {
      toast.error("Razorpay is still loading, please wait a moment and try again.");
      return;
    }

    setLoadingPlan(planName);

    try {
      // Step 1: Create Razorpay Order on backend
      const orderRes = await axiosInstance.post("/payment/order", {
        amount: price,
        currency: "INR",
      });

      const orderData = orderRes.data;

      // Step 2: Open Razorpay Checkout in Test Mode
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount, // backend returns amount in paisa already
        currency: orderData.currency || "INR",
        name: "YourTube Premium",
        description: `Upgrade to ${planName} Plan`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            // Step 3: Verify payment on backend
            const verifyRes = await axiosInstance.post("/payment/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: user._id,
              planName,
              email: user.email,
            });

            if (verifyRes.data.success) {
              toast.success(`🎉 Successfully upgraded to ${planName} plan!`);
              login(verifyRes.data.result);
              router.push("/");
            } else {
              toast.error("Payment verified but upgrade failed. Contact support.");
            }
          } catch (err: any) {
            console.error("Verify error:", err?.response?.data || err);
            toast.error(err?.response?.data?.message || "Payment verification failed");
          } finally {
            setLoadingPlan(null);
          }
        },
        prefill: {
          name: user.name || "",
          email: user.email || "",
        },
        notes: {
          planName,
          userId: user._id,
        },
        theme: {
          color: "#d32f2f",
        },
        modal: {
          ondismiss: () => {
            toast.info("Payment cancelled.");
            setLoadingPlan(null);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        console.error("Payment failed:", response.error);
        toast.error(`Payment failed: ${response.error.description}`);
        setLoadingPlan(null);
      });
      rzp.open();
    } catch (error: any) {
      console.error("Order creation error:", error?.response?.data || error);
      toast.error("Failed to create order. Please check server configuration.");
      setLoadingPlan(null);
    }
  };

  return (
    <div className="flex-1 p-6 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 min-h-screen">
      {/* Load Razorpay Checkout script via next/script so it's ready before use */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setRazorpayReady(true)}
        onError={() =>
          toast.error("Failed to load Razorpay SDK. Check your internet connection.")
        }
      />

      <div className="max-w-4xl mx-auto text-center space-y-4 mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          Upgrade Your Streaming Experience
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
          Get extended watching hours, unlock unlimited downloads, and support creators with premium plans.
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          🔒 Payments powered by Razorpay · Test Mode Active
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {PLANS.map((plan) => {
          const PlanIcon = plan.icon;
          const isCurrentPlan = user?.plan === plan.name;

          return (
            <div
              key={plan.name}
              className={`relative rounded-2xl border bg-white dark:bg-zinc-850 p-6 flex flex-col justify-between shadow-md transition-all hover:scale-102 ${
                isCurrentPlan
                  ? "ring-2 ring-red-600 border-transparent scale-105"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              {isCurrentPlan && (
                <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow">
                  Current Plan
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                    {plan.badge}
                  </span>
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${plan.color} text-white`}>
                    <PlanIcon className="w-5 h-5" />
                  </div>
                </div>

                <h3 className="text-2xl font-bold mb-2 text-[var(--foreground)]">
                  {plan.name}
                </h3>

                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-extrabold tracking-tight text-[var(--foreground)]">
                    ₹{plan.price}
                  </span>
                  <span className="ml-1 text-sm text-zinc-500">/one-time</span>
                </div>

                <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-350 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>{plan.watchLimit}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>{plan.downloads}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Email Invoice Notification</span>
                  </li>
                </ul>
              </div>

              <Button
                onClick={() => handleUpgrade(plan.name, plan.price)}
                disabled={isCurrentPlan || loadingPlan !== null}
                className={`w-full font-bold rounded-xl ${
                  isCurrentPlan
                    ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                {loadingPlan === plan.name
                  ? "Opening Payment..."
                  : isCurrentPlan
                  ? "Current Tier"
                  : `Buy ${plan.name}`}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
