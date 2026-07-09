import { NextRequest, NextResponse } from "next/server";
import { getDueActiveSubscriptions, markSubscriptionRenewed, markSubscriptionFailed } from "@/lib/subscriptions";
import { chargeSubscriptionPlan } from "@/lib/billing";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const due = await getDueActiveSubscriptions();
  let approved = 0;
  let failed = 0;
  let pending = 0;

  for (const sub of due) {
    const planToCharge = sub.planSiguiente || sub.plan;
    const result = await chargeSubscriptionPlan({
      correo: sub.correo,
      planId: planToCharge,
      paymentSourceId: sub.paymentSourceId,
      ownerRef: sub.id,
    });

    if (result.ok) {
      await markSubscriptionRenewed(sub);
      approved += 1;
    } else if (result.pending) {
      // Sigue en proceso del lado de Wompi — el webhook la confirmará. No
      // tocamos la suscripción para que el próximo cron la reintente si
      // hace falta.
      pending += 1;
    } else {
      await markSubscriptionFailed(sub.id);
      failed += 1;
    }
  }

  return NextResponse.json({ processed: due.length, approved, failed, pending });
}
