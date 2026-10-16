import React, { useState, useRef, useEffect } from 'react';
import { Coins, ChevronDown, Check, Edit3 } from 'lucide-react';
import { useLanguage, PRESET_CURRENCIES } from '../i18n/LanguageContext';
import { playClickSound } from '../utils/audio';

export const CurrencySelector: React.FC = () => {
  const { currencySymbol, setCurrencySymbol } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCustomMode(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPreset = (symbol: string) => {
    playClickSound();
    setCurrencySymbol(symbol);
    setIsOpen(false);
    setIsCustomMode(false);
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      playClickSound();
      setCurrencySymbol(customInput.trim());
      setIsOpen(false);
      setIsCustomMode(false);
      setCustomInput('');
    }
  };

  const matchedPreset = PRESET_CURRENCIES.find((c) => c.symbol === currencySymbol);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        id="currency-selector-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        title="Select Currency / کرنسی منتخب کریں"
      >
        <Coins className="w-3.5 h-3.5 text-amber-600" />
        <span className="font-mono text-xs">{currencySymbol}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-52 rounded-2xl bg-white border border-slate-200 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3.5 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-100 mb-1 flex items-center justify-between">
            <span>Currency / کرنسی</span>
            <span className="font-mono text-emerald-600 font-bold">{currencySymbol}</span>
          </div>

          <div className="space-y-0.5 px-1">
            {PRESET_CURRENCIES.map((item) => {
              const isSelected = currencySymbol === item.symbol;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleSelectPreset(item.symbol)}
                  className={`w-full px-3 py-2 text-xs rounded-xl flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-800 font-bold'
                      : 'text-slate-700 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{item.flag}</span>
                    <span>{item.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              );
            })}

            {/* Custom Symbol Option */}
            {!isCustomMode ? (
              <button
                type="button"
                onClick={() => {
                  setIsCustomMode(true);
                  setCustomInput(currencySymbol);
                }}
                className={`w-full px-3 py-2 text-xs rounded-xl flex items-center justify-between transition-colors ${
                  !matchedPreset
                    ? 'bg-amber-50 text-amber-800 font-bold'
                    : 'text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Custom Symbol {!matchedPreset && `(${currencySymbol})`}</span>
                </div>
                {!matchedPreset && <Check className="w-3.5 h-3.5 text-amber-600" />}
              </button>
            ) : (
              <form onSubmit={handleApplyCustom} className="p-2 bg-slate-50 rounded-xl space-y-1.5 mt-1 border border-slate-200">
                <label className="text-[10px] font-bold text-slate-600 block">
                  Enter Custom Symbol (e.g. SAR, £, CAD):
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Symbol"
                    className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg"
                  >
                    Apply
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
