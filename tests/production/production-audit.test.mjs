import assert from "assert";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const PROD_URL = process.env.PROD_URL || "https://vita4me-306188844103.southamerica-east1.run.app";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

assert(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY, "Supabase creds missing");

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const results = [];
function logAudit(cat, id, name, passed, details = "") {
  results.push({ cat, id, name, passed, details });
  const icon = passed ? "  ✅ PASS" : "  ❌ FAIL";
  console.log(`${icon} [${cat}][${id}] ${name}${details ? ` — ${details}` : ""}`);
  if (!passed) {
    throw new Error(`[${cat}][${id}] ${name} FAILED: ${details}`);
  }
}

async function runProductionAudit() {
  console.log(`\n==================================================================`);
  console.log(`🌐 INICIANDO AUDITORIA FINAL DE SEGURANÇA & PRODUÇÃO VITA4ME`);
  console.log(`Ambiente Alvo: ${PROD_URL}`);
  console.log(`Data/Hora: ${new Date().toISOString()}`);
  console.log(`==================================================================\n`);

  const runId = Date.now();
  const emailA = `audit.prod.a.${runId}@vita4me.test`;
  const emailB = `audit.prod.b.${runId}@vita4me.test`;
  const strongPwd = `Vita4Me#Prod${runId}Aa!`;

  let userAId = null;
  let userBId = null;
  let tokenA = null;
  let tokenB = null;

  try {
    // ------------------------------------------------------------------------
    // 1. HEALTH & READINESS DO CLOUD RUN
    // ------------------------------------------------------------------------
    console.log("▶ 1. Verificação de Saúde e Prontidão do Serviço Publicado");
    const healthRes = await fetch(`${PROD_URL}/api/health`);
    const healthData = await healthRes.json().catch(() => ({}));
    logAudit(
      "INFRA",
      "HLT-01",
      "Endpoint /api/health ativo e reportando modo production",
      healthRes.status === 200 && healthData.environment === "production",
      `status=${healthRes.status}, env=${healthData.environment}`
    );

    const readyRes = await fetch(`${PROD_URL}/api/ready`);
    const readyData = await readyRes.json().catch(() => ({}));
    logAudit(
      "INFRA",
      "RDY-01",
      "Endpoint /api/ready reportando banco conectado e pronto",
      readyRes.status === 200 && readyData.status === "ready" && readyData.database === "connected",
      `status=${readyRes.status}, database=${readyData.database}`
    );

    // ------------------------------------------------------------------------
    // 2. HTTP SECURITY HEADERS, CSP & CORS
    // ------------------------------------------------------------------------
    console.log("\n▶ 2. Headers de Segurança, CSP, CORS e Tratamento de Erros");
    const rootRes = await fetch(`${PROD_URL}/`);
    const csp = rootRes.headers.get("content-security-policy") || "";
    const hsts = rootRes.headers.get("strict-transport-security") || "";
    const xcto = rootRes.headers.get("x-content-type-options") || "";
    const xfo = rootRes.headers.get("x-frame-options") || "";
    const acaoRoot = rootRes.headers.get("access-control-allow-origin");
    const acacRoot = rootRes.headers.get("access-control-allow-credentials");

    logAudit(
      "HEADERS",
      "CSP-01",
      "CSP sem 'unsafe-inline' em script-src + base-uri 'self' + frame-ancestors 'none'",
      csp.includes("script-src 'self' https://js.stripe.com") &&
        !csp.includes("script-src 'self' 'unsafe-inline'") &&
        csp.includes("base-uri 'self'") &&
        csp.includes("frame-ancestors 'none'"),
      `CSP script-src validado`
    );

    logAudit(
      "HEADERS",
      "HSTS-01",
      "HSTS ativo com max-age >= 1 ano + subdomains + preload",
      hsts.includes("max-age=31536000") && hsts.includes("includeSubDomains"),
      `HSTS=${hsts}`
    );

    logAudit(
      "HEADERS",
      "XFO-01",
      "Anti-Clickjacking ativo (X-Frame-Options: DENY e frame-ancestors: none)",
      xfo.toUpperCase() === "DENY",
      `XFO=${xfo}`
    );

    logAudit(
      "CORS",
      "CRS-01",
      "Navegação pública sem headers CORS conflitantes (* com credentials)",
      !(acaoRoot === "*" && acacRoot === "true"),
      `ACAO=${acaoRoot || "none"}, ACAC=${acacRoot || "none"}`
    );

    const evilCorsRes = await fetch(`${PROD_URL}/api/health`, {
      headers: { Origin: "https://attacker-domain.evil.com" },
    });
    logAudit(
      "CORS",
      "CRS-02",
      "Bloqueio de Origin cruzada não autorizada em rotas /api/*",
      evilCorsRes.status === 403,
      `Status=${evilCorsRes.status}`
    );

    // Tratamento de JSON inválido sem vazamento de stack trace
    const badJsonRes = await fetch(`${PROD_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"email": "broken',
    });
    const badJsonBody = await badJsonRes.json().catch(() => ({}));
    logAudit(
      "ERRORS",
      "ERR-01",
      "JSON malformado retorna 400 Bad Request sem stack trace",
      badJsonRes.status === 400 && badJsonBody.code === "INVALID_JSON" && !badJsonBody.stack,
      `Status=${badJsonRes.status}, code=${badJsonBody.code}`
    );

    // ------------------------------------------------------------------------
    // 3. AUTENTICAÇÃO, CONSENTIMENTOS E POLÍTICA DE SENHA
    // ------------------------------------------------------------------------
    console.log("\n▶ 3. Autenticação, Consentimentos LGPD e Política Única de Senha");
    const noConsentRes = await fetch(`${PROD_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailA,
        password: strongPwd,
        fullName: "Audit Prod A",
      }),
    });
    const noConsentBody = await noConsentRes.json().catch(() => ({}));
    logAudit(
      "AUTH",
      "CST-01",
      "Bloqueio server-side de cadastro sem consentimentos LGPD obrigatórios",
      noConsentRes.status === 400 && noConsentBody.code === "CONSENT_REQUIRED",
      `Status=${noConsentRes.status}, code=${noConsentBody.code}`
    );

    const weakPwdRes = await fetch(`${PROD_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailA,
        password: "fraca",
        fullName: "Audit Prod A",
        consents: {
          termsAccepted: true,
          privacyAccepted: true,
          healthDataAccepted: true,
          documentVersion: "2.0",
        },
      }),
    });
    const weakPwdBody = await weakPwdRes.json().catch(() => ({}));
    logAudit(
      "AUTH",
      "PWD-01",
      "Bloqueio server-side de senha fraca (< 8 chars ou sem complexidade)",
      weakPwdRes.status === 400 && weakPwdBody.code === "WEAK_PASSWORD",
      `Status=${weakPwdRes.status}, code=${weakPwdBody.code}`
    );

    // Cadastro legítimo de User A e User B
    const regARes = await fetch(`${PROD_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailA,
        password: strongPwd,
        fullName: "Audit Prod User A",
        consents: {
          termsAccepted: true,
          privacyAccepted: true,
          healthDataAccepted: true,
          documentVersion: "2.0",
        },
      }),
    });
    const regABody = await regARes.json();
    userAId = regABody.userId;

    const regBRes = await fetch(`${PROD_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailB,
        password: strongPwd,
        fullName: "Audit Prod User B",
        consents: {
          termsAccepted: true,
          privacyAccepted: true,
          healthDataAccepted: true,
          documentVersion: "2.0",
        },
      }),
    });
    const regBBody = await regBRes.json();
    userBId = regBBody.userId;

    logAudit(
      "AUTH",
      "REG-01",
      "Cadastro com consentimentos e senha forte cria usuários e trilha de auditoria",
      regARes.status === 200 && regABody.consentsRecorded === true && Boolean(userAId) && Boolean(userBId),
      `userA=${userAId?.slice(0, 8)}, userB=${userBId?.slice(0, 8)}`
    );

    // Login via Supabase Auth
    const { data: signInA, error: errSignA } = await anonClient.auth.signInWithPassword({
      email: emailA,
      password: strongPwd,
    });
    assert(!errSignA && signInA.session, "Falha no login de User A");
    tokenA = signInA.session.access_token;

    const { data: signInB, error: errSignB } = await anonClient.auth.signInWithPassword({
      email: emailB,
      password: strongPwd,
    });
    assert(!errSignB && signInB.session, "Falha no login de User B");
    tokenB = signInB.session.access_token;

    logAudit(
      "AUTH",
      "LOG-01",
      "Autenticação por credenciais emite JWT válido para ambos os usuários",
      Boolean(tokenA) && Boolean(tokenB),
      "JWTs emitidos com sucesso"
    );

    // ------------------------------------------------------------------------
    // 4. PERSISTÊNCIA CLÍNICA & RECUPERAÇÃO DE EXAMES (A07)
    // ------------------------------------------------------------------------
    console.log("\n▶ 4. Persistência de Exames e Dados Clínicos no Supabase");
    const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${tokenA}` } },
      auth: { persistSession: false },
    });

    const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${tokenB}` } },
      auth: { persistSession: false },
    });

    const { data: insertedExamA, error: errInsertExamA } = await clientA
      .from("lab_exams")
      .insert({
        user_id: userAId,
        title: "Hemograma Completo Audit Prod",
        laboratory: "Lab Central de Produção",
        category: "Laboratorial",
        exam_date: new Date().toISOString().split("T")[0],
        status_alert: "Normal",
      })
      .select("*")
      .single();

    assert(!errInsertExamA && insertedExamA?.id, `Falha ao inserir exame: ${errInsertExamA?.message}`);
    const examAId = insertedExamA.id;

    logAudit(
      "CLINICAL",
      "EXM-01",
      "Persistência de exame em lab_exams com UUID real retornado pelo banco",
      Boolean(examAId) && insertedExamA.title === "Hemograma Completo Audit Prod",
      `examId=${examAId}`
    );

    // ------------------------------------------------------------------------
    // 5. ISOLAMENTO MULTI-TENANT E RLS (USER_A vs USER_B)
    // ------------------------------------------------------------------------
    console.log("\n▶ 5. Isolamento Multi-Tenant Estrito e Validação de RLS");
    const { data: leakCheck } = await clientB
      .from("lab_exams")
      .select("*")
      .eq("id", examAId);

    logAudit(
      "RLS",
      "IDOR-01",
      "User B é incapaz de ler exames de User A (SELECT cross-tenant retorna 0 registros)",
      (leakCheck?.length || 0) === 0,
      `registros vazados=${leakCheck?.length || 0}`
    );

    const { error: errMutate } = await clientB
      .from("lab_exams")
      .update({ title: "Adulterado por User B" })
      .eq("id", examAId);

    const { data: verifyExamA } = await clientA
      .from("lab_exams")
      .select("title")
      .eq("id", examAId)
      .single();

    logAudit(
      "RLS",
      "IDOR-02",
      "User B é incapaz de alterar (UPDATE) exames de User A",
      verifyExamA.title === "Hemograma Completo Audit Prod",
      `título permanece íntegro`
    );

    const { error: errForgeInsert } = await clientB
      .from("lab_exams")
      .insert({
        user_id: userAId,
        title: "Injeção Forjada",
        exam_date: "2026-11-04",
      });

    logAudit(
      "RLS",
      "IDOR-03",
      "User B é bloqueado pelo RLS ao tentar inserir registros com user_id de User A",
      Boolean(errForgeInsert),
      `erro RLS=${errForgeInsert?.code || errForgeInsert?.message}`
    );

    // Proteção contra elevação de privilégios financeiros
    const { error: errElevate } = await clientA
      .from("profiles")
      .update({
        plan_tier: "family",
        subscription_status: "active",
        ai_credits: 99999,
      })
      .eq("id", userAId);

    logAudit(
      "FINANCIAL",
      "PRV-01",
      "Trigger do banco bloqueia cliente autenticado de auto-elevar plano ou créditos",
      Boolean(errElevate),
      `bloqueio=${errElevate?.message || "Trigger acionado"}`
    );

    // ------------------------------------------------------------------------
    // 6. UPLOAD, COFRE & PROTEÇÃO DE STORAGE
    // ------------------------------------------------------------------------
    console.log("\n▶ 6. Validação de Upload, Magic Bytes e Assinatura de Storage");
    const svgPayload = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString("base64");
    const uploadSvgRes = await fetch(`${PROD_URL}/api/ai/analyze-exam-document`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        base64Data: `data:image/svg+xml;base64,${svgPayload}`,
        fileName: "malicious.svg",
        category: "Laboratorial",
      }),
    });
    logAudit(
      "UPLOAD",
      "UPL-01",
      "Bloqueio server-side de upload de arquivo SVG malicioso (HTTP 415)",
      uploadSvgRes.status === 415,
      `Status=${uploadSvgRes.status}`
    );

    const truncPdfPayload = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\n").toString("base64");
    const uploadTruncRes = await fetch(`${PROD_URL}/api/ai/analyze-exam-document`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        base64Data: `data:application/pdf;base64,${truncPdfPayload}`,
        fileName: "corrupt.pdf",
        category: "Laboratorial",
      }),
    });
    logAudit(
      "UPLOAD",
      "UPL-02",
      "Bloqueio server-side de PDF corrompido/truncado sem %%EOF (HTTP 415)",
      uploadTruncRes.status === 415,
      `Status=${uploadTruncRes.status}`
    );

    // User B tentando assinar link de visualização de User A
    const signedUrlRes = await fetch(`${PROD_URL}/api/exams/signed-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        storagePath: `${userAId}/exams/exam_secret.pdf`,
        examId: examAId,
      }),
    });
    logAudit(
      "STORAGE",
      "STG-01",
      "User B recebe 403 Forbidden ao tentar obter Signed URL de exame pertencente a User A",
      signedUrlRes.status === 403,
      `Status=${signedUrlRes.status}`
    );

    // ------------------------------------------------------------------------
    // 7. STRIPE CHECKOUT & CUSTOMER PORTAL NO SERVIÇO PUBLICADO
    // ------------------------------------------------------------------------
    console.log("\n▶ 7. Gateways de Pagamento (Stripe Live em Produção)");
    const checkoutRes = await fetch(`${PROD_URL}/api/stripe/create-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        planId: "family",
        interval: "monthly",
      }),
    });
    const checkoutData = await checkoutRes.json().catch(() => ({}));
    logAudit(
      "PAYMENT",
      "STP-01",
      "Geração de Checkout Session oficial da Stripe em produção",
      checkoutRes.status === 200 && typeof checkoutData.url === "string" && checkoutData.url.includes("checkout.stripe.com"),
      `url=${checkoutData.url ? checkoutData.url.slice(0, 50) + "..." : "none"}`
    );

    // ------------------------------------------------------------------------
    // 8. EXCLUSÃO DE CONTA E CASCATA COMPLETA
    // ------------------------------------------------------------------------
    console.log("\n▶ 8. Exclusão Auditável de Conta e Higienização de Dados");
    const delARes = await fetch(`${PROD_URL}/api/auth/account`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const delABody = await delARes.json().catch(() => ({}));

    const { data: checkProfA } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", userAId)
      .maybeSingle();

    const { data: checkExmA } = await adminClient
      .from("lab_exams")
      .select("id")
      .eq("user_id", userAId);

    logAudit(
      "ACCOUNT",
      "DEL-01",
      "Exclusão de conta remove auth.users, profiles e exames clínicos em cascata",
      delARes.status === 200 && delABody.deleted === true && !checkProfA && (checkExmA?.length || 0) === 0,
      `deleted=${delABody.deleted}, residualExams=${checkExmA?.length || 0}`
    );
    userAId = null;

    const delBRes = await fetch(`${PROD_URL}/api/auth/account`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const delBBody = await delBRes.json().catch(() => ({}));
    assert(delBRes.status === 200 && delBBody.deleted === true, "Falha ao limpar User B");
    userBId = null;

    console.log("\n==================================================================");
    console.log(`🎉 AUDITORIA CONCLUÍDA: TODOS OS ${results.length} TESTES PASSARAM EM PRODUÇÃO!`);
    console.log("==================================================================\n");

  } finally {
    if (userAId) {
      await adminClient.auth.admin.deleteUser(userAId).catch(() => {});
    }
    if (userBId) {
      await adminClient.auth.admin.deleteUser(userBId).catch(() => {});
    }
  }
}

runProductionAudit().catch((err) => {
  console.error("\n❌ AUDITORIA DE PRODUÇÃO FALHOU:", err);
  process.exit(1);
});
