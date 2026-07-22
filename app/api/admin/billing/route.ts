import { NextResponse } from "next/server";

interface StripeSubscriptionItem {
  price: { unit_amount: number | null; currency: string };
  quantity: number;
}
interface StripeSubscription {
  id: string;
  status: string;
  customer: string;
  items: { data: StripeSubscriptionItem[] };
}
interface StripeListResponse {
  data: StripeSubscription[];
}

// No Stripe SDK dependency — calls the REST API directly with fetch() so this
// route does nothing (and adds no new package) until STRIPE_SECRET_KEY exists.
export async function GET() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json({ configured: false });
  }

  try {
    const res = await fetch("https://api.stripe.com/v1/subscriptions?status=active&limit=100", {
      headers: { Authorization: `Bearer ${key}` },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ configured: true, error: `Stripe returned ${res.status}: ${text}` }, { status: 502 });
    }

    const data: StripeListResponse = await res.json();
    const mrr = data.data.reduce((sum, sub) => {
      const subTotal = sub.items.data.reduce(
        (s, item) => s + ((item.price.unit_amount ?? 0) / 100) * item.quantity,
        0,
      );
      return sum + subTotal;
    }, 0);

    return NextResponse.json({
      configured: true,
      mrr,
      activeSubscriptions: data.data.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ configured: true, error: message }, { status: 500 });
  }
}
