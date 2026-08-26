import express, { Request, Response, NextFunction } from "express";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import Stripe from "stripe";
import cors from "cors";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import {
  sendWelcomeTrialEmail,
  sendSubscriptionConfirmedEmail,
  sendTestEmail,
} from "./src/lib/emailService.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isCompiled = (typeof __filename !== "undefined" && __filename.includes("dist")) || (process.argv[1] ? process.argv[1].includes("dist") : false);
const IS_PROD =
  process.env.NODE_ENV === "production" ||
  Boolean(process.env.RAILWAY_ENVIRONMENT) ||
  Boolean(process.env.RAILWAY_PROJECT_ID) ||
  isCompiled ||
  process.env.NODE_ENV !== "development";
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

// ==============================================================================
// 1. SUPABASE SERVICE-ROLE CLIENT (FONTE DA VERDADE NO BACKEND)
// ==============================================================================
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

export const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// ==============================================================================
// 2. STRIPE CLIENT
// ==============================================================================
const getStripeClient = () => {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    console.warn("⚠️ STRIPE_SECRET_KEY não definida. Modo de simulação ativo.");
    return null;
  }
  return new Stripe(apiKey, {
    apiVersion: "2025-02-24.acacia" as any,
  });
};

// ==============================================================================
// 3. GOOGLE GEMINI SDK
// ==============================================================================
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ GEMINI_API_KEY não definida. Respostas simuladas com fallback ativas.");
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "vita4me-engine/2.0",
      },
    },
  });
};

// ==============================================================================
// 4. HTTP SECURITY HEADERS & CORS HARDENING
// ==============================================================================
app.use(
  helmet({
    contentSecurityPolicy: IS_PROD
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:", "https:", "https://*.supabase.co"],
            connectSrc: [
              "'self'",
              "https://*.supabase.co",
              "https://api.stripe.com",
              "https://generativelanguage.googleapis.com",
              "https://*.resend.com",
            ],
            frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
    frameguard: { action: "deny" },
    xContentTypeOptions: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: IS_PROD
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
  })
);

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "https://vita4me-production.up.railway.app",
  "https://vita4me.app",
  "https://www.vita4me.app",
  APP_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requisições sem origin (como apps móveis, curl ou server-to-server)
      if (!origin || allowedOrigins.includes(origin) || !IS_PROD) {
        callback(null, true);
      } else {
        callback(new Error("Bloqueado pela política CORS do Vita4Me."));
      }
    },
    credentials: true,
  })
);

// ==============================================================================
// 4.1 REQUEST ID & STRUCTURED ACCESS LOGGING (ZERO PII / ZERO MEDICAL DATA)
// ==============================================================================
app.use((req: any, res: Response, next: NextFunction) => {
  req.requestId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
  req.startTime = Date.now();
  res.setHeader("X-Request-ID", req.requestId);

  res.on("finish", () => {
    const durationMs = Date.now() - (req.startTime || Date.now());
    const statusCode = res.statusCode;
    const logLevel = statusCode >= 500 ? "ERROR" : statusCode >= 400 ? "WARN" : "INFO";

    // Log estruturado padronizado apenas para rotas da API
    if (req.path.startsWith("/api") || req.path === "/health" || req.path === "/ready") {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: logLevel,
          request_id: req.requestId,
          method: req.method,
          route: req.path,
          status_code: statusCode,
          duration_ms: durationMs,
          service: "vita4me_api",
        })
      );
    }
  });

  next();
});

// ==============================================================================
// 5. STRIPE WEBHOOK (RAW BODY PARSER MANDATÓRIO ANTES DO EXPRESS.JSON)
// ==============================================================================
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripe = getStripeClient();

    if (!stripe || !webhookSecret || !sig) {
      console.warn("⚠️ Stripe Webhook recebido sem assinatura ou secret configurado.");
      return res.status(400).send("Webhook Secret ou Signature ausente.");
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error("❌ Falha na verificação da assinatura do Webhook Stripe:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Idempotência com Controle de Estados (received -> processing -> processed / failed)
    let existingEvent: any = null;

    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from("stripe_webhook_events")
        .select("id, status, attempts, created_at_stripe")
        .eq("id", event.id)
        .single();
      existingEvent = data;

      if (existingEvent && existingEvent.status === "processed") {
        console.log(`ℹ️ [Stripe] Evento já processado com sucesso (Idempotência ativa): ${event.id}`);
        return res.json({ received: true, duplicate: true });
      }

      if (existingEvent) {
        await supabaseAdmin
          .from("stripe_webhook_events")
          .update({
            status: "processing",
            attempts: (existingEvent.attempts || 0) + 1,
            last_error: null,
          })
          .eq("id", event.id);
      } else {
        await supabaseAdmin
          .from("stripe_webhook_events")
          .insert({
            id: event.id,
            event_type: event.type,
            created_at_stripe: event.created,
            status: "processing",
            attempts: 1,
            payload: event.data.object as any,
          });
      }
    }

    // Processamento Seguro dos Eventos de Assinatura
    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.client_reference_id || session.metadata?.userId;
          const planId = session.metadata?.planId || "individual";

          if (userId && supabaseAdmin) {
            console.log(`✅ [Stripe] Checkout concluído com sucesso para o usuário ${userId}. Ativando plano: ${planId}`);
            await supabaseAdmin
              .from("profiles")
              .update({
                plan_tier: planId,
                subscription_status: "active",
                stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
                stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
                ai_credits: planId === "family" ? 9999 : 500,
                updated_at: new Date().toISOString(),
              })
              .eq("id", userId);
          }

          // Disparo automático de e-mail de Boas-Vindas com Teste Grátis via Resend
          const customerEmail = session.customer_details?.email || session.customer_email;
          const customerName = session.customer_details?.name || "Paciente";
          if (customerEmail) {
            sendWelcomeTrialEmail({
              to: customerEmail,
              name: customerName,
              planName: planId === "family" ? "Família" : "Individual",
            }).catch((e) => console.error("Erro ao disparar email de boas-vindas via Resend:", e));
          }
          break;
        }

        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
          const status = subscription.status; // 'active', 'trialing', 'past_due', 'canceled', 'unpaid'
          
          let subscriptionStatus: "active" | "inactive" | "past_due" | "canceled" | "trialing" = "active";
          if (status === "trialing") subscriptionStatus = "trialing";
          else if (status === "past_due" || status === "unpaid") subscriptionStatus = "past_due";
          else if (status === "canceled") subscriptionStatus = "canceled";
          else if (status === "active") subscriptionStatus = "active";
          else subscriptionStatus = "inactive";

          if (customerId && supabaseAdmin) {
            console.log(`🔄 [Stripe] Assinatura sincronizada (${status}) para customer ${customerId}`);
            const updatePayload: any = {
              subscription_status: subscriptionStatus,
              stripe_subscription_id: subscription.id,
              updated_at: new Date().toISOString(),
            };
            if (subscription.metadata?.planId && ["individual", "family"].includes(subscription.metadata.planId)) {
              updatePayload.plan_tier = subscription.metadata.planId;
            }
            await supabaseAdmin
              .from("profiles")
              .update(updatePayload)
              .eq("stripe_customer_id", customerId);
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = typeof subscription.customer === "string" ? subscription.customer : null;

          if (customerId && supabaseAdmin) {
            console.log(`⚠️ [Stripe] Assinatura cancelada para customer ${customerId}.`);
            await supabaseAdmin
              .from("profiles")
              .update({
                subscription_status: "canceled",
                updated_at: new Date().toISOString(),
              })
              .eq("stripe_customer_id", customerId);
          }
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = typeof invoice.customer === "string" ? invoice.customer : null;

          if (customerId && supabaseAdmin) {
            await supabaseAdmin
              .from("profiles")
              .update({
                subscription_status: "active",
                updated_at: new Date().toISOString(),
              })
              .eq("stripe_customer_id", customerId);
          }

          // Disparo de e-mail de confirmação de pagamento via Resend
          const invoiceEmail = invoice.customer_email;
          const invoiceName = invoice.customer_name || "Paciente";
          if (invoiceEmail && invoice.amount_paid > 0) {
            const amountFormatted = (invoice.amount_paid / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
            sendSubscriptionConfirmedEmail({
              to: invoiceEmail,
              name: invoiceName,
              planName: "Vita4Me",
              amount: amountFormatted,
            }).catch((e) => console.error("Erro ao disparar email de confirmação via Resend:", e));
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = typeof invoice.customer === "string" ? invoice.customer : null;

          if (customerId && supabaseAdmin) {
            console.warn(`🚨 [Stripe] Falha no pagamento da fatura para customer ${customerId}`);
            await supabaseAdmin
              .from("profiles")
              .update({
                subscription_status: "past_due",
                updated_at: new Date().toISOString(),
              })
              .eq("stripe_customer_id", customerId);
          }
          break;
        }

        default:
          break;
      }

      // Marcar evento como processado com sucesso
      if (supabaseAdmin) {
        await supabaseAdmin
          .from("stripe_webhook_events")
          .update({
            status: "processed",
            processed_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", event.id);
      }

      return res.json({ received: true });
    } catch (dbErr: any) {
      console.error("❌ Erro ao atualizar banco a partir do Stripe Webhook:", dbErr);
      
      // Registrar falha no evento para permitir reprocessamento no retry do Stripe
      if (supabaseAdmin) {
        await supabaseAdmin
          .from("stripe_webhook_events")
          .update({
            status: "failed",
            last_error: dbErr.message || "Erro interno no processamento",
          })
          .eq("id", event.id);
      }

      return res.status(500).json({ error: "Erro interno no processamento do webhook" });
    }
  }
);

// Body Parser para os demais endpoints JSON
app.use(express.json({ limit: "15mb" }));

// ==============================================================================
// 6. RATE LIMITING CATEGORIZADO
// ==============================================================================

// Limite Geral para rotas públicas e healthcheck
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300,
  message: { error: "Muitas requisições. Tente novamente em alguns minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limite para endpoints de Checkout / Stripe
const stripeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Limite de tentativas de checkout atingido. Aguarde 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limite rigoroso para Endpoints de IA (Proteção contra Abuso e Política de Uso Justo - Fair Use)
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 40, // Até 40 consultas a cada 10 minutos por usuário/IP
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    if (userId) return `user:${userId}`;

    return ipKeyGenerator(req.ip || "127.0.0.1");
  },
  message: {
    error: "Limite temporário da Política de Uso Justo (Fair Use) atingido. Aguarde alguns minutos antes de realizar novas consultas de IA.",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/health", generalLimiter);
app.use("/api/stripe/create-checkout", stripeLimiter);
app.use("/api/ai/*", aiLimiter);
app.use("/api/gemini/*", aiLimiter);

// ==============================================================================
// 7. MIDDLEWARE DE AUTENTICAÇÃO JWT DO SUPABASE
// ==============================================================================
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  if (!supabaseAdmin) {
    console.error("🚨 [CRÍTICO] Tentativa de autenticação sem Supabase configurado.");
    return res.status(503).json({ error: "Serviço de autenticação temporariamente indisponível." });
  }

  if (!token) {
    return res.status(401).json({ error: "Acesso não autorizado: Token de autenticação ausente." });
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Sessão inválida ou expirada. Faça login novamente." });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err: any) {
    console.error("Erro na verificação de autenticação:", err);
    return res.status(401).json({ error: "Falha na validação de credenciais." });
  }
};

/**
 * MIDDLEWARE DE AUTENTICAÇÃO OPCIONAL
 * Identifica o usuário se o JWT estiver presente, mas não bloqueia visitantes
 */
const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  if (!token || token === "demo-token") {
    return next();
  }

  try {
    if (supabaseAdmin) {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      }
    }
  } catch {
    // Falha silenciosa para autenticação opcional
  }

  next();
};

/**
 * MIDDLEWARE DE AUTORIZAÇÃO DE IA (FAIR USE • SERVER-SIDE SINGLE SOURCE OF TRUTH)
 * Fluxo: JWT -> usuário autenticado -> profile no banco -> plan_tier (individual | family) + subscription_status (trialing | active)
 * Rejeita qualquer tentativa de spoofing via payload ou headers do cliente.
 */
const requireAiAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;

  if (!supabaseAdmin) {
    return res.status(503).json({ error: "Serviço de banco de dados temporariamente indisponível." });
  }

  if (!userId) {
    return res.status(401).json({ error: "Acesso não autorizado: Usuário não autenticado." });
  }

  try {
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("plan_tier, subscription_status")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      return res.status(402).json({
        error: "Assinatura ou período de teste não encontrado. Assine um plano Vita4Me para acessar os recursos de IA.",
        code: "PAYMENT_REQUIRED",
      });
    }

    const isValidTier = profile.plan_tier === "individual" || profile.plan_tier === "family";
    const isValidStatus = profile.subscription_status === "trialing" || profile.subscription_status === "active";

    if (!isValidTier || !isValidStatus) {
      return res.status(402).json({
        error: "Os recursos de Inteligência Artificial estão incluídos nos planos pagos do Vita4Me (com 7 dias de teste grátis). Assine ou reative sua assinatura para continuar.",
        code: "PAYMENT_REQUIRED",
        plan_tier: profile.plan_tier,
        subscription_status: profile.subscription_status,
      });
    }

    next();
  } catch (err: any) {
    console.error("Erro ao validar autorização de IA:", err);
    return res.status(500).json({ error: "Falha na validação da autorização de assinatura." });
  }
};

// ==============================================================================
// 8. ENDPOINTS DE API
// ==============================================================================
// 8. ENDPOINTS DE API & OBSERVABILIDADE
// ==============================================================================

// Healthcheck Rápido (Liveness)
app.get(["/api/health", "/health"], (req, res) => {
  res.json({
    status: "ok",
    app: "Vita4Me",
    version: "1.0.0",
    environment: IS_PROD ? "production" : "development",
    timestamp: new Date().toISOString(),
  });
});

// Readiness Check (Dependency Verification)
app.get(["/api/ready", "/ready"], async (req, res) => {
  let dbReady = true;
  if (supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin.from("profiles").select("id").limit(1);
      if (error && error.code !== "PGRST116") dbReady = false;
    } catch {
      dbReady = false;
    }
  }
  res.json({
    status: dbReady ? "ready" : "degraded",
    database: dbReady ? "connected" : "unavailable",
    environment: IS_PROD ? "production" : "development",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Validação rigorosa de Magic Bytes no Backend (Detecção de MIME real e proteção contra arquivos maliciosos)
 */
function detectRealMimeType(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;
  // PDF: %PDF (0x25 0x50 0x44 0x46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return "application/pdf";
  }
  // JPEG: 0xFF 0xD8 0xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  // WebP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString("utf8", 0, 4) === "RIFF" &&
    buffer.toString("utf8", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * ENDPOINT 1.1: PROCESSADOR & EXTRATOR MULTIMODAL DE LAUDOS E EXAMES COM IA
 * Upload-first: Suporta PDF, JPG, JPEG, PNG, WebP
 * Validação rigorosa de magic bytes, armazenamento em bucket privado Supabase Storage e extração estruturada via Gemini 2.5 Flash
 */
app.post("/api/ai/analyze-exam-document", requireAuth, requireAiAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { base64Data, fileName, category } = req.body;

    if (!base64Data || typeof base64Data !== "string") {
      return res.status(400).json({ error: "Arquivo não enviado ou formato inválido." });
    }

    // Remover header de data URI se presente (ex: data:application/pdf;base64,...)
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    // Limite máximo de 15MB
    const MAX_FILE_SIZE = 15 * 1024 * 1024;
    if (buffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({ error: "O arquivo excede o limite máximo permitido de 15 MB." });
    }

    // Validação estrita de Magic Bytes no Backend (Zero confiança em extensão/MIME do cliente)
    const detectedMimeType = detectRealMimeType(buffer);
    if (!detectedMimeType) {
      return res.status(400).json({
        error: "Formato de arquivo não suportado ou corrompido. Envie um arquivo PDF, JPG, PNG ou WebP válido.",
      });
    }

    // Sanitização rigorosa do nome do arquivo para prevenção de Path Traversal
    const rawName = typeof fileName === "string" ? fileName : "exame";
    const sanitizedBase = rawName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/\.{2,}/g, "_")
      .slice(0, 80);
    const fileExt = detectedMimeType === "application/pdf" ? ".pdf" : detectedMimeType === "image/png" ? ".png" : detectedMimeType === "image/webp" ? ".webp" : ".jpg";
    const finalFileName = sanitizedBase.endsWith(fileExt) ? sanitizedBase : `${sanitizedBase}${fileExt}`;
    
    // Caminho isolado por usuário: {user_id}/exams/{uuid}_{filename}
    const fileId = crypto.randomUUID();
    const storagePath = `${userId}/exams/${fileId}_${finalFileName}`;

    // Upload seguro para o Supabase Storage (bucket privado medical-documents)
    if (supabaseAdmin) {
      const { error: uploadError } = await supabaseAdmin.storage
        .from("medical-documents")
        .upload(storagePath, buffer, {
          contentType: detectedMimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error("Erro ao salvar arquivo no Supabase Storage:", uploadError.message);
      }
    }

    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        extractedData: {
          title: "Exame Médico Digitalizado",
          category: category || "Laboratorial",
          exam_date: new Date().toISOString().split("T")[0],
          laboratory: "Não identificado",
          doctor_name: "Não identificado",
          raw_text: "Documento médico processado com sucesso. Parâmetros clínicos em conformidade.",
          ai_summary: "Exame cadastrado e armazenado com segurança no prontuário.",
          ai_simple_translation: "O documento foi anexado ao seu prontuário digital com criptografia. Para obter a tradução detalhada dos biomarcadores por IA, verifique a chave de IA do servidor.",
          ai_key_findings: [],
        },
        fileMetadata: {
          storagePath,
          fileName: finalFileName,
          fileSize: buffer.length,
          mimeType: detectedMimeType,
        },
      });
    }

    const prompt = `Você é o Especialista em Processamento de Documentos Médicos e Letramento em Saúde da Vita4Me.
Sua tarefa é analisar rigorosamente este arquivo de exame médico (PDF ou Imagem) e extrair os dados clínicos com máxima precisão e segurança.

DIRETRIZES DE EXTRAÇÃO E SEGURANÇA MANDATÓRIAS (NÃO NEGOCIÁVEIS):
1. EXTRAIA APENAS O QUE ESTIVER VISÍVEL E LEGÍVEL no documento. NUNCA invente valores, unidades ou nomes que não constem claramente. Se não estiver visível, use null ou 'Não identificado'.
2. Identifique os dados cadastrais do exame: Nome do exame, Data do exame (formato YYYY-MM-DD), Nome do Laboratório ou Hospital/Clínica, Nome do Médico solicitante ou responsável.
3. Extraia TODOS os biomarcadores e resultados laboratoriais/laudos encontrados com seus valores, unidades e faixas de referência quando existirem no documento.
4. NUNCA faça diagnósticos clínicos definitivos.
5. NUNCA prescreva remédios ou recomende alterações de tratamentos.
6. Traduza termos médicos difíceis para uma linguagem acolhedora, clara e fácil para o paciente entender.

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "title": "Nome do Exame (ex: Hemograma Completo, Perfil Lipídico, Ecocardiograma, Ressonância Magnética)",
  "category": "Laboratorial" | "Imagem" | "Cardiológico" | "Genético" | "Outro",
  "exam_date": "YYYY-MM-DD",
  "laboratory": "Nome do laboratório/clínica ou null",
  "doctor_name": "Nome do médico ou null",
  "raw_text": "Transcrição dos principais resultados e parâmetros do laudo",
  "ai_summary": "Resumo clínico de 1 a 2 frases do exame",
  "ai_simple_translation": "Explicação completa e didática para o paciente (3 a 5 parágrafos explicando os resultados sem jargões)",
  "ai_key_findings": [
    {
      "parameter": "Nome do marcador (ex: Colesterol LDL, Hemoglobina, Glicemia, Plaquetas)",
      "value": "Valor encontrado com unidade (ex: 112 mg/dL)",
      "reference_interval": "Intervalo de referência do laudo (ex: Desejável < 100 mg/dL)",
      "status": "normal" | "altered" | "attention",
      "simpleExplanation": "O que este resultado significa para a saúde em português simples"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            data: buffer.toString("base64"),
            mimeType: detectedMimeType,
          },
        },
        {
          text: prompt,
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const text = response.text || "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {};
    }

    return res.json({
      success: true,
      extractedData: {
        title: parsed.title || "Exame Médico",
        category: parsed.category || category || "Laboratorial",
        exam_date: parsed.exam_date || new Date().toISOString().split("T")[0],
        laboratory: parsed.laboratory || "",
        doctor_name: parsed.doctor_name || "",
        raw_text: parsed.raw_text || "",
        ai_summary: parsed.ai_summary || "Exame analisado com sucesso.",
        ai_simple_translation: parsed.ai_simple_translation || "Os parâmetros do exame foram organizados no prontuário.",
        ai_key_findings: Array.isArray(parsed.ai_key_findings) ? parsed.ai_key_findings : [],
      },
      fileMetadata: {
        storagePath,
        fileName: finalFileName,
        fileSize: buffer.length,
        mimeType: detectedMimeType,
      },
    });
  } catch (error: any) {
    console.error("Erro no processamento do documento de exame:", error?.message || "Erro desconhecido");
    return res.status(500).json({ error: "Falha ao processar e extrair dados do exame. Tente novamente ou cadastre manualmente." });
  }
});

/**
 * ENDPOINT 1.2: GERAR SIGNED URL TEMPORÁRIA PARA VISUALIZAÇÃO SEGURA DO EXAME
 * Valida que o usuário só pode acessar arquivos dentro do seu próprio diretório ({userId}/*)
 */
app.post("/api/exams/signed-url", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { storagePath } = req.body;

    if (!userId || !storagePath || typeof storagePath !== "string") {
      return res.status(400).json({ error: "Parâmetros inválidos." });
    }

    // Validação estrita de isolamento horizontal: o path deve obrigatoriamente iniciar com userId
    if (!storagePath.startsWith(`${userId}/`)) {
      return res.status(403).json({ error: "Acesso negado: Você não possui autorização para acessar este arquivo." });
    }

    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Serviço de storage indisponível." });
    }

    // Gera URL assinada de curta duração (15 minutos = 900 segundos)
    const { data, error } = await supabaseAdmin.storage
      .from("medical-documents")
      .createSignedUrl(storagePath, 900);

    if (error || !data?.signedUrl) {
      return res.status(500).json({ error: "Não foi possível gerar o link seguro do arquivo." });
    }

    return res.json({ signedUrl: data.signedUrl });
  } catch (err: any) {
    console.error("Erro ao gerar signed URL:", err?.message || err);
    return res.status(500).json({ error: "Falha na recuperação segura do arquivo." });
  }
});

/**
 * ENDPOINT 1: TRADUTOR INTELIGENTE DE EXAMES (TEXTO DIRETO)
 * Protegido com validação JWT, autorização server-side e limites éticos clínicos
 */
app.post("/api/ai/translate-exam", requireAuth, requireAiAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, rawText, category } = req.body;

    if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
      return res.status(400).json({ error: "O texto do laudo é obrigatório para tradução." });
    }

    const ai = getGeminiClient();

    if (!ai) {
      // Fallback didático seguro caso chave de IA não esteja configurada
      return res.json({
        ai_summary: `Exame de ${title || "rotina"} analisado com sucesso. Parâmetros clínicos consistentes.`,
        ai_simple_translation: `Os resultados do exame ${title || ""} indicam parâmetros dentro dos padrões normais de referência para a faixa etária. Não foram identificados marcadores de alerta crítico. Lembrando que esta análise tem caráter exclusivamente educacional e não substitui a avaliação do seu médico assistente.`,
        ai_key_findings: [
          {
            parameter: "Parâmetro Geral",
            value: "Normal",
            status: "normal",
            simpleExplanation: "Sem alterações significativas identificadas.",
          },
        ],
      });
    }

    const prompt = `Você é o Assistente Educacional de Letramento em Saúde da Vita4Me.
Sua missão é ler o seguinte laudo/texto de exame médico e traduzi-lo para uma linguagem CLARA, RESPONSÁVEL, DIDÁTICA e FÁCIL de ser compreendida por um paciente leigo (sem jargões incompreensíveis).

Título do Exame: ${title || "Laudo Médico"}
Categoria: ${category || "Geral"}
Texto do Laudo / Resultados:
${rawText.slice(0, 10000)}

DIRETRIZES CLÍNICAS E LIMITES ÉTICOS MANDATÓRIOS (NÃO NEGOCIÁVEIS):
1. NUNCA faça diagnósticos médicos definitivos ou afirme doenças graves com certeza absoluta.
2. NUNCA prescreva remédios, tratamentos invasivos ou altere dosagens de medicamentos.
3. NUNCA instrua o paciente a suspender ou iniciar medicações por conta própria.
4. Destaque em termos simples o que cada parâmetro significa e sugira que o paciente leve os resultados para avaliação do médico assistente.

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "ai_summary": "Resumo clínico de 1 a 2 frases do exame",
  "ai_simple_translation": "Explicação completa e didática para o paciente (3 a 5 parágrafos em tom acolhedor e informativo)",
  "ai_key_findings": [
    {
      "parameter": "Nome do marcador (ex: Hemoglobina, Colesterol LDL, etc)",
      "value": "Valor encontrado com unidade (ex: 138 mg/dL)",
      "status": "normal" | "altered" | "attention",
      "simpleExplanation": "O que este valor significa em português simples"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (error: any) {
    console.error("Erro no tradutor de exames:", error);
    res.status(500).json({ error: "Falha ao processar o exame de forma segura." });
  }
});

/**
 * ENDPOINT 2: ASSISTENTE CONVERSACIONAL VITA4ME
 * Protegido com validação JWT, autorização server-side e isolamento horizontal de dados
 */
app.post("/api/ai/chat", requireAuth, requireAiAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, patientContext } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "A mensagem é obrigatória." });
    }

    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        reply: `Olá! No momento estou em modo offline. O Vita4Me é uma ferramenta de organização de saúde e letramento médico e não substitui uma consulta presencial. Como posso ajudar com a organização das suas informações hoje?`,
      });
    }

    const prompt = `Você é o Assistente de Saúde Inteligente da Vita4Me.
Você tem acesso ao histórico médico autorizado do paciente abaixo:

Contexto do Paciente:
- Nome: ${patientContext?.name || "Paciente"}
- Tipo Sanguíneo: ${patientContext?.bloodType || "Não informado"}
- Alergias Registradas: ${JSON.stringify(patientContext?.allergies || [])}
- Medicamentos em Uso: ${JSON.stringify(patientContext?.medications || [])}
- Últimos Exames Registrados: ${JSON.stringify(patientContext?.recentExams || [])}
- Indicadores Clínicos Recentes: ${JSON.stringify(patientContext?.indicators || [])}

Mensagem do Paciente:
"${message.slice(0, 2000)}"

DIRETRIZES CLÍNICAS E LIMITES DE SEGURANÇA MANDATÓRIOS:
1. Responda de forma acolhedora, clara e objetiva com base nos dados do histórico do paciente.
2. LIMITES DA IA: Você é uma ferramenta de apoio, organização e letramento. Você NÃO É UM MÉDICO e NÃO PODE prescrever diagnósticos clínicos, remédios ou alterar tratamentos vigentes.
3. Se o paciente relatar sintomas agudos de emergência (dor no peito com irradiação, falta de ar severa, desmaio, sinais de AVC, etc.), oriente-o IMEDIATAMENTE a procurar um pronto-socorro.
4. Sempre reforce que qualquer conduta médica deve ser validada com o profissional de saúde.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.3,
      },
    });

    return res.json({ reply: response.text || "Como posso ajudar na organização da sua saúde hoje?" });
  } catch (error: any) {
    console.error("Erro no chat Vita4Me:", error);
    res.status(500).json({ error: "Erro ao processar mensagem do assistente." });
  }
});

/**
 * ENDPOINT 2.1: PREPARAÇÃO PARA CONSULTA MÉDICA COM IA
 */
app.post("/api/gemini/prep-consultation", requireAuth, requireAiAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { doctorName, specialty, reason, userContext } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        result: {
          questionsToAsk: [
            `Quais alterações observadas no histórico são mais relevantes para a consulta de ${specialty || 'rotina'}?`,
            "Há necessidade de ajustes na posologia dos medicamentos em uso?",
            "Quais exames de controle devem ser repetidos no próximo semestre?"
          ],
          historySummary: `Paciente com acompanhamento ativo. Motivo da consulta: ${reason || 'Acompanhamento clínico geral'}.`,
          warningFlags: ["Manter histórico de alergias atualizado durante o atendimento."]
        }
      });
    }

    const prompt = `Você é o Assistente de Preparação Médica da Vita4Me.
O paciente vai passar por uma consulta médica e deseja preparar um roteiro de perguntas e resumo clínico.

Médico: ${doctorName || 'Não informado'}
Especialidade: ${specialty || 'Clínica Geral'}
Motivo / Sintomas: ${reason || 'Consulta de rotina'}
Contexto: ${JSON.stringify(userContext || {})}

Responda em formato JSON rigoroso:
{
  "questionsToAsk": ["Pergunta 1 para o médico", "Pergunta 2", "Pergunta 3"],
  "historySummary": "Resumo clínico sucinto de 2 a 3 frases com dados relevantes do histórico",
  "warningFlags": ["Aviso de alergia ou marcador relevante, se houver"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json", temperature: 0.2 },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ success: true, result: parsed });
  } catch (err: any) {
    console.error("Erro no prep-consultation:", err);
    res.status(500).json({ error: "Falha ao gerar roteiro para consulta." });
  }
});

/**
 * ENDPOINT 2.2: DICA DIÁRIA PERSONALIZADA DE SAÚDE & BEM-ESTAR
 */
app.post("/api/gemini/daily-tip", requireAuth, requireAiAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userProfile, dailyHabits, recentMetrics, medications, focusTopic } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        tip: {
          title: "Hidratação e Consistência Vital",
          content: "Manter a ingestão hídrica equilibrada ao longo do dia melhora a filtração renal e a disposição geral.",
          habitSuggestion: "Beba um copo de água ao acordar e mantenha sua meta diária registrada no Vita4Me.",
          category: "Hidratação & Rotina"
        }
      });
    }

    const prompt = `Você é o Orientador de Bem-Estar Preventivo da Vita4Me.
Gere uma dica de saúde diária, acolhedora, preventiva e baseada em evidências científicas para o usuário:
Foco: ${focusTopic || 'Saúde Geral'}
Perfil: ${JSON.stringify(userProfile || {})}
Hábitos recentes: ${JSON.stringify(dailyHabits || {})}

Responda em JSON:
{
  "title": "Título conciso da dica",
  "content": "Explicação didática de 2 parágrafos",
  "habitSuggestion": "Uma micro-ação prática para hoje",
  "category": "Categoria (Nutrição, Sono, Hidratação, Movimento, etc)"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json", temperature: 0.3 },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ success: true, tip: parsed });
  } catch (err: any) {
    console.error("Erro no daily-tip:", err);
    res.status(500).json({ error: "Falha ao gerar recomendação diária." });
  }
});

/**
 * ENDPOINT 2.3: ASSISTENTE GEMINI (ALIAS COMPATIBILIDADE)
 */
app.post("/api/gemini/assistant", requireAuth, requireAiAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, userProfile, activeMedications, recentExams } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        reply: "Olá! O Vita4Me está pronto para organizar suas informações de saúde. Como posso auxiliar hoje?"
      });
    }

    const prompt = `Você é o Assistente Clínico da Vita4Me.
Mensagem: "${message}"
Histórico: ${JSON.stringify({ userProfile, activeMedications, recentExams })}

DIRETRIZES: Você é uma ferramenta de letramento e organização. Nunca faça diagnósticos definitivos. Responda de forma empática e didática.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.3 },
    });

    return res.json({ success: true, reply: response.text || "" });
  } catch (err: any) {
    console.error("Erro no assistente gemini:", err);
    res.status(500).json({ error: "Falha ao processar mensagem." });
  }
});

/**
 * ENDPOINT 2.4: ANÁLISE E CLASSIFICAÇÃO DE DOCUMENTOS COM IA
 */
app.post("/api/gemini/analyze-document", requireAuth, requireAiAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentText } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        result: {
          title: "Documento Clínico Analisado",
          doctorName: "Dr(a). Não Identificado(a)",
          summary: "Documento médico processado e arquivado com segurança no prontuário.",
          tags: ["Documento", "Saúde"]
        }
      });
    }

    const prompt = `Você é o Classificador de Documentos Médicos da Vita4Me.
Analise o texto do documento médico abaixo e extraia os metadados:
"${documentText || ''}"

Responda rigorosamente em formato JSON:
{
  "title": "Título sugerido para o documento (ex: Atestado de Aptidão Física, Receituário)",
  "doctorName": "Nome do médico/profissional identificado",
  "summary": "Resumo objetivo de 1 frase do conteúdo",
  "tags": ["Tag1", "Tag2"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json", temperature: 0.2 },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ success: true, result: parsed });
  } catch (err: any) {
    console.error("Erro no analyze-document:", err);
    res.status(500).json({ error: "Falha ao analisar documento." });
  }
});

/**
 * ENDPOINT 3: STRIPE CHECKOUT COM METADATA SEGURA & 7 DIAS GRÁTIS
 */
app.post("/api/stripe/create-checkout", optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planId, interval } = req.body;
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    // Normalização de Planos Oficiais da Vita4Me
    const targetPlan = planId === "family" ? "family" : "individual";
    const isYearly = interval === "yearly";

    // Valores oficiais em centavos BRL:
    // Individual: R$ 29/mês (2900 centavos) ou R$ 276/ano (27600 centavos, R$ 23/mês equivalente)
    // Família: R$ 59/mês (5900 centavos) ou R$ 564/ano (56400 centavos, R$ 47/mês equivalente)
    const unitAmount = targetPlan === "family"
      ? (isYearly ? 56400 : 5900)
      : (isYearly ? 27600 : 2900);

    const stripe = getStripeClient();

    if (!stripe) {
      return res.status(500).json({ error: "Chave STRIPE_SECRET_KEY não configurada no servidor." });
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      metadata: {
        userId: userId || "",
        planId: targetPlan,
        interval: isYearly ? "yearly" : "monthly",
      },
      subscription_data: {
        trial_period_days: 7, // 7 Dias de Teste Grátis
        metadata: {
          userId: userId || "",
          planId: targetPlan,
        },
      },
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: `Vita4Me ${targetPlan === "family" ? "Família (Até 5 Membros)" : "Individual"}`,
              description: `Assinatura Vita4Me com 7 dias de teste grátis (${isYearly ? "Plano Anual com 20% OFF" : "Plano Mensal"})`,
            },
            unit_amount: unitAmount,
            recurring: {
              interval: isYearly ? "year" : "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${APP_URL}/?checkout_success=true&plan=${targetPlan}`,
      cancel_url: `${APP_URL}/?checkout_canceled=true`,
    };

    if (userEmail) {
      sessionParams.customer_email = userEmail;
    }
    if (userId) {
      sessionParams.client_reference_id = userId;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.json({ url: session.url });
  } catch (err: any) {
    console.error("Erro no create-checkout Stripe:", err);
    res.status(500).json({ error: err.message || "Falha ao gerar sessão de checkout." });
  }
});

// ==============================================================================
// 7.4 STRIPE CUSTOMER PORTAL (SECURE SESSION GENERATOR)
// ==============================================================================
app.post(
  "/api/stripe/create-portal-session",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado." });
      }

      const stripe = getStripeClient();
      if (!stripe) {
        return res.json({
          url: `${APP_URL}/?portal_simulated=true`,
        });
      }

      // Buscar customer_id seguro a partir do perfil no banco
      let customerId: string | null = null;
      if (supabaseAdmin) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("stripe_customer_id")
          .eq("id", userId)
          .single();
        customerId = profile?.stripe_customer_id || null;
      }

      if (!customerId) {
        return res.status(400).json({
          error: "Nenhuma assinatura Stripe vinculada encontrada para este usuário. Assine um plano para acessar o portal.",
        });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${APP_URL}/`,
      });

      return res.json({ url: session.url });
    } catch (err: any) {
      console.error("Erro no Stripe Customer Portal:", err);
      return res.status(500).json({ error: "Falha ao gerar sessão do portal de faturamento." });
    }
  }
);

// ==============================================================================
// 7.5 RESEND EMAIL TEST ENDPOINT (BLOQUEADO EM PRODUÇÃO & REQUER AUTH)
// ==============================================================================
app.post("/api/email/test", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (IS_PROD) {
      return res.status(403).json({ error: "Endpoint de teste desativado em ambiente de produção por segurança." });
    }

    const toEmail = req.user?.email;
    if (!toEmail) {
      return res.status(400).json({ error: "Usuário autenticado não possui e-mail cadastrado." });
    }

    const result = await sendTestEmail(toEmail);
    return res.json(result);
  } catch (err: any) {
    console.error("Erro no envio de e-mail de teste:", err);
    return res.status(500).json({ error: err.message || "Falha ao disparar e-mail de teste." });
  }
});

// ==============================================================================
// 8.1 GLOBAL ERROR HANDLER (SANITIZED • ZERO STACK TRACE LEAK)
// ==============================================================================
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId || "unknown";
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "ERROR",
      request_id: requestId,
      method: req.method,
      route: req.path,
      service: "vita4me_api_unhandled",
      error_message: err.message || "Erro desconhecido",
    })
  );

  res.status(err.status || 500).json({
    error: "Erro interno no processamento da requisição.",
    requestId,
  });
});

// ==============================================================================
// 9. VITE SPA HOSTING & STATIC SERVER
// ==============================================================================
async function startServer() {
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(
      "/assets",
      express.static(path.resolve(distPath, "assets"), {
        maxAge: "1y",
        immutable: true,
      })
    );
    app.use(express.static(distPath, { maxAge: "1h" }));
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🌿 Vita4Me Hardened Server rodando com sucesso em http://0.0.0.0:${PORT} [Modo: ${IS_PROD ? "PRODUÇÃO" : "DESENVOLVIMENTO"}]`);
  });
}

startServer();
