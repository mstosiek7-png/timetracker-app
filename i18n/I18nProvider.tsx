import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, strings, StringKey } from './strings';

const STORAGE_KEY = 'timetracker:language';

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: StringKey) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('pl');

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'pl' || stored === 'de') {
          setLanguageState(stored);
        }
      } catch (error) {
        console.warn('Nie udalo sie odczytac jezyka:', error);
      }
    };
    loadLanguage();
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang).catch((error) => {
      console.warn('Nie udalo sie zapisac jezyka:', error);
    });
  }, []);

  const t = useCallback((key: StringKey) => strings[language][key] ?? key, [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
