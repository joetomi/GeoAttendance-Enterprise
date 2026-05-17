import React, { createContext, useContext, useState, useEffect } from "react";
import { Language, translations } from "../constants/translations";

interface LanguageContextType {
  lang: Language;
  t: typeof translations.en;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem("app_lang") as Language) || "en");

  useEffect(() => {
    localStorage.setItem("app_lang", lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    window.dispatchEvent(new Event("languageChange"));
  }, [lang]);

  const value = {
    lang,
    t: translations[lang],
    setLanguage: setLang,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
