import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Copy,
  Check,
  RotateCcw,
  X,
  PlusCircle,
  ArrowRight,
  Volume2,
  Sparkles,
  Equal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Customer, TransactionType } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { parseMathematicalSpeech, parsePositionalNumberSegment } from '../utils/urduParser';
import { playClickSound, playSuccessSound, playErrorAlert } from '../utils/audio';
import { connectivityService } from '../services/connectivityService';

interface VoiceCalcScreenProps {
  customers: Customer[];
  onCloseToKhata: () => void;
  onRecordTransaction: (customerId: string, amount: number, type: TransactionType, note: string) => void;
}

export const VoiceCalcScreen: React.FC<VoiceCalcScreenProps> = ({
  customers,
  onCloseToKhata,
  onRecordTransaction,
}) => {
  const { t, language } = useLanguage();

  const [isListening, setIsListening] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState('102580 + 5000 - 200');
  const [expression, setExpression] = useState('102580 + 5000 - 200');
  const [calcResult, setCalcResult] = useState<number>(107380);
  const [copied, setCopied] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [transactionType, setTransactionType] = useState<TransactionType>('DEBIT');
  const [showAddToKhata, setShowAddToKhata] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Recognition ref
  const recognitionRef = useRef<any>(null);
  const isSpeechSupported =
    typeof window !== 'undefined' &&
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  // Audio visualization simulation
  const [audioBars, setAudioBars] = useState<number[]>(new Array(12).fill(10));

  useEffect(() => {
    let interval: any;
    if (isListening) {
      interval = setInterval(() => {
        setAudioBars(
          Array.from({ length: 12 }, () => Math.floor(Math.random() * 32) + 8)
        );
      }, 100);
    } else {
      setAudioBars(new Array(12).fill(8));
    }
    return () => clearInterval(interval);
  }, [isListening]);

  // Evaluate math from raw input
  const handleEvaluateInput = (text: string) => {
    setSpokenTranscript(text);
    const parsed = parseMathematicalSpeech(text);
    if (parsed.hasMathOperators && parsed.expression) {
      setExpression(parsed.expression);
      setCalcResult(parsed.result);
    } else {
      // Positional number or single value
      const pos = parsePositionalNumberSegment(text);
      if (pos !== null) {
        setExpression(String(pos));
        setCalcResult(pos);
      } else if (parsed.result > 0) {
        setExpression(parsed.expression || text);
        setCalcResult(parsed.result);
      }
    }
  };

  const startListening = () => {
    // Network Connectivity Guardrail: Check network status before voice input
    const isUrdu = language === 'ur';
    const connCheck = connectivityService.checkVoiceAvailability(isUrdu);
    if (!connCheck.allowed) {
      playErrorAlert();
      setSuccessBanner(
        connCheck.message ||
          'Voice features require an internet connection. Please connect to the internet or use manual entry.'
      );
      setTimeout(() => setSuccessBanner(null), 5000);
      return;
    }

    playClickSound();
    if (!isSpeechSupported) {
      alert('Speech recognition is not supported in this browser. You can click test phrases or type below.');
      return;
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recog = new SpeechRecognition();
      recognitionRef.current = recog;

      recog.continuous = false;
      recog.interimResults = true;
      recog.lang = language === 'hi' ? 'hi-IN' : language === 'ur' ? 'ur-PK' : 'en-US';

      recog.onstart = () => {
        setIsListening(true);
      };

      recog.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) {
          handleEvaluateInput(finalTranscript);
        }
      };

      recog.onerror = () => {
        setIsListening(false);
      };

      recog.onend = () => {
        setIsListening(false);
      };

      recog.start();
    } catch {
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) stopListening();
    else startListening();
  };

  // Reset/Clear buttons (C / CE)
  const handleClear = () => {
    playClickSound();
    setSpokenTranscript('');
    setExpression('0');
    setCalcResult(0);
  };

  const handleCopy = () => {
    playClickSound();
    navigator.clipboard.writeText(String(calcResult));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyToKhata = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || calcResult <= 0) return;
    playSuccessSound();

    const targetCustomer = customers.find((c) => c.id === selectedCustomerId);
    const note = `Voice Calc: ${expression} = ${calcResult.toLocaleString()}`;

    onRecordTransaction(selectedCustomerId, calcResult, transactionType, note);

    setSuccessBanner(
      `✓ ${calcResult.toLocaleString()} ${targetCustomer?.name || ''} ke khate mein shamil kar diye gaye!`
    );
    setShowAddToKhata(false);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  const testPhrases = [
    { label: '102580 + 5000 - 200', text: '102580 plus 5000 minus 200' },
    { label: 'ek lakh do hazar panch sau assi', text: 'ek lakh do hazar panch sau assi' },
    { label: '500 plus 200 zarb 3', text: '500 plus 200 zarb 3' },
    { label: '25 hazar jama 15 hazar', text: '25 hazar jama 15 hazar' },
    { label: '12000 divided by 4', text: '12000 divided by 4' },
    { label: '5 lakh manfi 1 lakh 50 hazar', text: '5 lakh manfi 1 lakh 50 hazar' },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] pb-24 pt-4 px-4 max-w-lg mx-auto flex flex-col justify-between">
      {/* Top Header / Close Action */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-2xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/20">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>{t.tabVoiceCalc}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Positional Math Engine
              </span>
            </h1>
            <p className="text-[11px] text-slate-500">
              Speak mathematical expressions in Urdu, Hindi or English
            </p>
          </div>
        </div>

        {/* ❌ Close back to Khata button */}
        <button
          id="voice-calc-close-btn"
          type="button"
          onClick={() => {
            playClickSound();
            onCloseToKhata();
          }}
          className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          title="Back to Khata"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Success Banner */}
      <AnimatePresence>
        {successBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="my-3 p-3 rounded-2xl bg-emerald-600 text-white text-xs font-semibold shadow-md flex items-center justify-between"
          >
            <span>{successBanner}</span>
            <button onClick={() => setSuccessBanner(null)} className="text-white/80 hover:text-white">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Display Area (Spoken Expression & Evaluated Result) */}
      <div className="my-4 p-5 rounded-3xl bg-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
          <span>SPOKEN EXPRESSION</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            LIVE EVALUATION
          </span>
        </div>

        {/* Real-time Spoken Expression */}
        <div className="min-h-[38px] text-slate-300 text-base font-mono font-medium tracking-wide flex items-center break-all">
          {expression || spokenTranscript || '0'}
        </div>

        {/* Big Bold Numerical Result Area */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-baseline justify-between">
          <span className="text-slate-500 font-mono text-xl flex items-center gap-1">
            <Equal className="w-5 h-5 text-emerald-500" />
          </span>
          <span className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight font-mono">
            {calcResult.toLocaleString()}
          </span>
        </div>

        {/* Action Controls: C / CE, Copy, Add to Khata */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
          {/* C / CE Reset buttons */}
          <div className="flex items-center gap-1.5">
            <button
              id="calc-ce-btn"
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-mono font-bold text-rose-400 border border-slate-700 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>C / CE</span>
            </button>

            <button
              id="calc-copy-btn"
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-mono text-slate-300 border border-slate-700 transition-colors flex items-center gap-1"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAddToKhata(!showAddToKhata)}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add to Khata</span>
          </button>
        </div>
      </div>

      {/* Add To Khata Drawer Form (Optional dropdown) */}
      <AnimatePresence>
        {showAddToKhata && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleApplyToKhata}
            className="mb-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-md space-y-3"
          >
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Save Result ({calcResult.toLocaleString()}) to Ledger</span>
              <button
                type="button"
                onClick={() => setShowAddToKhata(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Customer
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                  required
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.nameUrdu})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Entry Type
                </label>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                >
                  <option value="DEBIT">قرض دیا / दिए (Debit)</option>
                  <option value="CREDIT">وصول کیے / प्राप्त हुए (Credit)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Confirm & Record in Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Large Circular Microphone Button in the Center */}
      <div className="my-6 flex flex-col items-center justify-center">
        {/* Audio Wave Visualizer */}
        <div className="h-10 flex items-center gap-1 mb-3">
          {audioBars.map((height, idx) => (
            <motion.div
              key={idx}
              animate={{ height }}
              transition={{ type: 'spring', damping: 10 }}
              className={`w-1.5 rounded-full transition-colors ${
                isListening ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Prominent Circular Button */}
        <div className="relative">
          {isListening && (
            <motion.div
              animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 rounded-full bg-emerald-500/30 -z-10"
            />
          )}

          <button
            id="voice-calc-mic-btn"
            type="button"
            onClick={toggleListening}
            className={`w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 cursor-pointer ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-700 text-white ring-8 ring-rose-100 shadow-rose-600/30 animate-pulse'
                : 'bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white ring-8 ring-emerald-50 shadow-emerald-600/30'
            }`}
          >
            {isListening ? (
              <MicOff className="w-10 h-10 stroke-[2.2]" />
            ) : (
              <Mic className="w-10 h-10 stroke-[2.2]" />
            )}
          </button>
        </div>

        <p className="mt-3 text-xs font-bold text-slate-700">
          {isListening ? 'Listening... Speak numbers & operators' : 'Tap to Speak Calculation'}
        </p>
        <p className="text-[11px] text-slate-400">
          Supports "plus", "minus", "zarb", "jama", "ek lakh do hazar"
        </p>
      </div>

      {/* Interactive Quick-Test Math Phrases */}
      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
        <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Quick Verification Phrases (Tap to Test):</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {testPhrases.map((phrase, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                playClickSound();
                handleEvaluateInput(phrase.text);
              }}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200 text-[11px] font-mono text-slate-700 transition-colors shadow-2xs"
            >
              {phrase.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
