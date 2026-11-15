import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Language,
  TranslationKey,
  TranslationParams,
  getStoredLanguage,
  setStoredLanguage,
  getLanguageDir,
  translate,
  translateStatus,
  translateMethod,
  translateShift,
  translateMonth,
  translateServiceMessage,
  translatePlanText,
} from '../i18n';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  tStatus: (status?: string | null) => string;
  tMethod: (method?: string | null) => string;
  tShift: (shift?: string | null) => string;
  tMonth: (month?: string | null) => string;
  tServiceMsg: (msg?: string | null) => string;
  tPlanText: (text?: string | null) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => getStoredLanguage());

  const dir = getLanguageDir(language);
  const isRTL = dir === 'rtl';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = dir;
      document.documentElement.lang = language;
    }
    setStoredLanguage(language);
  }, [language, dir]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    setStoredLanguage(lang);
    if (typeof document !== 'undefined') {
      document.documentElement.dir = getLanguageDir(lang);
      document.documentElement.lang = lang;
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => translate(language, key, params),
    [language]
  );

  const tStatus = useCallback((status?: string | null) => translateStatus(language, status), [language]);
  const tMethod = useCallback((method?: string | null) => translateMethod(language, method), [language]);
  const tShift = useCallback((shift?: string | null) => translateShift(language, shift), [language]);
  const tMonth = useCallback((month?: string | null) => translateMonth(language, month), [language]);
  const tServiceMsg = useCallback((msg?: string | null) => translateServiceMessage(language, msg), [language]);
  const tPlanText = useCallback((text?: string | null) => translatePlanText(language, text), [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        dir,
        isRTL,
        t,
        tStatus,
        tMethod,
        tShift,
        tMonth,
        tServiceMsg,
        tPlanText,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
