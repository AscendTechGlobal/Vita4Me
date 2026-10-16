import React, { createContext, useContext, useState, useEffect } from "react";
import { Language, TranslationDictionary, translations } from "../i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyPath: string, fallback?: string) => string;
  dictionary: TranslationDictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "vita4me_language_v1";

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
        if (saved && (saved === "pt" || saved === "en" || saved === "es")) {
          return saved;
        }
        const browserLang = navigator.language?.toLowerCase() || "";
        if (browserLang.startsWith("es")) return "es";
        if (browserLang.startsWith("en")) return "en";
      } catch (e) {
        // Fallback seguro
      }
    }
    return "pt";
  });

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, newLang);
        document.documentElement.lang = newLang;
      } catch (e) {
        // Silencioso
      }
    }
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const dictionary = translations[language] || translations.pt;

  // Função helper para acessar chaves aninhadas por string (ex: t('common.save'))
  const t = (keyPath: string, fallback?: string): string => {
    const parts = keyPath.split(".");
    let current: any = dictionary;

    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        // Fallback para português caso falte a chave
        let fallbackVal: any = translations.pt;
        for (const fPart of parts) {
          if (fallbackVal && typeof fallbackVal === "object" && fPart in fallbackVal) {
            fallbackVal = fallbackVal[fPart];
          } else {
            fallbackVal = undefined;
            break;
          }
        }
        return typeof fallbackVal === "string" ? fallbackVal : (fallback || keyPath);
      }
    }

    return typeof current === "string" ? current : (fallback || keyPath);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dictionary }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage deve ser usado dentro de um LanguageProvider");
  }
  return context;
};
