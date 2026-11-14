import React, { useMemo } from "react";
import {
  ArrowUpDown,
  Building2,
  Calendar,
  Clock,
  Download,
  Eye,
  FileImage,
  FileText,
  FolderArchive,
  HardDrive,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
  User,
  Users,
} from "lucide-react";
import { FamilyMember } from "../types";
import {
  DrawerSortOrder,
  ExamDrawerItem,
  filterAndSortDrawerItems,
  formatDrawerDate,
  formatExamFileSize,
  isImageDocumentMime,
} from "../lib/examDocumentUtils";

interface ExamDrawerViewProps {
  items: ExamDrawerItem[];
  isLoading: boolean;
  errorMsg: string | null;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  selectedMemberFilter: string;
  onSelectMemberFilter: (memberId: string) => void;
  sortOrder: DrawerSortOrder;
  onSortOrderChange: (order: DrawerSortOrder) => void;
  familyMembers: FamilyMember[];
  totalExamsCount: number;
  activeActionExamId: string | null;
  onRefreshDrawer: () => void;
  onOpenUploadModal: () => void;
  onOpenDocument: (item: ExamDrawerItem) => void;
  onDownloadDocument: (item: ExamDrawerItem) => void;
  onOpenRelatedExam: (examId: string) => void;
}

const CATEGORIES = ["Todas", "Laboratorial", "Imagem", "Cardiológico", "Genético", "Outro"];

export const ExamDrawerView: React.FC<ExamDrawerViewProps> = ({
  items,
  isLoading,
  errorMsg,
  searchTerm,
  onSearchTermChange,
  selectedCategory,
  onSelectCategory,
  selectedMemberFilter,
  onSelectMemberFilter,
  sortOrder,
  onSortOrderChange,
  familyMembers,
  totalExamsCount,
  activeActionExamId,
  onRefreshDrawer,
  onOpenUploadModal,
  onOpenDocument,
  onDownloadDocument,
  onOpenRelatedExam,
}) => {
  const filteredItems = useMemo(
    () =>
      filterAndSortDrawerItems(items, {
        searchTerm,
        category: selectedCategory,
        memberFilter: selectedMemberFilter,
        sortOrder,
      }),
    [items, searchTerm, selectedCategory, selectedMemberFilter, sortOrder]
  );

  const stats = useMemo(() => {
    const pdfCount = items.filter((i) => i.fileType === "PDF").length;
    const imageCount = items.filter((i) => isImageDocumentMime(i.mimeType, i.fileType)).length;
    return { total: items.length, pdfCount, imageCount };
  }, [items]);

  const getMemberName = (familyMemberId: string | null): string => {
    if (!familyMemberId || familyMemberId === "fam-me") {
      const titular = familyMembers.find((m) => m.id === "fam-me" || m.relationship === "Titular");
      return titular?.name || "Titular (Você)";
    }
    const found = familyMembers.find((m) => m.id === familyMemberId);
    return found?.name || "Titular";
  };

  return (
    <div className="space-y-5">
      {/* Library Summary Strip */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <FolderArchive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Biblioteca Documental Privada</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono">
                {stats.total} {stats.total === 1 ? "arquivo" : "arquivos"}
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Acesse os PDFs e imagens originais vinculados aos seus laudos clínicos com links temporários criptografados.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <span className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300">
            {stats.pdfCount} PDF &bull; {stats.imageCount} Imagens
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Bucket Privado</span>
          </span>
          <button
            type="button"
            onClick={onRefreshDrawer}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer disabled:opacity-50"
            title="Atualizar Gaveta de Exames"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filters, Search & Sort */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col gap-3 shadow-xs">
        <div className="flex flex-col lg:flex-row gap-3 justify-between lg:items-center">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome, laboratório ou descrição..."
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="inline-flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 self-start sm:self-auto">
              <ArrowUpDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <label htmlFor="drawer-sort-select" className="sr-only">
                Ordenar documentos
              </label>
              <select
                id="drawer-sort-select"
                value={sortOrder}
                onChange={(e) => onSortOrderChange(e.target.value as DrawerSortOrder)}
                className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="newest" className="bg-white dark:bg-slate-900">
                  Mais recente
                </option>
                <option value="oldest" className="bg-white dark:bg-slate-900">
                  Mais antigo
                </option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {familyMembers.length > 1 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
              <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Perfil:</span>
            </span>
            <button
              type="button"
              onClick={() => onSelectMemberFilter("all")}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedMemberFilter === "all"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
              }`}
            >
              Todos ({items.length})
            </button>
            {familyMembers.map((m) => {
              const memberCount = items.filter((i) =>
                m.id === "fam-me" ? !i.familyMemberId || i.familyMemberId === "fam-me" : i.familyMemberId === m.id
              ).length;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectMemberFilter(m.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    selectedMemberFilter === m.id
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <span>{m.name}</span>
                  <span className="text-[10px] opacity-80 font-mono">({memberCount})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Error State */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-3">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={onRefreshDrawer}
            className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-[11px] cursor-pointer"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && items.length === 0 && (
        <div className="py-16 text-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400 mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Carregando documentos originais do cofre privado...
          </p>
        </div>
      )}

      {/* Documents Grid */}
      {(!isLoading || items.length > 0) && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const isImage = isImageDocumentMime(item.mimeType, item.fileType);
            const isBusy = activeActionExamId === item.examId;

            return (
              <div
                key={item.examId}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 p-5 rounded-3xl shadow-xs transition flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono font-bold uppercase">
                        {item.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border ${
                          isImage
                            ? "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                            : "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                        }`}
                      >
                        {item.fileType}
                      </span>
                      {familyMembers.length > 1 && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-700">
                          <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>{getMemberName(item.familyMemberId)}</span>
                        </span>
                      )}
                    </div>

                    <span className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 shrink-0">
                      {isImage ? <FileImage className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </span>
                  </div>

                  {/* Exam Title */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {item.title}
                  </h3>

                  {/* Structured File & Exam Metadata */}
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>
                        <strong>Data do exame:</strong> {formatDrawerDate(item.examDate)}
                      </span>
                    </div>
                    {item.laboratory && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="truncate">
                          <strong>Laboratório:</strong> {item.laboratory}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>
                        <strong>Tamanho:</strong> {formatExamFileSize(item.fileSize)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>
                        <strong>Enviado em:</strong> {formatDrawerDate(item.uploadedAt || item.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenDocument(item)}
                      disabled={isBusy}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>Abrir</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDownloadDocument(item)}
                      disabled={isBusy}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenRelatedExam(item.examId)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ver Análise Clínica Relacionada</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty States */}
      {!isLoading && filteredItems.length === 0 && (
        <div className="py-16 text-center space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
          <FolderArchive className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {items.length === 0
              ? "Nenhum arquivo original na Gaveta ainda"
              : "Nenhum documento corresponde aos filtros"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {items.length === 0
              ? totalExamsCount > 0
                ? "Os exames cadastrados manualmente sem anexo não possuem arquivo original. Envie um PDF ou imagem para guardá-lo com segurança na sua Gaveta."
                : "Envie seus exames laboratoriais ou de imagem em PDF, JPG, PNG ou WebP para organizar e acessar todos os originais aqui."
              : "Tente limpar o termo de busca ou selecionar outra categoria/perfil para encontrar seu documento."}
          </p>
          {items.length === 0 && (
            <button
              type="button"
              onClick={onOpenUploadModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition inline-flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Enviar Exame em PDF ou Imagem</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
