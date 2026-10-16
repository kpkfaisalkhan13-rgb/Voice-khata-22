import React, { useState } from 'react';
import {
  Globe,
  Coins,
  Store,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Check,
  Edit3,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage, PRESET_CURRENCIES } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';
import { CountryCode } from '../types';
import { playSuccessSound, playClickSound } from '../utils/audio';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (data: { language: Language; country: CountryCode; currency: string; businessName: string }) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const { language, setLanguage, currencySymbol, setCurrencySymbol, t } = useLanguage();

  // Multi-step Wizard: 1. language -> 2. currency -> 3. business
  const [currentStep, setCurrentStep] = useState<'language' | 'currency' | 'business'>('language');

  const [selectedLang, setSelectedLang] = useState<Language>(language || 'ur');
  const [selectedCurrency, setSelectedCurrency] = useState<string>(currencySymbol || 'Rs');
  const [isCustomCurrency, setIsCustomCurrency] = useState(false);
  const [customCurrencyInput, setCustomCurrencyInput] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('PK');
  const [businessName, setBusinessName] = useState('My Ledger / میرا کھاتہ');

  if (!isOpen) return null;

  const languagesList: { code: Language; name: string; native: string; desc: string; defaultCurrency: string; country: CountryCode }[] = [
    {
      code: 'ur',
      name: 'Urdu',
      native: 'اردو',
      desc: 'اردو زبان میں وائس کھاتہ، خودکار ادھار اور وصولی حساب کتاب',
      defaultCurrency: 'Rs',
      country: 'PK',
    },
    {
      code: 'en',
      name: 'English',
      native: 'English',
      desc: 'Voice ledger, customer debt & credit tracking in English',
      defaultCurrency: '$',
      country: 'US',
    },
    {
      code: 'hi',
      name: 'Hindi',
      native: 'हिन्दी',
      desc: 'आवाज से खाता, ग्राहक उधारी और वसूली हिसाब किताब हिन्दी में',
      defaultCurrency: '₹',
      country: 'IN',
    },
  ];

  const handleSelectLanguage = (item: (typeof languagesList)[0]) => {
    playClickSound();
    setSelectedLang(item.code);
    setLanguage(item.code);
    setSelectedCountry(item.country);
    // Set smart initial currency
    if (!isCustomCurrency) {
      setSelectedCurrency(item.defaultCurrency);
      setCurrencySymbol(item.defaultCurrency);
    }
    if (item.code === 'hi') {
      setBusinessName('My Ledger / मेरा खाता');
    } else if (item.code === 'en') {
      setBusinessName('My Ledger');
    } else {
      setBusinessName('My Ledger / میرا کھاتہ');
    }
  };

  const handleSelectCurrencyPreset = (symbol: string, code: string) => {
    playClickSound();
    setSelectedCurrency(symbol);
    setIsCustomCurrency(false);
    setCurrencySymbol(symbol);
    if (code === 'PKR') setSelectedCountry('PK');
    else if (code === 'INR') setSelectedCountry('IN');
    else if (code === 'USD' || code === 'EUR') setSelectedCountry('US');
  };

  const handleCustomCurrencyChange = (val: string) => {
    setCustomCurrencyInput(val);
    if (val.trim()) {
      setSelectedCurrency(val.trim());
      setCurrencySymbol(val.trim());
    }
  };

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();
    playSuccessSound();
    const finalCurrency = selectedCurrency.trim() || 'Rs';
    const finalBusinessName = businessName.trim() || (selectedLang === 'ur' ? 'میرا کھاتہ' : 'My Ledger');

    setCurrencySymbol(finalCurrency);
    setLanguage(selectedLang);

    onComplete({
      language: selectedLang,
      country: selectedCountry,
      currency: finalCurrency,
      businessName: finalBusinessName,
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden my-6 flex flex-col"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-slate-900 p-6 text-white text-center relative">
            <div className="inline-flex p-3 rounded-2xl bg-white/15 backdrop-blur-md mb-2.5 shadow-inner">
              <Sparkles className="w-7 h-7 text-emerald-200 animate-pulse" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight font-urdu">
              {currentStep === 'language'
                ? 'زبان کا انتخاب (Select Language)'
                : currentStep === 'currency'
                ? 'کرنسی منتخب کریں (Currency Setup)'
                : 'دکان و کاروبار کی تفصیل (Business Details)'}
            </h2>

            <p className="text-xs text-emerald-100 mt-1 max-w-sm mx-auto leading-relaxed">
              {currentStep === 'language'
                ? 'Choose your primary app language for Voice Khata and navigation'
                : currentStep === 'currency'
                ? 'Select the currency symbol used across all debt and credit ledger screens'
                : 'Personalize your ledger header and business profile'}
            </p>

            {/* Stepper progress indicator */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  currentStep === 'language' ? 'w-8 bg-white' : 'w-2 bg-white/40'
                }`}
              />
              <div
                className={`h-2 rounded-full transition-all ${
                  currentStep === 'currency' ? 'w-8 bg-white' : 'w-2 bg-white/40'
                }`}
              />
              <div
                className={`h-2 rounded-full transition-all ${
                  currentStep === 'business' ? 'w-8 bg-white' : 'w-2 bg-white/40'
                }`}
              />
            </div>
          </div>

          <div className="p-6">
            {/* ========================================================
                SCREEN 1: LANGUAGE SELECTION SCREEN
                ======================================================== */}
            {currentStep === 'language' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span>1. App Language / ایپ کی زبان منتخب کریں</span>
                </div>

                <div className="space-y-2.5">
                  {languagesList.map((item) => {
                    const isSelected = selectedLang === item.code;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => handleSelectLanguage(item)}
                        className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/90 shadow-sm ring-2 ring-emerald-500/20'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-slate-900 font-urdu">
                              {item.native}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                              ({item.name})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-normal">
                            {item.desc}
                          </p>
                        </div>

                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setCurrentStep('currency');
                    }}
                    className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Next: Select Currency / اگلا: کرنسی سیٹ کریں</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ========================================================
                SCREEN 2: CURRENCY SELECTION SCREEN (CURRENCY PICKER)
                ======================================================== */}
            {currentStep === 'currency' && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <span className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-600" />
                    <span>2. Currency Selection / کرنسی سیٹ اپ</span>
                  </span>
                  <span className="font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
                    Active: {selectedCurrency}
                  </span>
                </div>

                {/* 6 Picker Options: USD, EUR, PKR, INR, AED, Custom Symbol */}
                <div className="grid grid-cols-2 gap-2.5">
                  {PRESET_CURRENCIES.map((c) => {
                    const isSelected = !isCustomCurrency && selectedCurrency === c.symbol;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handleSelectCurrencyPreset(c.symbol, c.code)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/90 shadow-sm ring-2 ring-emerald-500/20'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-lg">{c.flag}</span>
                          <span className="text-sm font-black font-mono text-slate-900">
                            {c.symbol}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-800 mt-1">
                          {c.label}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {c.name}
                        </div>
                      </button>
                    );
                  })}

                  {/* 6th Option: Custom Symbol */}
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setIsCustomCurrency(true);
                      if (!customCurrencyInput) {
                        setCustomCurrencyInput(selectedCurrency);
                      }
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isCustomCurrency
                        ? 'border-amber-500 bg-amber-50/90 shadow-sm ring-2 ring-amber-500/20'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg">🌐</span>
                      <Edit3 className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-xs font-bold text-slate-800 mt-1">
                      Custom Symbol
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {isCustomCurrency ? customCurrencyInput || 'Enter custom' : 'e.g. SAR, £, CAD'}
                    </div>
                  </button>
                </div>

                {/* Inline Custom Input when Custom Symbol selected */}
                {isCustomCurrency && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3 bg-amber-50/90 border border-amber-300 rounded-2xl space-y-1.5"
                  >
                    <label className="block text-[11px] font-bold text-amber-900 font-urdu">
                      اپنی مرضی کی کرنسی علامت لکھیں (Custom Currency Symbol):
                    </label>
                    <input
                      type="text"
                      value={customCurrencyInput}
                      onChange={(e) => handleCustomCurrencyChange(e.target.value)}
                      placeholder="e.g. SAR, £, CAD, Rs., ৳"
                      className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                      autoFocus
                    />
                    <p className="text-[10px] text-amber-800">
                      یہ علامت تمام کھاتوں، رسیدوں اور پی ڈی ایف رپورٹس میں ظاہر ہوگی۔
                    </p>
                  </motion.div>
                )}

                {/* Live Currency Preview Card */}
                <div className="p-3.5 bg-slate-900 text-white rounded-2xl shadow-sm space-y-2">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Live Calculation Preview (کرنسی ڈسپلے پریویو):
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
                      <span className="text-[10px] text-rose-300 block">Debt / قرض باقی</span>
                      <div className="text-base font-black font-mono text-rose-400 mt-0.5">
                        12,250 {selectedCurrency}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
                      <span className="text-[10px] text-emerald-300 block">Credit / وصولی</span>
                      <div className="text-base font-black font-mono text-emerald-400 mt-0.5">
                        4,000 {selectedCurrency}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nav buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setCurrentStep('language');
                    }}
                    className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setCurrentStep('business');
                    }}
                    className="flex-1 py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Next: Business Name / دکان کا نام</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ========================================================
                SCREEN 3: BUSINESS PROFILE & FINAL LAUNCH
                ======================================================== */}
            {currentStep === 'business' && (
              <motion.form
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleFinish}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-emerald-600" />
                    <span>3. Business / Shop Name (کاروبار یا دکان کا نام)</span>
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="My Ledger / میرا کھاتہ"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    You can change your shop name and currency anytime from the app header.
                  </p>
                </div>

                {/* Summary Configuration Card */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Selected Setup Summary:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-emerald-200/70">
                    <div>
                      <span className="text-slate-500">Language:</span>{' '}
                      <strong>{selectedLang === 'ur' ? 'اردو (Urdu)' : selectedLang === 'hi' ? 'हिन्दी (Hindi)' : 'English'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Currency:</span>{' '}
                      <strong className="font-mono text-emerald-700">{selectedCurrency}</strong>
                    </div>
                  </div>
                </div>

                {/* Instant Unlock Notice */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <div>
                    <strong>100% Local & Offline:</strong> No PIN or sign-up required. Your voice transcriptions, ledger balances, and calculations are securely kept on your device.
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setCurrentStep('currency');
                    }}
                    className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    className="flex-1 py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>{t.getStarted} (Open App)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
