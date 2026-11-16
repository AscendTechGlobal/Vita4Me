import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AnalyticsEvent,
  EVENT_DESTINATION_MAP,
  sanitizeTrackingPath,
  sanitizeTrackingPayload,
} from "../../analytics/events.js";

const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
  "msclkid",
  "landing_path",
  "referrer_host",
  "captured_at",
] as const;

export function sanitizeAttributionTouchServer(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;
  const out: Record<string, string> = {};

  for (const key of ATTRIBUTION_KEYS) {
    const val = input[key];
    if (typeof val !== "string") continue;
    const trimmed = val.trim().slice(0, 150);
    if (!trimmed || trimmed.includes("@")) continue;
    if (key === "landing_path") {
      out[key] = sanitizeTrackingPath(trimmed).split("?")[0];
    } else {
      out[key] = trimmed;
    }
  }

  return Object.keys(out).length > 0 ? out : null;
}

export async function upsertUserAttribution(
  supabaseAdmin: SupabaseClient | null,
  userId: string,
  payload: { first_touch?: unknown; last_touch?: unknown }
): Promise<{ saved: boolean }> {
  if (!supabaseAdmin || !userId) return { saved: false };

  const incomingFirst = sanitizeAttributionTouchServer(payload.first_touch);
  const incomingLast = sanitizeAttributionTouchServer(payload.last_touch);
  if (!incomingFirst && !incomingLast) return { saved: false };

  try {
    const { data: existing, error: selErr } = await supabaseAdmin
      .from("user_attribution")
      .select("first_touch, first_touch_at, last_touch, last_touch_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (selErr && selErr.code !== "PGRST116") {
      return { saved: false };
    }

    const nowIso = new Date().toISOString();
    const existingFirst =
      existing?.first_touch && Object.keys(existing.first_touch as object).length > 0
        ? existing.first_touch
        : null;

    const finalFirst = existingFirst || incomingFirst || incomingLast;
    const finalFirstAt = existing?.first_touch_at || nowIso;
    const finalLast = incomingLast || existing?.last_touch || finalFirst;
    const finalLastAt = incomingLast ? nowIso : existing?.last_touch_at || nowIso;

    const { error: upsertErr } = await supabaseAdmin
      .from("user_attribution")
      .upsert(
        {
          user_id: userId,
          first_touch: finalFirst,
          first_touch_at: finalFirstAt,
          last_touch: finalLast,
          last_touch_at: finalLastAt,
          updated_at: nowIso,
        },
        { onConflict: "user_id" }
      );

    return { saved: !upsertErr };
  } catch {
    return { saved: false };
  }
}

export async function recordProductAnalyticsEvent(
  supabaseAdmin: SupabaseClient | null,
  params: {
    userId?: string | null;
    eventName: AnalyticsEvent;
    properties?: Record<string, unknown>;
    attributionSnapshot?: unknown;
    eventId?: string;
    source?: "client" | "stripe_webhook" | "asaas_webhook" | "server";
  }
): Promise<{ recorded: boolean; deduplicated?: boolean }> {
  if (!supabaseAdmin) return { recorded: false };

  const classification = EVENT_DESTINATION_MAP[params.eventName];
  if (!classification) return { recorded: false };

  const sanitizedProps = sanitizeTrackingPayload(params.eventName, params.properties, {
    externalDestination: false,
  });

  const cleanEventId =
    typeof params.eventId === "string" && params.eventId.trim()
      ? params.eventId.trim().slice(0, 120)
      : null;

  let snapshot: Record<string, unknown> | null = null;
  if (params.attributionSnapshot && typeof params.attributionSnapshot === "object") {
    const rawSnap = params.attributionSnapshot as { first_touch?: unknown; last_touch?: unknown };
    const first = sanitizeAttributionTouchServer(rawSnap.first_touch);
    const last = sanitizeAttributionTouchServer(rawSnap.last_touch);
    if (first || last) {
      snapshot = { first_touch: first, last_touch: last };
    }
  } else if (params.userId) {
    try {
      const { data: attr } = await supabaseAdmin
        .from("user_attribution")
        .select("first_touch, last_touch")
        .eq("user_id", params.userId)
        .maybeSingle();
      if (attr) {
        snapshot = { first_touch: attr.first_touch, last_touch: attr.last_touch };
      }
    } catch {
      // Tabela opcional antes da migration
    }
  }

  try {
    const { error } = await supabaseAdmin.from("product_analytics_events").insert({
      user_id: params.userId || null,
      event_name: params.eventName,
      classification,
      properties: sanitizedProps,
      attribution_snapshot: snapshot,
      event_id: cleanEventId,
      source: params.source || "client",
    });

    if (error) {
      // Código 23505 = unique violation em event_id (deduplicação idempotente)
      if (error.code === "23505") {
        return { recorded: true, deduplicated: true };
      }
      return { recorded: false };
    }
    return { recorded: true };
  } catch {
    return { recorded: false };
  }
}

export async function claimConfirmedConversionsForUser(
  supabaseAdmin: SupabaseClient | null,
  userId: string
): Promise<
  Array<{
    id: string;
    eventName: AnalyticsEvent;
    eventId: string | null;
    properties: Record<string, unknown>;
  }>
> {
  if (!supabaseAdmin || !userId) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from("product_analytics_events")
      .select("id, event_name, event_id, properties")
      .eq("user_id", userId)
      .in("source", ["stripe_webhook", "asaas_webhook"])
      .in("event_name", ["trial_started", "subscription_started", "subscription_cancelled"])
      .is("client_dispatched_at", null)
      .order("created_at", { ascending: true })
      .limit(10);

    if (error || !Array.isArray(data) || data.length === 0) return [];

    const ids = data.map((row) => row.id);
    await supabaseAdmin
      .from("product_analytics_events")
      .update({ client_dispatched_at: new Date().toISOString() })
      .in("id", ids)
      .is("client_dispatched_at", null);

    return data.map((row) => ({
      id: row.id,
      eventName: row.event_name as AnalyticsEvent,
      eventId: row.event_id || row.id,
      properties: (row.properties as Record<string, unknown>) || {},
    }));
  } catch {
    return [];
  }
}
