import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Download,
  ExternalLink,
  FileImage,
  FileText,
  Loader2,
  Lock,
  RotateCcw,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { getAuthHeaders } from "../lib/apiClient";
import {
  ExamDrawerItem,
  formatDrawerDate,
  formatExamFileSize,
  isImageDocumentMime,
} from "../lib/examDocumentUtils";

interface ExamDocumentViewerModalProps {
  item: ExamDrawerItem | null;
  onClose: () => void;
  onDownload: (item: ExamDrawerItem) => Promise<void>;
  onOpenAnalysis: (examId: string) => void;
}

export const ExamDocumentViewerModal: React.FC<ExamDocumentViewerModalProps> = ({
  item,
  onClose,
  onDownload,
  onOpenAnalysis,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [resolvedMime, setResolvedMime] = useState<string>("application/pdf");
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [zoomPercent, setZoomPercent] = useState(100);
  const activeBlobUrlRef = useRef<string | null>(null);

  const revokeCurrentBlob = () => {
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }
    setBlobUrl(null);
  };

  useEffect(() => {
    if (!item) {
      revokeCurrentBlob();
      return;
    }

    let cancelled = false;
    setZoomPercent(100);
    setErrorMsg(null);
    setIsLoading(true);
    revokeCurrentBlob();

    const loadSecureDocument = async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/exams/signed-url", {
          method: "POST",
          headers,
          body: JSON.stringify({ examId: item.examId, mode: "view" }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.message || errJson.error || "Acesso não autorizado ou arquivo indisponível.");
        }

        const payload = await res.json();
        const signedUrl = payload?.signedUrl;
        if (!signedUrl || typeof signedUrl !== "string") {
          throw new Error("Não foi possível obter URL temporária para o documento.");
        }

        const fileRes = await fetch(signedUrl);
        if (!fileRes.ok) {
          throw new Error("Não foi possível carregar o documento original no visualizador.");
        }

        const blob = await fileRes.blob();
        if (cancelled) return;

        const mime = (payload.mimeType || blob.type || item.mimeType || "application/pdf").toLowerCase();
        const typedBlob = blob.type ? blob : new Blob([blob], { type: mime });
        const nextBlobUrl = URL.createObjectURL(typedBlob);

        activeBlobUrlRef.current = nextBlobUrl;
        setResolvedMime(mime);
        setBlobUrl(nextBlobUrl);
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err?.message || "Erro ao carregar visualização segura do documento.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadSecureDocument();

    return () => {
      cancelled = true;
      revokeCurrentBlob();
    };
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  const isImage = isImageDocumentMime(resolvedMime || item.mimeType, item.fileType);

  const handleOpenInNewTab = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/exams/signed-url", {
        method: "POST",
        headers,
        body: JSON.stringify({ examId: item.examId, mode: "view" }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Não foi possível gerar link temporário.");
      }
      const { signedUrl } = await res.json();
      if (signedUrl) {
        window.open(signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Falha ao abrir documento em nova guia.");
    }
  };

  const handleDownloadClick = async () => {
    setIsDownloading(true);
    try {
      await onDownload(item);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Visualizador de documento: ${item.title}`}
    >
      <div className="w-full max-w-5xl h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/60">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              {isImage ? <FileImage className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono font-bold uppercase">
                  {item.fileType}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {formatExamFileSize(item.fileSize)} &bull; Exame: {formatDrawerDate(item.examDate)}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate mt-0.5">
                {item.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {isImage && blobUrl && (
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setZoomPercent((z) => Math.max(50, z - 25))}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Diminuir zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono font-bold px-1.5 text-slate-700 dark:text-slate-200">
                  {zoomPercent}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomPercent((z) => Math.min(250, z + 25))}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Aumentar zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomPercent(100)}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Resetar zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAnalysis(item.examId);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs font-bold transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Ver Análise</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadClick}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Baixar</span>
            </button>

            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
              title="Abrir em nova guia com URL assinada temporária"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Nova Guia</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Fechar visualizador"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 overflow-auto flex items-center justify-center p-4">
          {isLoading && (
            <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs font-medium">Descriptografando acesso temporário ao documento...</p>
            </div>
          )}

          {!isLoading && errorMsg && (
            <div className="max-w-md bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-6 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Não foi possível carregar a visualização interna
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">{errorMsg}</p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir em Nova Guia</span>
                </button>
              </div>
            </div>
          )}

          {!isLoading && !errorMsg && blobUrl && isImage && (
            <div className="w-full h-full overflow-auto flex items-center justify-center">
              <img
                src={blobUrl}
                alt={item.title}
                style={{ width: `${zoomPercent}%`, maxWidth: zoomPercent === 100 ? "100%" : "none" }}
                className="rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 object-contain transition-all duration-150 bg-white"
              />
            </div>
          )}

          {!isLoading && !errorMsg && blobUrl && !isImage && (
            <iframe
              src={blobUrl}
              title={`PDF: ${item.title}`}
              className="w-full h-full min-h-[420px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white shadow-sm"
            />
          )}
        </div>

        {/* Security Footer */}
        <div className="px-5 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Documento privado protegido por autenticação e assinatura temporária (5 min)</span>
          </span>
          {item.laboratory && (
            <span className="font-medium text-slate-600 dark:text-slate-300">
              Laboratório: {item.laboratory}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
