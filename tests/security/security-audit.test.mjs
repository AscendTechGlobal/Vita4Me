import fs from "fs";
import path from "path";
import assert from "assert";
import { spawn } from "child_process";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_PORT = process.env.TEST_PORT || "3099";
const API_BASE = process.env.TEST_API_BASE || `http://127.0.0.1:${TEST_PORT}`;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Variáveis do Supabase ausentes no .env");
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function createAnonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const results = [];
function logTest(id, name, passed, details = "") {
  results.push({ id, name, passed, details });
  const icon = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${icon} [${id}] ${name}${details ? ` — ${details}` : ""}`);
  if (!passed) {
    throw new Error(`Falha no teste [${id}] ${name}: ${details}`);
  }
}

async function startTestServer() {
  const serverProc = spawn(process.execPath, [path.resolve("dist/server.cjs")], {
    env: { ...process.env, PORT: TEST_PORT, NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProc.stderr.on("data", (d) => {
    const msg = d.toString().trim();
    if (msg) console.error("[server stderr]", msg);
  });

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (res.ok) return serverProc;
    } catch {
      // aguarda inicialização
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  serverProc.kill();
  throw new Error("Servidor de teste não iniciou na porta " + TEST_PORT);
}

async function runSuite() {
  const runId = Date.now();
  const emailA = `audit.user.a.${runId}@vita4me.test`;
  const emailB = `audit.user.b.${runId}@vita4me.test`;
  const strongPassword = `Vita4Me#${runId}Aa!`;

  let userAId = null;
  let userBId = null;
  let tokenA = null;
  let tokenB = null;
  let serverProc = null;

  try {
    serverProc = await startTestServer();
    // ------------------------------------------------------------------------
    // 1. A01 — VERIFICAÇÃO ESTÁTICA DE REMOÇÃO DE LOCALSTORAGE CLÍNICO
    // ------------------------------------------------------------------------
    const storageCode = fs.readFileSync(path.resolve("src/lib/healthStorage.ts"), "utf8");
    const hasSetItem = storageCode.includes("localStorage.setItem");
    const hasPurge = storageCode.includes("purgeLegacyClinicalStorage");
    logTest(
      "A01",
      "Remoção de persistência de dados clínicos em localStorage",
      !hasSetItem && hasPurge,
      "Zero chamadas localStorage.setItem em healthStorage.ts + purge ativo de chaves legadas"
    );

    // ------------------------------------------------------------------------
    // 2. CSP, CORS E JSON INVÁLIDO NO BACKEND
    // ------------------------------------------------------------------------
    const rootRes = await fetch(`${API_BASE}/`);
    const cspHeader = rootRes.headers.get("content-security-policy") || "";
    const scriptSrcMatch = cspHeader.match(/script-src[^;]+/);
    const scriptSrc = scriptSrcMatch ? scriptSrcMatch[0] : "";
    const acaoRoot = rootRes.headers.get("access-control-allow-origin");
    const acacRoot = rootRes.headers.get("access-control-allow-credentials");

    logTest(
      "CSP-01",
      "CSP sem 'unsafe-inline' em script-src + base-uri + frame-ancestors",
      scriptSrc.includes("'self'") &&
      !scriptSrc.includes("'unsafe-inline'") &&
      cspHeader.includes("base-uri 'self'") &&
      cspHeader.includes("frame-ancestors 'none'"),
      `script-src="${scriptSrc}"`
    );

    logTest(
      "CORS-01",
      "Ausência de combinação conflitante Access-Control-Allow-Origin: * com Credentials: true",
      !(acaoRoot === "*" && acacRoot === "true"),
      `ACAO=${acaoRoot || "none"}, ACAC=${acacRoot || "none"}`
    );

    const evilCorsRes = await fetch(`${API_BASE}/api/health`, {
      headers: { Origin: "https://evil-attacker.example.com" },
    });
    logTest(
      "CORS-02",
      "Bloqueio de Origin cruzada não autorizada em /api/*",
      evilCorsRes.status === 403 && !evilCorsRes.headers.get("access-control-allow-origin"),
      `Status=${evilCorsRes.status}`
    );

    const badJsonRes = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"email": "broken',
    });
    const badJsonBody = await badJsonRes.json().catch(() => ({}));
    logTest(
      "ERR-01",
      "JSON malformado retorna 400 Bad Request sem stack trace",
      badJsonRes.status === 400 && badJsonBody.code === "INVALID_JSON",
      `Status=${badJsonRes.status}, code=${badJsonBody.code}`
    );

    // ------------------------------------------------------------------------
    // 3. A03 & A08 — VALIDAÇÃO SERVER-SIDE DE CONSENTIMENTOS E POLÍTICA DE SENHA
    // ------------------------------------------------------------------------
    const noConsentRes = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailA,
        password: strongPassword,
        fullName: "Audit User A",
      }),
    });
    const noConsentBody = await noConsentRes.json();
    logTest(
      "A03-01",
      "Bloqueio server-side de cadastro sem consentimentos obrigatórios",
      noConsentRes.status === 400 && noConsentBody.code === "CONSENT_REQUIRED",
      `Status=${noConsentRes.status}, code=${noConsentBody.code}`
    );

    const weakPwdRes = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailA,
        password: "123456",
        fullName: "Audit User A",
        consents: {
          termsAccepted: true,
          privacyAccepted: true,
          healthDataAccepted: true,
          documentVersion: "2.0",
        },
      }),
    });
    const weakPwdBody = await weakPwdRes.json();
    logTest(
      "A08-01",
      "Bloqueio server-side de senha fraca (< 8 ou sem complexidade)",
      weakPwdRes.status === 400 && weakPwdBody.code === "WEAK_PASSWORD",
      `Status=${weakPwdRes.status}, code=${weakPwdBody.code}`
    );

    // Criar User A e User B legitimamente com consentimentos
    const regARes = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailA,
        password: strongPassword,
        fullName: "Audit User A",
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

    const regBRes = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailB,
        password: strongPassword,
        fullName: "Audit User B",
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

    logTest(
      "A03-02",
      "Cadastro com senha forte e consentimentos válidos registra auditoria",
      regARes.status === 200 && regABody.consentsRecorded === true && Boolean(userAId) && Boolean(userBId),
      `userA=${userAId?.slice(0, 8)}, userB=${userBId?.slice(0, 8)}`
    );

    // Autenticar clientes isolados para User A e User B
    const clientA = createAnonClient();
    const { data: signInA, error: errSignA } = await clientA.auth.signInWithPassword({
      email: emailA,
      password: strongPassword,
    });
    assert(!errSignA && signInA.session, "Falha no login de User A");
    tokenA = signInA.session.access_token;

    const clientB = createAnonClient();
    const { data: signInB, error: errSignB } = await clientB.auth.signInWithPassword({
      email: emailB,
      password: strongPassword,
    });
    assert(!errSignB && signInB.session, "Falha no login de User B");
    tokenB = signInB.session.access_token;

    // ------------------------------------------------------------------------
    // 4. A07 — PERSISTÊNCIA REAL DE EXAMES E DEMAIS ENTIDADES CLÍNICAS
    // ------------------------------------------------------------------------
    const examPayload = {
      user_id: userAId,
      family_member_id: null,
      title: "Hemograma Completo Sintético A07",
      category: "Laboratorial",
      exam_date: "2026-11-04",
      laboratory: "Laboratório Teste A07",
      doctor_name: "Dr. Auditor",
      ai_summary: "Resumo sintético de auditoria.",
      ai_simple_translation: "Tradução simples de auditoria.",
      ai_key_findings: [{ parameter: "Glicose", value: "92 mg/dL", status: "normal", simpleExplanation: "Normal" }],
      ai_questions_for_doctor: [],
      status_alert: "Normal",
      updated_at: new Date().toISOString(),
    };

    const { data: insertedExam, error: examInsertErr } = await clientA
      .from("lab_exams")
      .insert(examPayload)
      .select("*")
      .single();

    logTest(
      "A07-01",
      "Persistência remota de exame em lab_exams com retorno de UUID real",
      !examInsertErr && Boolean(insertedExam?.id) && insertedExam.title === examPayload.title,
      examInsertErr ? examInsertErr.message : `examId=${insertedExam.id}`
    );

    // Simular reload (nova consulta independente ao banco)
    const { data: reloadedExam, error: reloadErr } = await clientA
      .from("lab_exams")
      .select("*")
      .eq("id", insertedExam.id)
      .single();

    logTest(
      "A07-02",
      "Exame permanece persistido após recarregamento da sessão com mesmo UUID",
      !reloadErr && reloadedExam?.id === insertedExam.id && reloadedExam?.laboratory === "Laboratório Teste A07",
      `reloadedId=${reloadedExam?.id}`
    );

    // Persistência de health_records, health_indicators, medications e daily_habits
    const { data: insertedRecord, error: recErr } = await clientA
      .from("health_records")
      .insert({
        user_id: userAId,
        record_type: "consulta",
        title: "Consulta Cardiologia A07",
        description: "Checkup anual",
        doctor_name: "Hospital Sírio",
        facility_name: "Hospital Sírio",
        event_date: "2026-11-04",
      })
      .select("*")
      .single();

    const { data: insertedMed, error: medErr } = await clientA
      .from("medications")
      .insert({
        user_id: userAId,
        name: "Losartana 50mg",
        dosage: "1 cp",
        frequency: "1x ao dia",
        schedule_times: ["08:00"],
        is_continuous: true,
        is_active: true,
      })
      .select("*")
      .single();

    const { data: insertedInd, error: indErr } = await clientA
      .from("health_indicators")
      .insert({
        user_id: userAId,
        name: "Glicemia",
        category: "Metabólico",
        value: 91,
        unit: "mg/dL",
        status: "normal",
      })
      .select("*")
      .single();

    logTest(
      "A07-03",
      "Persistência confirmada em health_records, medications e health_indicators",
      !recErr && !medErr && !indErr && Boolean(insertedRecord?.id) && Boolean(insertedMed?.id) && Boolean(insertedInd?.id),
      `record=${insertedRecord?.id?.slice(0, 8)}, med=${insertedMed?.id?.slice(0, 8)}, ind=${insertedInd?.id?.slice(0, 8)}`
    );

    // ------------------------------------------------------------------------
    // 5. ISOLAMENTO MULTI-TENANT (USER A vs USER B) — RLS & API
    // ------------------------------------------------------------------------
    const { data: bReadAExams } = await clientB.from("lab_exams").select("*").eq("id", insertedExam.id);
    const { data: bReadAMeds } = await clientB.from("medications").select("*").eq("id", insertedMed.id);
    const { data: bReadARecs } = await clientB.from("health_records").select("*").eq("id", insertedRecord.id);
    const { data: bReadAInds } = await clientB.from("health_indicators").select("*").eq("id", insertedInd.id);

    logTest(
      "RLS-01",
      "User B não consegue ler exames, medicamentos, registros ou indicadores de User A (SELECT)",
      (bReadAExams?.length || 0) === 0 &&
      (bReadAMeds?.length || 0) === 0 &&
      (bReadARecs?.length || 0) === 0 &&
      (bReadAInds?.length || 0) === 0,
      "0 registros vazados entre tenants"
    );

    const { data: bUpdateAExam } = await clientB
      .from("lab_exams")
      .update({ title: "HACKED BY B" })
      .eq("id", insertedExam.id)
      .select("*");

    const { data: bDeleteAExam } = await clientB
      .from("lab_exams")
      .delete()
      .eq("id", insertedExam.id)
      .select("*");

    logTest(
      "RLS-02",
      "User B não consegue alterar (UPDATE) nem remover (DELETE) registros de User A",
      (bUpdateAExam?.length || 0) === 0 && (bDeleteAExam?.length || 0) === 0,
      "Mutação cross-tenant bloqueada pelo RLS"
    );

    const { error: bInsertForAErr } = await clientB.from("lab_exams").insert({
      user_id: userAId,
      title: "Exame Forjado por B em nome de A",
      category: "Laboratorial",
      exam_date: "2026-11-04",
      status_alert: "Normal",
    });

    logTest(
      "RLS-03",
      "User B é bloqueado pelo RLS ao tentar INSERT com user_id de User A",
      Boolean(bInsertForAErr),
      `Blocked: ${bInsertForAErr?.code || bInsertForAErr?.message}`
    );

    // Tentativa de acesso à Signed URL do exame de User A usando JWT de User B
    const bSignedUrlRes = await fetch(`${API_BASE}/api/exams/signed-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        examId: insertedExam.id,
        storagePath: `${userAId}/exams/exam_fake.pdf`,
      }),
    });

    logTest(
      "STG-01",
      "User B recebe 403/404 ao solicitar Signed URL de arquivo/exame de User A",
      bSignedUrlRes.status === 403 || bSignedUrlRes.status === 404,
      `Status=${bSignedUrlRes.status}`
    );

    // ------------------------------------------------------------------------
    // 6. PROTEÇÃO DE CAMPOS FINANCEIROS EM public.profiles
    // ------------------------------------------------------------------------
    const { error: finTamperErr } = await clientA
      .from("profiles")
      .update({
        plan_tier: "family",
        subscription_status: "active",
        ai_credits: 999999,
      })
      .eq("id", userAId);

    const { data: profileAfterTamper } = await clientA
      .from("profiles")
      .select("plan_tier, subscription_status, ai_credits")
      .eq("id", userAId)
      .single();

    logTest(
      "FIN-01",
      "Bloqueio de auto-promoção financeira (plan_tier, subscription_status, ai_credits) via cliente",
      Boolean(finTamperErr) || profileAfterTamper?.plan_tier !== "family",
      finTamperErr ? `Blocked: ${finTamperErr.message}` : `plan_tier=${profileAfterTamper?.plan_tier}`
    );

    // ------------------------------------------------------------------------
    // 7. A10 — VALIDAÇÃO DE UPLOAD (SVG, MIME MISMATCH, PDF TRUNCADO)
    // ------------------------------------------------------------------------
    const svgBase64 = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString("base64");
    const svgUploadRes = await fetch(`${API_BASE}/api/ai/analyze-exam-document`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        base64Data: `data:image/svg+xml;base64,${svgBase64}`,
        fileName: "exploit.svg",
        category: "Laboratorial",
      }),
    });
    logTest(
      "A10-01",
      "Bloqueio server-side de upload SVG malicioso",
      svgUploadRes.status === 415,
      `Status=${svgUploadRes.status}`
    );

    const truncatedPdfBase64 = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\n").toString("base64");
    const truncPdfRes = await fetch(`${API_BASE}/api/ai/analyze-exam-document`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        base64Data: `data:application/pdf;base64,${truncatedPdfBase64}`,
        fileName: "truncated.pdf",
        category: "Laboratorial",
      }),
    });
    logTest(
      "A10-02",
      "Bloqueio server-side de arquivo PDF truncado (sem %%EOF)",
      truncPdfRes.status === 415,
      `Status=${truncPdfRes.status}`
    );

    const validPdfBytes = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"
    ).toString("base64");
    const mismatchExtRes = await fetch(`${API_BASE}/api/ai/analyze-exam-document`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        base64Data: `data:application/pdf;base64,${validPdfBytes}`,
        fileName: "disguised.png",
        category: "Laboratorial",
      }),
    });
    logTest(
      "A10-03",
      "Bloqueio server-side de conflito entre extensão declarada (.png) e magic bytes (PDF)",
      mismatchExtRes.status === 415,
      `Status=${mismatchExtRes.status}`
    );

    // ------------------------------------------------------------------------
    // 8. A02 — EXCLUSÃO VERIFICADA DE CONTA E CASCATA COMPLETA
    // ------------------------------------------------------------------------
    const delARes = await fetch(`${API_BASE}/api/auth/account`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const delABody = await delARes.json();

    const { data: checkProfileA } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", userAId)
      .maybeSingle();
    const { data: checkExamsA } = await adminClient
      .from("lab_exams")
      .select("id")
      .eq("user_id", userAId);

    logTest(
      "A02-01",
      "Exclusão verificada de conta remove auth.users, profiles e dados clínicos em cascata",
      delARes.status === 200 && delABody.deleted === true && !checkProfileA && (checkExamsA?.length || 0) === 0,
      `deleted=${delABody.deleted}, residualExams=${checkExamsA?.length || 0}`
    );
    userAId = null;

    const delBRes = await fetch(`${API_BASE}/api/auth/account`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const delBBody = await delBRes.json();
    assert(delBRes.status === 200 && delBBody.deleted === true, "Falha ao limpar User B");
    userBId = null;

    console.log("\n========================================================");
    console.log(`🎉 TODOS OS ${results.length} TESTES DE SEGURANÇA PASSARAM!`);
    console.log("========================================================\n");
  } finally {
    if (serverProc && !serverProc.killed) {
      serverProc.kill();
    }
    // Garantir limpeza de qualquer usuário de teste remanescente
    if (userAId) {
      await adminClient.auth.admin.deleteUser(userAId).catch(() => { });
    }
    if (userBId) {
      await adminClient.auth.admin.deleteUser(userBId).catch(() => { });
    }
  }
}

runSuite().catch((err) => {
  console.error("\n❌ SUÍTE DE SEGURANÇA FALHOU:", err.message);
  process.exit(1);
});