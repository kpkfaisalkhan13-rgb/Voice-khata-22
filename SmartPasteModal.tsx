import React, { useState, useEffect, useRef } from 'react';
import {
  Clipboard,
  Mic,
  MicOff,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  BookOpen,
  UserCheck,
  UserPlus,
  Trash2,
  Edit2,
  RotateCcw,
  Brain,
  Check,
  Plus,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Customer, SmartPasteParsedEntry, SmartPasteType, SelfLearningItem } from '../types';
import { parseSmartPasteBatch } from '../utils/smartPasteParser';
import { dbService } from '../services/db';
import {
  playSuccessChime,
  playErrorAlert,
  playClickSound,
  playVoiceStartSound,
  playVoiceStopSound,
} from '../utils/audio';
import { useLanguage } from '../i18n/LanguageContext';

interface SmartPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onBatchSaved: () => void;
  currencyUnit: string;
}

type DisplayLocale = 'ur' | 'en' | 'hi';

export const SmartPasteModal: React.FC<SmartPasteModalProps> = ({
  isOpen,
  onClose,
  customers,
  onBatchSaved,
  currencyUnit,
}) => {
  const { isUrdu } = useLanguage();

  // Screen state
  const [pasteText, setPasteText] = useState('');
  const [locale, setLocale] = useState<DisplayLocale>('ur');
  const [parsedEntries, setParsedEntries] = useState<SmartPasteParsedEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [learningNotification, setLearningNotification] = useState<string | null>(null);
  const [showLearningDrawer, setShowLearningDrawer] = useState(false);
  const [learnedItems, setLearnedItems] = useState<SelfLearningItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const speechRecognizerRef = useRef<any>(null);

  // Dynamic hint texts according to specification:
  const hintTexts: Record<DisplayLocale, string> = {
    en: 'Paste your full list from ChatGPT here. Example: Ali 5000 Jama, Ahmed 3000 Udhaar. I will auto-save to each Khata.',
    ur: 'ChatGPT سے بنی ہوئی پوری لسٹ یہاں Paste کریں۔ مثال: علی 5000 جمع، احمد 3000 ادھار، میں خود ہر ایک کے کھاتے میں ڈال دوں گا۔',
    hi: 'ChatGPT से बनी लिस्ट यहाँ पेस्ट करें। उदाहरण: Ali 5000 Jama, Ahmed 3000 Udhaar. मैं सभी खातों में जोड़ दूंगा।',
  };

  useEffect(() => {
    if (isOpen) {
      setLearnedItems(dbService.getSelfLearningItems());
    }
  }, [isOpen]);

  // Clean up speech recognition on unmount / close
  useEffect(() => {
    return () => {
      if (speechRecognizerRef.current) {
        try {
          speechRecognizerRef.current.stop();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  if (!isOpen) return null;

  // Example ChatGPT / Gemini output to test immediately
  const handleInsertSample = () => {
    playClickSound();
    const sample = `Ali 5000 Jama
Ahmed 3000 Udhaar
Hamza 2500 Jama
Alex ten hundred
Tariq 19 hazar Udhaar
علی پانچ ہزار جمع
عمر ساڑھے پانچ ہزار ادھار`;
    setPasteText(sample);
    const parsed = parseSmartPasteBatch(sample, customers);
    setParsedEntries(parsed);
  };

  // Process and parse the text in the TextArea
  const handleParseText = () => {
    playClickSound();
    if (!pasteText.trim()) {
      setParsedEntries([]);
      return;
    }
    const results = parseSmartPasteBatch(pasteText, customers);
    setParsedEntries(results);
    playSuccessChime();
  };

  // Speech to text dictation with ur-PK, hi-IN, en-US
  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Speech recognition is not supported in this browser. Please paste text directly.');
      return;
    }

    if (isRecording) {
      try {
        speechRecognizerRef.current?.stop();
      } catch {
        // Ignore
      }
      setIsRecording(false);
      playVoiceStopSound();
      return;
    }

    playVoiceStartSound();
    setSpeechError(null);

    try {
      const recognizer = new SpeechRecognition();
      speechRecognizerRef.current = recognizer;
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.lang = locale === 'ur' ? 'ur-PK' : locale === 'hi' ? 'hi-IN' : 'en-US';

      recognizer.onstart = () => {
        setIsRecording(true);
      };

      recognizer.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        if (transcript.trim()) {
          setPasteText((prev) => {
            const next = prev ? `${prev}\n${transcript.trim()}` : transcript.trim();
            const results = parseSmartPasteBatch(next, customers);
            setParsedEntries(results);
            return next;
          });
        }
      };

      recognizer.onerror = (event: any) => {
        setIsRecording(false);
        setSpeechError(`Voice Error: ${event.error || 'Recording stopped'}`);
      };

      recognizer.onend = () => {
        setIsRecording(false);
        playVoiceStopSound();
      };

      recognizer.start();
    } catch (err: any) {
      setIsRecording(false);
      setSpeechError(`Microphone error: ${err.message || 'Could not start recording'}`);
    }
  };

  // Toggle checkbox for an entry
  const handleToggleCheck = (id: string) => {
    playClickSound();
    setParsedEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isChecked: !item.isChecked } : item))
    );
  };

  // Toggle transaction type (Jama vs Udhaar)
  const handleToggleType = (id: string) => {
    playClickSound();
    setParsedEntries((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, type: item.type === 'Jama' ? 'Udhaar' : 'Jama' } : item
      )
    );
  };

  // Remove an entry
  const handleRemoveEntry = (id: string) => {
    playClickSound();
    setParsedEntries((prev) => prev.filter((item) => item.id !== id));
  };

  // SCREEN 4: Self-Learning Dictionary update when amount is edited
  const handleAmountChange = async (id: string, newAmountStr: string) => {
    const newAmount = parseFloat(newAmountStr) || 0;
    const target = parsedEntries.find((e) => e.id === id);
    if (!target) return;

    const oldAmount = target.amount;
    setParsedEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, amount: newAmount } : item))
    );

    // If amount has changed and is positive, learn it in Hive / Local Storage
    if (newAmount > 0 && newAmount !== oldAmount) {
      try {
        const learned = await dbService.saveSelfLearningItem(
          String(oldAmount || target.original_text),
          String(newAmount),
          target.original_text
        );
        setLearnedItems(dbService.getSelfLearningItems());
        setLearningNotification(
          `✓ Self-Learning Saved: "${target.original_text}" ➔ ${newAmount.toLocaleString()} ${currencyUnit}`
        );
        setTimeout(() => setLearningNotification(null), 4000);
      } catch (err) {
        console.warn('Failed to save learning item:', err);
      }
    }
  };

  // Rename customer candidate
  const handleNameChange = (id: string, newName: string) => {
    setParsedEntries((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        // Re-check against local DB
        const match = customers.find(
          (c) =>
            c.name.toLowerCase() === newName.trim().toLowerCase() ||
            (c.nameUrdu && c.nameUrdu.trim().toLowerCase() === newName.trim().toLowerCase())
        );
        return {
          ...item,
          name: newName,
          isExistingKhata: Boolean(match),
          matchedCustomer: match || null,
        };
      })
    );
  };

  // SCREEN 3 - BUTTON 1: "صرف ٹک شدہ محفوظ کرو - Save Only Checked (e.g. 5/8)"
  const handleSaveOnlyChecked = async () => {
    const checked = parsedEntries.filter((e) => e.isChecked);
    if (checked.length === 0) {
      playErrorAlert();
      alert('کوئی اینٹری منتخب نہیں کی گئی! (No entries are checked)');
      return;
    }

    setIsProcessing(true);
    playClickSound();

    try {
      for (const entry of checked) {
        let customer = entry.matchedCustomer;
        // If not found but user manually checked it, auto-create Khata
        if (!customer) {
          customer = await dbService.addCustomer({
            name: entry.name || 'New Customer',
            nameUrdu: entry.name || 'نیا کھاتہ',
            phone: '',
            address: 'Added via Smart Paste',
            balance: 0,
            debtLimit: 20000,
          });
        }

        // Jama = Credit (Subtracted from customer debt)
        // Udhaar = Debit (Added to customer debt)
        const txType = entry.type === 'Jama' ? 'CREDIT' : 'DEBIT';
        await dbService.addTransaction({
          customerId: customer.id,
          customerName: customer.name,
          customerNameUrdu: customer.nameUrdu,
          amount: Math.abs(entry.amount),
          type: txType,
          note: `Smart Paste (${entry.type}): ${entry.original_text}`,
        });
      }

      try {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      } catch {
        // Ignore
      }

      playSuccessChime();
      onBatchSaved();
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
      playErrorAlert();
    } finally {
      setIsProcessing(false);
    }
  };

  // SCREEN 3 - BUTTON 2: "نئے لوگوں کے کھاتے بناؤ اور محفوظ کرو - Create Khata for Not-Found & Save All"
  const handleCreateNotFoundAndSaveAll = async () => {
    if (parsedEntries.length === 0) {
      playErrorAlert();
      return;
    }

    setIsProcessing(true);
    playClickSound();

    try {
      for (const entry of parsedEntries) {
        let customer = entry.matchedCustomer;
        // For ALL not-found entries, automatically create new Khata!
        if (!customer) {
          customer = await dbService.addCustomer({
            name: entry.name || 'New Customer',
            nameUrdu: entry.name || 'نیا کھاتہ',
            phone: '',
            address: 'Auto-created via Smart Paste',
            balance: 0,
            debtLimit: 20000,
          });
        }

        const txType = entry.type === 'Jama' ? 'CREDIT' : 'DEBIT';
        await dbService.addTransaction({
          customerId: customer.id,
          customerName: customer.name,
          customerNameUrdu: customer.nameUrdu,
          amount: Math.abs(entry.amount),
          type: txType,
          note: `Smart Paste Batch (${entry.type}): ${entry.original_text}`,
        });
      }

      try {
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.5 } });
      } catch {
        // Ignore
      }

      playSuccessChime();
      onBatchSaved();
      onClose();
    } catch (err) {
      console.error('Batch save failed:', err);
      playErrorAlert();
    } finally {
      setIsProcessing(false);
    }
  };

  const checkedCount = parsedEntries.filter((e) => e.isChecked).length;
  const notFoundCount = parsedEntries.filter((e) => !e.isExistingKhata).length;
  const foundCount = parsedEntries.filter((e) => e.isExistingKhata).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-inner">
              <Clipboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight font-urdu">
                  Smart Voice & Paste Entry
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950">
                  Not-Found Handling
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-urdu">
                ChatGPT / Gemini لسٹ پیسٹ کریں، کھاتوں میں خود بخود محفوظ کریں
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Self Learning Dictionary Drawer Toggle */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setShowLearningDrawer(!showLearningDrawer);
              }}
              title="Self-Learning Dictionary"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Brain className="w-4 h-4 text-amber-300" />
              <span className="hidden sm:inline font-urdu">
                سیکھی ہوئی میپنگ ({learnedItems.length})
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Self-Learning Dictionary Collapsible Banner / Drawer */}
        <AnimatePresence>
          {showLearningDrawer && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-amber-50 border-b border-amber-200 p-4 space-y-3 shrink-0 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 font-urdu">
                  <Brain className="w-4 h-4 text-amber-600" />
                  <span>
                    خود کار سیکھنے والی ڈکشنری (Self-Learning Dictionary - Hive/Storage):
                  </span>
                </div>
                {learnedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      await dbService.clearSelfLearningItems();
                      setLearnedItems([]);
                      playClickSound();
                    }}
                    className="text-[11px] text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {learnedItems.length === 0 ? (
                <p className="text-xs text-amber-800 font-urdu">
                  ابھی کوئی میپنگ محفوظ نہیں ہے۔ جب آپ کسی رقم کو ایڈٹ کریں گے تو سسٹم خود بخود یاد رکھ لے گا۔
                </p>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {learnedItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-xl bg-white border border-amber-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[11px]">
                          &quot;{item.context}&quot;
                        </span>
                        <ArrowRight className="w-3 h-3 text-amber-600" />
                        <span className="font-mono font-bold text-emerald-700">
                          {Number(item.correct).toLocaleString()} {currencyUnit}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          (from {item.wrong})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await dbService.deleteSelfLearningItem(item.id);
                          setLearnedItems(dbService.getSelfLearningItems());
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Learning Toast Alert */}
        {learningNotification && (
          <div className="bg-purple-600 text-white text-xs px-4 py-2 font-bold flex items-center gap-2 justify-center animate-in fade-in duration-150">
            <Brain className="w-4 h-4 animate-bounce" />
            <span>{learningNotification}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* ========================================================
              SCREEN 1: PASTE BOX WITH DYNAMIC MULTILINGUAL HINTS
              ======================================================== */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-urdu flex items-center gap-1.5">
                <span>1. لسٹ درج کریں (Screen 1: Paste Box)</span>
              </label>

              {/* Dynamic Hint Language Selector */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setLocale('ur')}
                  className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                    locale === 'ur' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  اردو
                </button>
                <button
                  type="button"
                  onClick={() => setLocale('en')}
                  className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                    locale === 'en' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLocale('hi')}
                  className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                    locale === 'hi' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  हिंदी
                </button>
              </div>
            </div>

            {/* Big TextArea */}
            <div className="relative">
              <textarea
                id="smart-paste-input-textarea"
                rows={4}
                value={pasteText}
                onChange={(e) => {
                  setPasteText(e.target.value);
                  if (e.target.value.trim()) {
                    const results = parseSmartPasteBatch(e.target.value, customers);
                    setParsedEntries(results);
                  } else {
                    setParsedEntries([]);
                  }
                }}
                placeholder={hintTexts[locale]}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none leading-relaxed text-slate-800"
              />

              {/* Floating Action Controls on TextArea */}
              <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                {/* Speech to text microphone */}
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  title="Speech to Text Mic"
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                    isRecording
                      ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-emerald-600" />}
                  <span>{isRecording ? 'Listening...' : 'Mic'}</span>
                </button>

                {pasteText && (
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setPasteText('');
                      setParsedEntries([]);
                    }}
                    className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer"
                    title="Clear"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Helper controls row */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={handleInsertSample}
                className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>ChatGPT نمونہ لسٹ لوڈ کریں (Try Example)</span>
              </button>

              <button
                type="button"
                onClick={handleParseText}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                <span>چیک کریں (Parse)</span>
              </button>
            </div>

            {speechError && (
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-urdu flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{speechError}</span>
              </div>
            )}
          </div>

          {/* ========================================================
              SCREEN 2: PARSED LIST WITH TICK / CROSS (RED & GREEN CARDS)
              ======================================================== */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-urdu">
                  2. لسٹ کی جانچ پڑتال (Screen 2: Parsed List)
                </h3>
                <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  Total: {parsedEntries.length}
                </span>
              </div>

              {parsedEntries.length > 0 && (
                <div className="flex items-center gap-2 text-[11px] font-bold">
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    ✓ Found: {foundCount}
                  </span>
                  <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                    ⚠️ Not Found: {notFoundCount}
                  </span>
                </div>
              )}
            </div>

            {parsedEntries.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl space-y-2">
                <Clipboard className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-urdu">
                  اوپر دیے گئے باکس میں لسٹ پیسٹ کریں، یہاں ہر شخص کے کھاتے کی تصدیق ظاہر ہوگی۔
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {parsedEntries.map((entry) => {
                  const isFound = entry.isExistingKhata;

                  return (
                    <div
                      key={entry.id}
                      className={`p-3.5 rounded-2xl border transition-all duration-150 ${
                        isFound
                          ? 'border-emerald-300 bg-emerald-50/60 shadow-xs'
                          : 'border-rose-400 bg-rose-50/90 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Checkbox (Tick / Cross) */}
                        <div className="pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleToggleCheck(entry.id)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                              entry.isChecked
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'border-2 border-slate-300 bg-white hover:border-slate-400'
                            }`}
                          >
                            {entry.isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                          </button>
                        </div>

                        {/* Card Content */}
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            {/* Person Name (Editable) */}
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={entry.name}
                                onChange={(e) => handleNameChange(entry.id, e.target.value)}
                                className="font-bold text-sm text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white px-1 py-0.5 rounded focus:outline-none"
                              />

                              {/* Status Badge */}
                              {isFound ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <UserCheck className="w-3 h-3" />
                                  <span>کھاتہ موجود ہے (Found)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 border border-rose-300 animate-pulse">
                                  <AlertTriangle className="w-3 h-3 text-rose-700" />
                                  <span>⚠️ کھاتہ نہیں ملا - Khata Not Found</span>
                                </span>
                              )}

                              {entry.learnedCorrectionApplied && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                                  <Brain className="w-2.5 h-2.5" />
                                  <span>Learned</span>
                                </span>
                              )}
                            </div>

                            {/* Transaction Type Toggle: Jama vs Udhaar */}
                            <button
                              type="button"
                              onClick={() => handleToggleType(entry.id)}
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1 cursor-pointer ${
                                entry.type === 'Jama'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-rose-600 text-white shadow-xs'
                              }`}
                            >
                              {entry.type === 'Jama' ? (
                                <>
                                  <TrendingUp className="w-3 h-3" />
                                  <span>جمع (Jama / Credit)</span>
                                </>
                              ) : (
                                <>
                                  <TrendingDown className="w-3 h-3" />
                                  <span>ادھار (Udhaar / Debit)</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Not Found Warning Message */}
                          {!isFound && (
                            <div className="text-xs font-bold text-rose-700 font-urdu flex items-center gap-1">
                              <span>
                                ⚠️ کھاتہ نہیں ملا - Khata Not Found: &quot;{entry.name}&quot; (خود بخود ان چیک کیا گیا ہے)
                              </span>
                            </div>
                          )}

                          {/* Existing Customer Balance info if Found */}
                          {isFound && entry.matchedCustomer && (
                            <div className="text-[11px] text-emerald-800 font-urdu flex items-center gap-2">
                              <span>موجودہ بیلنس:</span>
                              <strong className="font-mono">
                                {entry.matchedCustomer.balance.toLocaleString()} {currencyUnit}
                              </strong>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-500">
                                {entry.type === 'Jama'
                                  ? `نئی بقایا: ${(entry.matchedCustomer.balance - entry.amount).toLocaleString()} ${currencyUnit}`
                                  : `نئی بقایا: ${(entry.matchedCustomer.balance + entry.amount).toLocaleString()} ${currencyUnit}`}
                              </span>
                            </div>
                          )}

                          {/* Amount Input (Editable with Self-Learning Trigger) */}
                          <div className="flex items-center justify-between gap-3 pt-1">
                            <span className="text-[11px] text-slate-500 font-urdu line-clamp-1">
                              اصل جملہ: &quot;{entry.original_text}&quot;
                            </span>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs font-bold text-slate-500 font-urdu">
                                رقم:
                              </span>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={entry.amount || ''}
                                  onChange={(e) => handleAmountChange(entry.id, e.target.value)}
                                  className="w-28 px-2.5 py-1 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-right"
                                  placeholder="0"
                                />
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold font-mono">
                                  {currencyUnit}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveEntry(entry.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Remove"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            SCREEN 3: BOTTOM 2 ACTION BUTTONS
            ======================================================== */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 space-y-2">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            {/* Button 1: Save Only Checked */}
            <button
              type="button"
              id="save-only-checked-btn"
              disabled={isProcessing || checkedCount === 0}
              onClick={handleSaveOnlyChecked}
              className={`flex-1 w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                checkedCount > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-[0.99]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                صرف ٹک شدہ محفوظ کرو - Save Only Checked ({checkedCount}/{parsedEntries.length})
              </span>
            </button>

            {/* Button 2: Create Khata for Not-Found & Save All */}
            <button
              type="button"
              id="create-not-found-save-all-btn"
              disabled={isProcessing || parsedEntries.length === 0}
              onClick={handleCreateNotFoundAndSaveAll}
              className={`flex-1 w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                parsedEntries.length > 0
                  ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20 active:scale-[0.99]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>
                نئے لوگوں کے کھاتے بناؤ اور محفوظ کرو - Create Khata & Save All ({parsedEntries.length})
              </span>
            </button>
          </div>

          <p className="text-[11px] text-slate-500 text-center font-urdu">
            ریڈ کارڈز (Not Found) خود بخود ان چیک ہوتے ہیں۔ آپ بٹن 2 دبا کر ان کے کھاتے براہ راست بنا سکتے ہیں۔
          </p>
        </div>
      </motion.div>
    </div>
  );
};
