import path from "path";

export interface ExamDeletionRecord {
  id: string;
  user_id: string;
  family_member_id: string | null;
  file_url: string | null;
}

export interface ExamDeletionRepo {
  findExamById(examId: string): Promise<{ data: ExamDeletionRecord | null; error?: string | null }>;
  findFamilyMemberOwner(memberId: string): Promise<{ ownerUserId: string | null; error?: string | null }>;
  removeCloudStorageObject(storagePath: string): Promise<{ ok: boolean; error?: string | null }>;
  removeLocalVaultObject(storagePath: string): Promise<{ ok: boolean; error?: string | null }>;
  deleteExamRow(examId: string, userId: string): Promise<{ deleted: boolean; error?: string | null }>;
  recordAudit(params: {
    userId: string;
    eventType: string;
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

export type DeleteExamResult =
  | {
      ok: true;
      status: 200;
      deletedExamId: string;
      storageDeleted: boolean;
      requestId: string;
    }
  | {
      ok: false;
      status: 400 | 403 | 404 | 500 | 502;
      code: string;
      message: string;
      requestId: string;
    };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sanitizeOwnedExamStoragePath(userId: string, rawPath: string): string | null {
  if (!userId || !rawPath || typeof rawPath !== "string") return null;
  const trimmed = rawPath.trim().replace(/^medical-documents\//, "").replace(/\\/g, "/");
  if (trimmed.includes("..") || trimmed.startsWith("/")) return null;
  const normalized = path.posix.normalize(trimmed);
  const strictPattern = new RegExp(`^${userId}/exams/exam_[0-9a-f-]+\\.(pdf|jpg|jpeg|png|webp)$`, "i");
  if (!strictPattern.test(normalized)) return null;
  return normalized;
}

export async function deleteExamWithStorage(params: {
  userId: string;
  examId: string;
  requestId: string;
  repo: ExamDeletionRepo;
}): Promise<DeleteExamResult> {
  const { userId, examId, requestId, repo } = params;

  if (!examId || !UUID_REGEX.test(examId)) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_EXAM_ID",
      message: "Identificador de exame inválido.",
      requestId,
    };
  }

  const found = await repo.findExamById(examId);
  if (found.error) {
    return {
      ok: false,
      status: 500,
      code: "EXAM_LOOKUP_FAILED",
      message: "Erro ao consultar o exame para exclusão.",
      requestId,
    };
  }

  const exam = found.data;
  if (!exam) {
    return {
      ok: false,
      status: 404,
      code: "EXAM_NOT_FOUND",
      message: "Exame não encontrado.",
      requestId,
    };
  }

  if (exam.user_id !== userId) {
    await repo.recordAudit({
      userId,
      eventType: "exam_delete_denied",
      resourceType: "lab_exam",
      resourceId: examId,
      metadata: { reason: "cross_tenant_owner_mismatch", requestId },
    });
    return {
      ok: false,
      status: 403,
      code: "ACCESS_DENIED",
      message: "Você não tem permissão para excluir este exame.",
      requestId,
    };
  }

  if (exam.family_member_id) {
    const memberCheck = await repo.findFamilyMemberOwner(exam.family_member_id);
    if (memberCheck.error || !memberCheck.ownerUserId || memberCheck.ownerUserId !== userId) {
      await repo.recordAudit({
        userId,
        eventType: "exam_delete_denied",
        resourceType: "lab_exam",
        resourceId: examId,
        metadata: { reason: "family_member_owner_mismatch", requestId },
      });
      return {
        ok: false,
        status: 403,
        code: "ACCESS_DENIED",
        message: "Vínculo de perfil familiar não autorizado para exclusão.",
        requestId,
      };
    }
  }

  let safeStoragePath: string | null = null;
  if (exam.file_url && typeof exam.file_url === "string" && exam.file_url.trim().length > 0) {
    safeStoragePath = sanitizeOwnedExamStoragePath(userId, exam.file_url);
    if (!safeStoragePath) {
      await repo.recordAudit({
        userId,
        eventType: "exam_delete_failed",
        resourceType: "lab_exam",
        resourceId: examId,
        metadata: { reason: "invalid_storage_path", requestId },
      });
      return {
        ok: false,
        status: 403,
        code: "INVALID_STORAGE_PATH",
        message: "Caminho de armazenamento inválido ou não pertencente ao titular.",
        requestId,
      };
    }

    // Remove o arquivo original antes de excluir o registro no banco para garantir atomicidade lógica
    // (se o Storage falhar, o registro em lab_exams permanece intacto e o usuário recebe erro explícito).
    const cloudRemoval = await repo.removeCloudStorageObject(safeStoragePath);
    if (!cloudRemoval.ok) {
      await repo.recordAudit({
        userId,
        eventType: "exam_delete_failed",
        resourceType: "lab_exam",
        resourceId: examId,
        metadata: { reason: "cloud_storage_delete_failed", requestId },
      });
      return {
        ok: false,
        status: 502,
        code: "STORAGE_DELETE_FAILED",
        message: "Não foi possível remover o arquivo original do armazenamento seguro. O exame foi preservado; tente novamente.",
        requestId,
      };
    }

    const localRemoval = await repo.removeLocalVaultObject(safeStoragePath);
    if (!localRemoval.ok) {
      await repo.recordAudit({
        userId,
        eventType: "exam_delete_failed",
        resourceType: "lab_exam",
        resourceId: examId,
        metadata: { reason: "local_vault_delete_failed", requestId },
      });
      return {
        ok: false,
        status: 500,
        code: "LOCAL_VAULT_DELETE_FAILED",
        message: "Falha ao remover cópia do cofre seguro. Tente novamente.",
        requestId,
      };
    }
  }

  const dbDelete = await repo.deleteExamRow(examId, userId);
  if (!dbDelete.deleted || dbDelete.error) {
    await repo.recordAudit({
      userId,
      eventType: "exam_delete_failed",
      resourceType: "lab_exam",
      resourceId: examId,
      metadata: {
        reason: "db_delete_failed",
        storageDeleted: Boolean(safeStoragePath),
        requestId,
      },
    });
    return {
      ok: false,
      status: 500,
      code: "DB_DELETE_FAILED",
      message: "Não foi possível concluir a remoção do registro do exame.",
      requestId,
    };
  }

  await repo.recordAudit({
    userId,
    eventType: "exam_deleted",
    resourceType: "lab_exam",
    resourceId: examId,
    metadata: {
      hadFile: Boolean(exam.file_url),
      storageDeleted: Boolean(safeStoragePath),
      requestId,
    },
  });

  return {
    ok: true,
    status: 200,
    deletedExamId: examId,
    storageDeleted: Boolean(safeStoragePath),
    requestId,
  };
}
