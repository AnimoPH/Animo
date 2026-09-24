import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import {
  WEB_TRANSLATIONS,
  type Language,
  type WebTranslationKey,
} from '@/i18n/translations';

const LANGUAGE_STORAGE_KEY = 'animo.web.language';

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: WebTranslationKey, params?: Record<string, string | number>) => string;
  isTagalog: boolean;
  isEnglish: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('tl');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'tl' || saved === 'en') {
        setLanguageState(saved);
      }
    } catch {
      // ignore storage access issue
    }
  }, []);

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
    } catch {
      // ignore storage access issue
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'tl' ? 'en' : 'tl');
  }, [language, setLanguage]);

  const t = useCallback(
    (key: WebTranslationKey, params?: Record<string, string | number>): string => {
      const dict = WEB_TRANSLATIONS[language] || WEB_TRANSLATIONS.tl;
      let text: string = dict[key] || WEB_TRANSLATIONS.tl[key] || key;

      if (params) {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
        });
      }

      return text;
    },
    [language],
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        isTagalog: language === 'tl',
        isEnglish: language === 'en',
      }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
