export type ExamDrawerFileType = "PDF" | "JPG" | "PNG" | "WEBP" | "ARQUIVO";
export type DrawerSortOrder = "newest" | "oldest";

export interface ExamDrawerItem {
  examId: string;
  familyMemberId: string | null;
  title: string;
  category: string;
  examDate: string | null;
  laboratory: string | null;
  doctorName: string | null;
  description: string | null;
  fileType: ExamDrawerFileType;
  mimeType: string;
  fileExtension: string;
  fileSize: number | null;
  uploadedAt: string | null;
  createdAt: string;
  isAvailable: boolean;
}

export function formatExamFileSize(bytes?: number | null): string {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) {
    return "Tamanho não informado";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2).replace(".", ",")} MB`;
}

export function formatDrawerDate(value?: string | null, locale = "pt-BR"): string {
  if (!value) return "Data não informada";
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, y, m, d] = dateOnlyMatch;
    const localDate = new Date(Number(y), Number(m) - 1, Number(d));
    return localDate.toLocaleDateString(locale);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(locale);
}

export function isImageDocumentMime(mimeType?: string | null, fileType?: string | null): boolean {
  const mime = (mimeType || "").toLowerCase();
  if (mime.startsWith("image/") && !mime.includes("svg")) return true;
  return fileType === "JPG" || fileType === "PNG" || fileType === "WEBP";
}

export function filterAndSortDrawerItems(
  items: ExamDrawerItem[],
  options: {
    searchTerm: string;
    category: string;
    memberFilter: string;
    sortOrder: DrawerSortOrder;
  }
): ExamDrawerItem[] {
  const term = options.searchTerm.trim().toLowerCase();

  return items
    .filter((item) => {
      if (options.memberFilter !== "all") {
        if (options.memberFilter === "fam-me") {
          if (item.familyMemberId && item.familyMemberId !== "fam-me") return false;
        } else if (item.familyMemberId !== options.memberFilter) {
          return false;
        }
      }

      if (options.category !== "Todas" && item.category !== options.category) {
        return false;
      }

      if (!term) return true;

      return (
        item.title.toLowerCase().includes(term) ||
        (item.laboratory || "").toLowerCase().includes(term) ||
        (item.doctorName || "").toLowerCase().includes(term) ||
        (item.description || "").toLowerCase().includes(term) ||
        item.fileType.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      const timeA = new Date(a.examDate || a.uploadedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.examDate || b.uploadedAt || b.createdAt || 0).getTime();
      return options.sortOrder === "oldest" ? timeA - timeB : timeB - timeA;
    });
}
