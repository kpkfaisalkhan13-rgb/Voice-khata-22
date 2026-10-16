import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';
import { playClickSound } from '../utils/audio';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages: { code: Language; label: string; nativeLabel: string }[] = [
    { code: 'ur', label: 'Urdu', nativeLabel: 'اردو' },
    { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
    { code: 'en', label: 'English', nativeLabel: 'English' },
    { code: 'ru', label: 'Roman Urdu', nativeLabel: 'Roman Urdu' },
  ];

  const currentLang = languages.find((l) => l.code === language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: Language) => {
    playClickSound();
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        id="language-selector-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
      >
        <Globe className="w-3.5 h-3.5 text-emerald-600" />
        <span className={language === 'ur' ? 'font-urdu text-sm' : 'font-medium'}>
          {currentLang.nativeLabel}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-44 rounded-2xl bg-white border border-slate-200 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-100 mb-1">
            Select Language / زبان منتخب کریں
          </div>
          {languages.map((item) => {
            const isSelected = item.code === language;
            return (
              <button
                key={item.code}
                id={`lang-option-${item.code}`}
                onClick={() => handleSelect(item.code)}
                className={`w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-emerald-50/70 transition-colors ${
                  isSelected ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-700 font-medium'
                }`}
              >
                <div className="flex flex-col text-left">
                  <span className={item.code === 'ur' ? 'font-urdu text-sm' : ''}>
                    {item.nativeLabel}
                  </span>
                  {item.code !== 'en' && item.code !== item.label && (
                    <span className="text-[10px] text-slate-400">{item.label}</span>
                  )}
                </div>
                {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
