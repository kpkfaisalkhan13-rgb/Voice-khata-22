import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, Translations, translations } from './translations';

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
  label: string;
  flag?: string;
}

export const PRESET_CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', label: 'USD ($)', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', label: 'EUR (€)', flag: '🇪🇺' },
  { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee', label: 'PKR (Rs)', flag: '🇵🇰' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', label: 'INR (₹)', flag: '🇮🇳' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', label: 'AED (AED)', flag: '🇦🇪' },
];

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  currencySymbol: string;
  setCurrencySymbol: (curr: string) => void;
  formatCurrency: (amount: number) => string;
  t: Translations;
  isUrdu: boolean;
  isHindi: boolean;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const LANGUAGE_STORAGE_KEY = 'digikhata_preferred_language';
export const CURRENCY_STORAGE_KEY = 'digikhata_preferred_currency';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === 'en' || stored === 'ur' || stored === 'hi' || stored === 'ru') {
        return stored as Language;
      }
    } catch {
      // Ignore
    }
    return 'ur'; // Default to Urdu
  });

  const [currencySymbol, setCurrencySymbolState] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (stored && stored.trim()) {
        return stored.trim();
      }
    } catch {
      // Ignore
    }
    // Default by language: Urdu -> Rs, Hindi -> ₹, English -> $
    const storedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLang === 'hi') return '₹';
    if (storedLang === 'en') return '$';
    return 'Rs';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // Ignore
    }
  };

  const setCurrencySymbol = (curr: string) => {
    const clean = curr.trim() || 'Rs';
    setCurrencySymbolState(clean);
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, clean);
      // Also update voice_udhaar_settings_v1 if present in localStorage
      const settingsRaw = localStorage.getItem('voice_udhaar_settings_v1');
      if (settingsRaw) {
        try {
          const parsed = JSON.parse(settingsRaw);
          parsed.currency = clean;
          localStorage.setItem('voice_udhaar_settings_v1', JSON.stringify(parsed));
        } catch {
          // Ignore
        }
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    // Set html dir attribute if Urdu
    document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // Dynamically format any amount with selected currency symbol
  const formatCurrency = (amount: number): string => {
    const formatted = Math.abs(amount).toLocaleString();
    if (['$', '€', '£', '₹'].includes(currencySymbol)) {
      return `${currencySymbol}${formatted}`;
    }
    return `${formatted} ${currencySymbol}`;
  };

  // Base translation with currencyUnit dynamically overridden to active currencySymbol
  const baseTranslation = translations[language] || translations.en;
  const dynamicT: Translations = {
    ...baseTranslation,
    currencyUnit: currencySymbol,
  };

  const value: LanguageContextValue = {
    language,
    setLanguage,
    currencySymbol,
    setCurrencySymbol,
    formatCurrency,
    t: dynamicT,
    isUrdu: language === 'ur',
    isHindi: language === 'hi',
    isRtl: language === 'ur',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
};
