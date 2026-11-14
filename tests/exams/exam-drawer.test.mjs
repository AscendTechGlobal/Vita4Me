import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  filterAndSortDrawerItems,
  formatDrawerDate,
  formatExamFileSize,
  isImageDocumentMime,
} from "../../src/lib/examDocumentUtils.ts";
import {
  deleteExamWithStorage,
  sanitizeOwnedExamStoragePath,
} from "../../src/server/exams/examDeletionService.ts";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

test("Utilitários da Gaveta formatam tamanhos, datas e identificam imagens vs PDF", () => {
  assert.equal(formatExamFileSize(null), "Tamanho não informado");
  assert.equal(formatExamFileSize(512), "512 B");
  assert.equal(formatExamFileSize(2048), "2,0 KB");
  assert.equal(formatExamFileSize(2 * 1024 * 1024), "2,00 MB");

  assert.equal(isImageDocumentMime("image/png", "PNG"), true);
  assert.equal(isImageDocumentMime("image/svg+xml", "ARQUIVO"), false);
  assert.equal(isImageDocumentMime("application/pdf", "PDF"), false);

  assert.match(formatDrawerDate("2026-11-10", "pt-BR"), /10\/11\/2026/);
});

test("Filtro, busca por nome/laboratório/descrição e ordenação da Gaveta funcionam corretamente", () => {
  const sample = [
    {
      examId: "1",
      familyMemberId: null,
      title: "Hemograma Completo",
      category: "Laboratorial",
      examDate: "2026-10-01",
      laboratory: "Fleury",
      doctorName: "Dra. Ana",
      description: "Contagem de glóbulos vermelhos e plaquetas",
      fileType: "PDF",
      mimeType: "application/pdf",
      fileExtension: "pdf",
      fileSize: 120400,
      uploadedAt: "2026-10-02T10:00:00Z",
      createdAt: "2026-10-02T10:00:00Z",
      isAvailable: true,
    },
    {
      examId: "2",
      familyMemberId: "fam-2",
      title: "Ressonância Joelho",
      category: "Imagem",
      examDate: "2026-11-12",
      laboratory: "Dasa",
      doctorName: "Dr. Carlos",
      description: "Sem lesões ligamentares agudas",
      fileType: "JPG",
      mimeType: "image/jpeg",
      fileExtension: "jpg",
      fileSize: 850000,
      uploadedAt: "2026-11-12T15:00:00Z",
      createdAt: "2026-11-12T15:00:00Z",
      isAvailable: true,
    },
  ];

  // Busca por descrição
  const byDesc = filterAndSortDrawerItems(sample, {
    searchTerm: "ligamentares",
    category: "Todas",
    memberFilter: "all",
    sortOrder: "newest",
  });
  assert.equal(byDesc.length, 1);
  assert.equal(byDesc[0].examId, "2");

  // Filtro por categoria + membro
  const byCategory = filterAndSortDrawerItems(sample, {
    searchTerm: "",
    category: "Laboratorial",
    memberFilter: "fam-me",
    sortOrder: "newest",
  });
  assert.equal(byCategory.length, 1);
  assert.equal(byCategory[0].examId, "1");

  // Ordenação mais antigo -> mais recente
  const oldestFirst = filterAndSortDrawerItems(sample, {
    searchTerm: "",
    category: "Todas",
    memberFilter: "all",
    sortOrder: "oldest",
  });
  assert.deepEqual(
    oldestFirst.map((i) => i.examId),
    ["1", "2"]
  );
});

test("Componentes da Central expõem as duas visualizações, não persistem signed URLs em localStorage e excluem via backend", () => {
  const centralSrc = fs.readFileSync(path.resolve("src/components/ExamsCentralView.tsx"), "utf8");
  const drawerSrc = fs.readFileSync(path.resolve("src/components/ExamDrawerView.tsx"), "utf8");
  const viewerSrc = fs.readFileSync(path.resolve("src/components/ExamDocumentViewerModal.tsx"), "utf8");
  const storageSrc = fs.readFileSync(path.resolve("src/lib/healthStorage.ts"), "utf8");

  assert.match(centralSrc, /Exames & Análises/);
  assert.match(centralSrc, /Gaveta de Exames/);
  assert.match(drawerSrc, /Abrir/);
  assert.match(drawerSrc, /Baixar/);
  assert.match(drawerSrc, /Ver Análise Clínica Relacionada/);
  assert.match(viewerSrc, /URL\.createObjectURL/);
  assert.match(viewerSrc, /URL\.revokeObjectURL/);

  assert.doesNotMatch(centralSrc, /localStorage\.setItem/);
  assert.doesNotMatch(drawerSrc, /localStorage\.setItem/);
  assert.doesNotMatch(viewerSrc, /localStorage\.setItem/);

  assert.match(storageSrc, /method:\s*'DELETE'/);
  assert.match(storageSrc, /\/api\/exams\/\$\{encodeURIComponent\(id\)\}/);
  assert.doesNotMatch(storageSrc, /from\(['"]lab_exams['"]\)\s*\.delete\(/);
});

test("Serviço de exclusão bloqueia falha simulada do Storage, path traversal e perfil familiar de outro usuário sem apagar banco", async () => {
  const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const otherUserId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const examId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const memberId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

  // Sanitizer bloqueia traversal
  assert.equal(sanitizeOwnedExamStoragePath(userId, `${userId}/../${otherUserId}/exams/exam_1.pdf`), null);
  assert.equal(sanitizeOwnedExamStoragePath(userId, `${userId}/exams/exam_1.svg`), null);
  assert.equal(
    sanitizeOwnedExamStoragePath(userId, `${userId}/exams/exam_11111111-1111-4111-8111-111111111111.pdf`),
    `${userId}/exams/exam_11111111-1111-4111-8111-111111111111.pdf`
  );

  // 1. Falha simulada do Storage -> não remove DB row e registra auditoria de falha
  let dbDeleteCalled = false;
  const auditEvents = [];
  const storageFailResult = await deleteExamWithStorage({
    userId,
    examId,
    requestId: "req-1",
    repo: {
      async findExamById() {
        return {
          data: {
            id: examId,
            user_id: userId,
            family_member_id: null,
            file_url: `${userId}/exams/exam_11111111-1111-4111-8111-111111111111.pdf`,
          },
        };
      },
      async findFamilyMemberOwner() {
        return { ownerUserId: userId };
      },
      async removeCloudStorageObject() {
        return { ok: false, error: "Simulated Storage outage" };
      },
      async removeLocalVaultObject() {
        return { ok: true };
      },
      async deleteExamRow() {
        dbDeleteCalled = true;
        return { deleted: true };
      },
      async recordAudit(entry) {
        auditEvents.push(entry);
      },
    },
  });
  assert.equal(storageFailResult.ok, false);
  assert.equal(storageFailResult.status, 502);
  assert.equal(storageFailResult.code, "STORAGE_DELETE_FAILED");
  assert.equal(dbDeleteCalled, false);
  assert.equal(auditEvents.at(-1)?.eventType, "exam_delete_failed");

  // 2. Perfil familiar pertencente a outro usuário -> bloqueia 403 antes de tocar Storage ou DB
  let storageCalledForForeignMember = false;
  const foreignMemberResult = await deleteExamWithStorage({
    userId,
    examId,
    requestId: "req-2",
    repo: {
      async findExamById() {
        return {
          data: {
            id: examId,
            user_id: userId,
            family_member_id: memberId,
            file_url: `${userId}/exams/exam_11111111-1111-4111-8111-111111111111.pdf`,
          },
        };
      },
      async findFamilyMemberOwner() {
        return { ownerUserId: otherUserId };
      },
      async removeCloudStorageObject() {
        storageCalledForForeignMember = true;
        return { ok: true };
      },
      async removeLocalVaultObject() {
        return { ok: true };
      },
      async deleteExamRow() {
        return { deleted: true };
      },
      async recordAudit(entry) {
        auditEvents.push(entry);
      },
    },
  });
  assert.equal(foreignMemberResult.ok, false);
  assert.equal(foreignMemberResult.status, 403);
  assert.equal(storageCalledForForeignMember, false);
  assert.equal(auditEvents.at(-1)?.eventType, "exam_delete_denied");

  // 3. file_url com path traversal no registro -> bloqueia 403 antes de remover Storage ou DB
  let storageCalledForTraversal = false;
  const traversalDbResult = await deleteExamWithStorage({
    userId,
    examId,
    requestId: "req-3",
    repo: {
      async findExamById() {
        return {
          data: {
            id: examId,
            user_id: userId,
            family_member_id: null,
            file_url: `${userId}/../${otherUserId}/exams/exam_11111111-1111-4111-8111-111111111111.pdf`,
          },
        };
      },
      async findFamilyMemberOwner() {
        return { ownerUserId: userId };
      },
      async removeCloudStorageObject() {
        storageCalledForTraversal = true;
        return { ok: true };
      },
      async removeLocalVaultObject() {
        return { ok: true };
      },
      async deleteExamRow() {
        return { deleted: true };
      },
      async recordAudit(entry) {
        auditEvents.push(entry);
      },
    },
  });
  assert.equal(traversalDbResult.ok, false);
  assert.equal(traversalDbResult.status, 403);
  assert.equal(traversalDbResult.code, "INVALID_STORAGE_PATH");
  assert.equal(storageCalledForTraversal, false);
});

test("Gaveta de Exames E2E: backend lista apenas arquivos do titular, bloqueia IDOR/traversal e gera signed URL curta", async (t) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    t.skip("Variáveis do Supabase ausentes no ambiente.");
    return;
  }
  if (!fs.existsSync(path.resolve("dist/server.cjs"))) {
    assert.fail("dist/server.cjs não encontrado — execute npm run build antes.");
  }

  const testPort = 18089;
  const apiBase = `http://127.0.0.1:${testPort}`;
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const stamp = Date.now();
  const emailA = `drawer.audit.a.${stamp}@vita4me-test.local`;
  const emailB = `drawer.audit.b.${stamp}@vita4me-test.local`;
  const password = `V4m!Audit#${stamp}`;
  let userAId = null;
  let userBId = null;
  let serverProc = null;

  try {
    serverProc = spawn("node", ["dist/server.cjs"], {
      env: { ...process.env, PORT: String(testPort), NODE_ENV: "production" },
      stdio: "ignore",
    });

    for (let i = 0; i < 30; i++) {
      try {
        const r = await fetch(`${apiBase}/api/health`);
        if (r.ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }

    const resA = await adminClient.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Drawer User A", consents_accepted_v2: true },
    });
    const resB = await adminClient.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Drawer User B", consents_accepted_v2: true },
    });
    userAId = resA.data.user.id;
    userBId = resB.data.user.id;

    const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const signInA = await clientA.auth.signInWithPassword({ email: emailA, password });
    const signInB = await clientB.auth.signInWithPassword({ email: emailB, password });
    const tokenA = signInA.data.session.access_token;
    const tokenB = signInB.data.session.access_token;

    // 1. Endpoint protegido exige autenticação
    const unauthRes = await fetch(`${apiBase}/api/exams/drawer`);
    assert.equal(unauthRes.status, 401);

    // 2. Promover apenas User A para plano 'family' (exclusivo para testar vínculo familiar) e inserir arquivo PDF privado
    await adminClient
      .from("profiles")
      .update({ plan_tier: "family", subscription_status: "active" })
      .eq("id", userAId);

    const { data: memberA, error: memErr } = await adminClient
      .from("family_members")
      .insert({ user_id: userAId, name: "Filho A", relationship: "Filho(a)" })
      .select("id")
      .single();
    assert.ifError(memErr);

    const fileId = "11111111-1111-4111-8111-111111111111";
    const storagePath = `${userAId}/exams/exam_${fileId}.pdf`;
    const samplePdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");

    const localDir = path.resolve("data", "medical-documents", userAId, "exams");
    fs.mkdirSync(localDir, { recursive: true });
    fs.writeFileSync(path.join(localDir, `exam_${fileId}.pdf`), samplePdf);
    await adminClient.storage.from("medical-documents").upload(storagePath, samplePdf, {
      contentType: "application/pdf",
      upsert: true,
    });

    const { data: examWithFile, error: examErr1 } = await adminClient
      .from("lab_exams")
      .insert({
        user_id: userAId,
        family_member_id: memberA.id,
        title: "Hemograma Original Gaveta",
        category: "Laboratorial",
        exam_date: "2026-11-10",
        laboratory: "Lab Teste",
        file_url: storagePath,
        ai_summary: "Resumo clínico de teste",
      })
      .select("id")
      .single();
    assert.ifError(examErr1);

    // Exame manual sem arquivo não deve entrar na Gaveta
    const { data: manualExam, error: examErr2 } = await adminClient
      .from("lab_exams")
      .insert({
        user_id: userAId,
        title: "Exame Manual Sem Anexo",
        category: "Outro",
        exam_date: "2026-11-11",
        file_url: null,
      })
      .select("id")
      .single();
    assert.ifError(examErr2);

    // 3. User A consulta a Gaveta: vê 1 item, sem path interno vazado
    const drawerResA = await fetch(`${apiBase}/api/exams/drawer`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(drawerResA.status, 200);
    const drawerBodyA = await drawerResA.json();
    assert.equal(drawerBodyA.items.length, 1);
    const itemA = drawerBodyA.items[0];
    assert.equal(itemA.examId, examWithFile.id);
    assert.equal(itemA.fileType, "PDF");
    assert.equal(itemA.mimeType, "application/pdf");
    assert.ok(itemA.fileSize >= samplePdf.length);
    assert.equal("file_url" in itemA, false);
    assert.equal(JSON.stringify(itemA).includes(`${userAId}/exams`), false);

    // 4. Signed URL view (<= 300s) retorna bytes PDF íntegros
    const signViewRes = await fetch(`${apiBase}/api/exams/signed-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ examId: examWithFile.id, mode: "view" }),
    });
    assert.equal(signViewRes.status, 200);
    const signViewBody = await signViewRes.json();
    assert.equal(signViewBody.expiresIn, 300);
    assert.ok(signViewBody.signedUrl);

    const fetchUrl = signViewBody.signedUrl.startsWith("/")
      ? `${apiBase}${signViewBody.signedUrl}`
      : signViewBody.signedUrl;
    const fetchedPdf = await fetch(fetchUrl);
    assert.equal(fetchedPdf.status, 200);
    const buf = Buffer.from(await fetchedPdf.arrayBuffer());
    assert.ok(buf.toString("latin1").startsWith("%PDF-"));

    // 5. User B NÃO enxerga o exame de User A e é bloqueado em todas as rotas (IDOR + traversal)
    const drawerResB = await fetch(`${apiBase}/api/exams/drawer`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(drawerResB.status, 200);
    const drawerBodyB = await drawerResB.json();
    assert.equal(drawerBodyB.items.length, 0);

    const memberIdorRes = await fetch(`${apiBase}/api/exams/drawer?familyMemberId=${memberA.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(memberIdorRes.status, 403);

    const idorSignRes = await fetch(`${apiBase}/api/exams/signed-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ examId: examWithFile.id, mode: "view" }),
    });
    assert.equal(idorSignRes.status, 403);

    const traversalRes = await fetch(`${apiBase}/api/exams/signed-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ storagePath: `${userBId}/../${storagePath}` }),
    });
    assert.equal(traversalRes.status, 403);

    // 6. Exclusão segura E2E (unauth, cross-tenant, inexistente, traversal, legítima c/ arquivo + s/ arquivo)
    const unauthDeleteRes = await fetch(`${apiBase}/api/exams/${examWithFile.id}`, {
      method: "DELETE",
    });
    assert.equal(unauthDeleteRes.status, 401);

    const invalidIdDeleteRes = await fetch(`${apiBase}/api/exams/not-a-uuid`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(invalidIdDeleteRes.status, 400);

    const notFoundDeleteRes = await fetch(`${apiBase}/api/exams/00000000-0000-4000-8000-000000000000`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(notFoundDeleteRes.status, 404);

    // Tentativa cross-tenant: User B tenta excluir exame de User A -> 403 e registro + arquivo seguem intactos
    const crossDeleteRes = await fetch(`${apiBase}/api/exams/${examWithFile.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(crossDeleteRes.status, 403);
    const { data: stillExistsAfterB } = await adminClient
      .from("lab_exams")
      .select("id")
      .eq("id", examWithFile.id)
      .maybeSingle();
    assert.equal(stillExistsAfterB?.id, examWithFile.id);

    // Exclusão legítima por User A de exame COM arquivo original
    const deleteFileExamRes = await fetch(`${apiBase}/api/exams/${examWithFile.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(deleteFileExamRes.status, 200);
    const deleteFileExamBody = await deleteFileExamRes.json();
    assert.equal(deleteFileExamBody.success, true);
    assert.equal(deleteFileExamBody.storageDeleted, true);

    // Confirma remoção da linha em lab_exams, desaparecimento na Gaveta e remoção física no Storage + local
    const { data: deletedDbRow } = await adminClient
      .from("lab_exams")
      .select("id")
      .eq("id", examWithFile.id)
      .maybeSingle();
    assert.equal(deletedDbRow, null);

    const drawerAfterDeleteRes = await fetch(`${apiBase}/api/exams/drawer`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const drawerAfterDeleteBody = await drawerAfterDeleteRes.json();
    assert.equal(drawerAfterDeleteBody.items.length, 0);

    const { data: listedAfterDelete } = await adminClient.storage
      .from("medical-documents")
      .list(`${userAId}/exams`, { limit: 100 });
    assert.equal((listedAfterDelete || []).some((obj) => obj.name === `exam_${fileId}.pdf`), false);
    assert.equal(fs.existsSync(path.join(localDir, `exam_${fileId}.pdf`)), false);

    // Exclusão legítima por User A de exame SEM arquivo original
    const deleteManualExamRes = await fetch(`${apiBase}/api/exams/${manualExam.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(deleteManualExamRes.status, 200);
    const deleteManualExamBody = await deleteManualExamRes.json();
    assert.equal(deleteManualExamBody.success, true);
    assert.equal(deleteManualExamBody.storageDeleted, false);

    const { data: deletedManualDbRow } = await adminClient
      .from("lab_exams")
      .select("id")
      .eq("id", manualExam.id)
      .maybeSingle();
    assert.equal(deletedManualDbRow, null);
  } finally {
    try { serverProc?.kill(); } catch {}
    if (userAId) {
      await adminClient.storage.from("medical-documents").remove([`${userAId}/exams/exam_11111111-1111-4111-8111-111111111111.pdf`]).catch(() => {});
      await adminClient.auth.admin.deleteUser(userAId).catch(() => {});
      try { fs.rmSync(path.resolve("data", "medical-documents", userAId), { recursive: true, force: true }); } catch {}
    }
    if (userBId) {
      await adminClient.auth.admin.deleteUser(userBId).catch(() => {});
    }
  }
});
