import { pt } from "./locales/pt";
import { en } from "./locales/en";
import { es } from "./locales/es";
import { Language, TranslationDictionary } from "./types";

export const translations: Record<Language, TranslationDictionary> = {
  pt,
  en,
  es,
};

export * from "./types";
