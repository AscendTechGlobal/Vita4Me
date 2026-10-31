import { SupabaseClient } from "@supabase/supabase-js";
import {
  sendTrialReminderDay5Email,
  sendTrialReminderDay6Email,
} from "../../lib/emailService.js";
import { BILLING_PLANS } from "./types.js";

interface ProfileTrialRow {
  id: string;
  email: string;
  full_name: string | null;
  plan_tier: string;
  trial_ends_at: string;
  card_last_digits?: string | null;
  reminder_5_sent?: boolean;
  reminder_6_sent?: boolean;
}

/**
 * Worker diário para verificação e disparo de lembretes no 5º e 6º dias de teste gratuito
 */
export async function processTrialReminders(supabaseAdmin: SupabaseClient): Promise<{
  processed: number;
  day5Sent: number;
  day6Sent: number;
}> {
  console.log("⏰ [Trial Worker] Executando verificação de lembretes de trial...");
  const now = new Date();

  // Buscar usuários em período de teste com data final definida
  const { data: users, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, plan_tier, trial_ends_at, card_last_digits, reminder_5_sent, reminder_6_sent")
    .eq("subscription_status", "trialing")
    .not("trial_ends_at", "is", null);

  if (error || !users) {
    console.error("❌ [Trial Worker] Erro ao consultar perfis em trial no Supabase:", error);
    return { processed: 0, day5Sent: 0, day6Sent: 0 };
  }

  let day5Sent = 0;
  let day6Sent = 0;

  for (const user of users as ProfileTrialRow[]) {
    const trialEnd = new Date(user.trial_ends_at);
    const msRemaining = trialEnd.getTime() - now.getTime();
    const hoursRemaining = msRemaining / (1000 * 60 * 60);

    const planKey = (user.plan_tier === "family" ? "family" : "individual") as keyof typeof BILLING_PLANS;
    const planConfig = BILLING_PLANS[planKey] || BILLING_PLANS.individual;
    const amountBrl = planConfig.monthlyBrl;

    // Calcular data estimada da primeira cobrança (dia seguinte ao término do trial)
    const firstBillingDateObj = new Date(trialEnd.getTime() + 24 * 60 * 60 * 1000);
    const firstBillingDateStr = firstBillingDateObj.toLocaleDateString("pt-BR");
    const trialEndsAtStr = trialEnd.toLocaleDateString("pt-BR");

    // 1. LEMBRETE DO DIA 5: Faltando entre 24h e 48h (2 dias para o fim do teste)
    if (hoursRemaining > 24 && hoursRemaining <= 48 && !user.reminder_5_sent) {
      console.log(`📧 [Trial Worker] Disparando lembrete de 2 dias (Dia 5) para: ${user.email}`);
      const emailResult = await sendTrialReminderDay5Email({
        email: user.email,
        name: user.full_name || "Paciente",
        planName: planConfig.name,
        trialEndsAt: trialEndsAtStr,
        firstBillingDate: firstBillingDateStr,
        amountBrl,
        cardLastDigits: user.card_last_digits || undefined,
      });

      if (emailResult.success) {
        await supabaseAdmin
          .from("profiles")
          .update({ reminder_5_sent: true, updated_at: new Date().toISOString() })
          .eq("id", user.id);
        day5Sent++;
      }
    }

    // 2. LEMBRETE DO DIA 6: Faltando menos de 24h e ainda não expirado (1 dia para o fim do teste)
    if (hoursRemaining > 0 && hoursRemaining <= 24 && !user.reminder_6_sent) {
      console.log(`📧 [Trial Worker] Disparando lembrete de último dia (Dia 6) para: ${user.email}`);
      const emailResult = await sendTrialReminderDay6Email({
        email: user.email,
        name: user.full_name || "Paciente",
        planName: planConfig.name,
        firstBillingDate: firstBillingDateStr,
        amountBrl,
        cardLastDigits: user.card_last_digits || undefined,
      });

      if (emailResult.success) {
        await supabaseAdmin
          .from("profiles")
          .update({ reminder_6_sent: true, updated_at: new Date().toISOString() })
          .eq("id", user.id);
        day6Sent++;
      }
    }
  }

  console.log(`✅ [Trial Worker] Concluído. Usuários avaliados: ${users.length} | Dia 5: ${day5Sent} | Dia 6: ${day6Sent}`);
  return {
    processed: users.length,
    day5Sent,
    day6Sent,
  };
}

