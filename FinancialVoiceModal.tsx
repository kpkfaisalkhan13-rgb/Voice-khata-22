import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  X,
  Code,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  User,
  Users,
  UserCheck,
  Search,
  Brain,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Customer,
  FinancialVoiceOutput,
  IntelligentVoiceParserResult,
  UserVoiceCorrection,
} from '../types';
import {
  parseIntelligentVoiceEntry,
  formatIntelligentParserJson,
} from '../utils/financialVoiceParser';
import { dbService } from '../services/db';
import { connectivityService } from '../services/connectivityService';
import {
  playSuccessChime,
  playErrorAlert,
  playVoiceStartSound,
  playVoiceStopSound,
  playClickSound,
} from '../utils/audio';
import { useLanguage } from '../i18n/LanguageContext';

export type KhataTransactionChoice = 'Debit' | 'Credit';

interface FinancialVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  selectedCustomer?: Customer | null;
  onConfirmKhataTransaction: (result: FinancialVoiceOutput) => Promise<void>;
  currencyUnit: string;
}

export const FinancialVoiceModal: React.FC<FinancialVoiceModalProps> = ({
  isOpen,
  onClose,
  customers,
  selectedCustomer,
  onConfirmKhataTransaction,
  currencyUnit,
}) => {
  const { isUrdu } = useLanguage();

  // Pre-Recording Customer Selection State
  // Prompt the user to select a customer from the customer list before initiating the voice recording.
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [isCustomerListOpen, setIsCustomerListOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Transaction choice:
  // Debit (+) adds to balance (قرض دیا - New Debt = Current Debt + Amount) [strictly RED]
  // Credit (-) subtracts from balance (وصولی - New Debt = Current Debt - Amount) [RED if > 0, GREEN if <= 0]
  const [selectedKhataType, setSelectedKhataType] = useState<KhataTransactionChoice>('Debit');

  // Voice recording & input states
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [learnedCorrection, setLearnedCorrection] = useState<UserVoiceCorrection | null>(null);

  // Result & UI states
  const [parsedResult, setParsedResult] = useState<IntelligentVoiceParserResult | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const speechRecognizerRef = useRef<any>(null);
  const saveCorrectionTimerRef = useRef<any>(null);

  // Synchronize initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Pre-select customer if one was explicitly passed; otherwise leave null so user selects from list
      const initial = selectedCustomer || null;
      setCurrentCustomer(initial);
      // If no customer is pre-selected, open customer selection drawer automatically
      setIsCustomerListOpen(!initial);
      setCustomerSearchQuery('');
      setSelectedKhataType('Debit');
      setTranscript('');
      setManualInput('');
      setAmountInput('');
      setLearnedCorrection(null);
      setParsedResult(null);
      setMicError(null);
      setActionFeedback(null);
      setIsRecording(false);
    }
  }, [isOpen, selectedCustomer, customers]);

  // Cleanup speech recognition on close
  useEffect(() => {
    if (!isOpen && speechRecognizerRef.current) {
      try {
        speechRecognizerRef.current.stop();
      } catch {
        // Ignore
      }
      setIsRecording(false);
    }
    return () => {
      if (saveCorrectionTimerRef.current) {
        clearTimeout(saveCorrectionTimerRef.current);
      }
    };
  }, [isOpen]);

  // Filter registered customers by search query
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers;
    const q = customerSearchQuery.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.nameUrdu && c.nameUrdu.includes(q)) ||
        (c.phone && c.phone.includes(q))
    );
  }, [customers, customerSearchQuery]);

  // ============================================================================
  // 2. UI EDIT / REWRITE CALLBACK TRIGGER:
  // Whenever user manually edits or rewrites the parsed amount in the input field
  // after a voice recording:
  // - Capture raw voice transcript string (e.g. "10220" / "دس ہزار دو سو بیس")
  // - Capture user's manually corrected number (e.g. 10220)
  // - Save or update (UPSERT) this pair in user_voice_corrections table (spoken_transcript -> corrected_number)
  // ============================================================================
  const handleAmountInputChange = (val: string) => {
    setAmountInput(val);
    const parsedNum = parseFloat(val) || 0;
    if (parsedResult) {
      setParsedResult({
        ...parsedResult,
        parsed_amount: parsedNum,
      });
    }

    const activeSpokenText = (transcript || manualInput || parsedResult?.original_spoken_text || '').trim();
    if (activeSpokenText && parsedNum > 0) {
      if (saveCorrectionTimerRef.current) {
        clearTimeout(saveCorrectionTimerRef.current);
      }
      saveCorrectionTimerRef.current = setTimeout(async () => {
        try {
          const saved = await dbService.saveUserVoiceCorrection(activeSpokenText, parsedNum);
          setLearnedCorrection(saved);
          setActionFeedback(
            `✓ Dynamic Learning Saved: "${activeSpokenText}" ➔ ${parsedNum.toLocaleString()} (محفوظ کر لیا گیا)`
          );
        } catch (err) {
          console.warn('Failed to save voice correction:', err);
        }
      }, 400);
    }
  };

  // ============================================================================
  // 3. AUTO-LOOKUP BEFORE DISPLAYING RESULT:
  // Every time a new voice recording is made:
  // - Extract transcribed spoken text
  // - Search user_voice_corrections table for exact or fuzzy match
  // - If match found: Override AI output immediately with stored corrected_number
  // - If no match found: Fall back to default parser dictionary / speech-to-number output
  // ============================================================================
  const handleProcessInput = useCallback(
    (
      textToProcess: string,
      khataType: KhataTransactionChoice = 'Debit',
      customerTarget?: Customer | null
    ) => {
      const clean = textToProcess.trim();
      if (!clean) {
        setParsedResult(null);
        setAmountInput('');
        setLearnedCorrection(null);
        return;
      }

      // Step 3a: Auto-lookup user_voice_corrections before displaying result
      const matchedCorrection = dbService.findVoiceCorrection(clean);
      setLearnedCorrection(matchedCorrection);

      const target = customerTarget !== undefined ? customerTarget : currentCustomer;

      // Step 3b: Fall back to default parser dictionary / algorithmic output
      const result = parseIntelligentVoiceEntry(clean, 'Khata', customers, khataType, target);

      if (result) {
        // Step 3c: If match found, override immediately with stored corrected_number
        if (matchedCorrection && matchedCorrection.corrected_number > 0) {
          result.parsed_amount = matchedCorrection.corrected_number;
        }

        setParsedResult(result);
        if (result.parsed_amount > 0) {
          setAmountInput(String(result.parsed_amount));
        } else {
          setAmountInput('');
        }
      } else {
        setParsedResult(null);
        setAmountInput('');
      }
    },
    [customers, currentCustomer]
  );

  // Customer Pre-Selection & Start Voice Recording sequence
  const startVoiceRecording = (
    forcedType?: KhataTransactionChoice,
    targetCustomer?: Customer | null
  ) => {
    const activeCustomer = targetCustomer !== undefined ? targetCustomer : currentCustomer;

    // CUSTOMER PRE-SELECTION REQUIREMENT:
    // Prompt the user to select a customer from the customer list before initiating voice recording
    if (!activeCustomer) {
      playErrorAlert();
      setIsCustomerListOpen(true);
      setMicError(
        'پہلے گاہک منتخب کریں! براہ کرم ریکارڈنگ شروع کرنے سے پہلے فہرست سے گاہک کا انتخاب کریں۔ (Please select a customer from the customer list before recording)'
      );
      return;
    }

    // Network Connectivity Guardrail: Check network status before voice input
    const connCheck = connectivityService.checkVoiceAvailability(isUrdu);
    if (!connCheck.allowed) {
      playErrorAlert();
      setMicError(
        connCheck.message ||
          'Voice features require an internet connection. Please connect to the internet or use manual entry.'
      );
      return;
    }

    playVoiceStartSound();
    setMicError(null);
    setTranscript('');
    setParsedResult(null);
    setActionFeedback(null);

    const activeType = forcedType || selectedKhataType;

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicError('Speech recognition is not supported in this browser. Please type voice command below.');
      return;
    }

    try {
      if (speechRecognizerRef.current) {
        try {
          speechRecognizerRef.current.stop();
        } catch {
          // Ignore
        }
      }

      const recognizer = new SpeechRecognition();
      speechRecognizerRef.current = recognizer;
      recognizer.continuous = false;
      recognizer.interimResults = true;
      recognizer.lang = isUrdu ? 'ur-PK' : 'ur-PK';

      recognizer.onstart = () => {
        setIsRecording(true);
      };

      recognizer.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          setTranscript(currentTranscript);
          handleProcessInput(currentTranscript, activeType, activeCustomer);
        }
      };

      recognizer.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          setMicError('مائیکروفون کی اجازت درکار ہے (Microphone permission was denied).');
        } else {
          setMicError(`مائیک ایرر: ${event.error || 'آواز ریکارڈ نہیں ہو سکی'}`);
        }
      };

      recognizer.onend = () => {
        setIsRecording(false);
        playVoiceStopSound();
        if (transcript) {
          handleProcessInput(transcript, activeType, activeCustomer);
          playSuccessChime();
        }
      };

      recognizer.start();
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
      setIsRecording(false);
      setMicError('مائیکروفون شروع کرنے میں دشواری پیش آئی۔');
    }
  };

  const stopVoiceRecording = () => {
    if (speechRecognizerRef.current) {
      try {
        speechRecognizerRef.current.stop();
      } catch {
        // Ignore
      }
    }
    setIsRecording(false);
    playVoiceStopSound();
  };

  const handleSelectCustomer = (customer: Customer) => {
    playClickSound();
    setCurrentCustomer(customer);
    setIsCustomerListOpen(false);
    setMicError(null);

    // If text was already entered or spoken, re-evaluate with the selected customer
    const activeText = transcript || manualInput;
    if (activeText) {
      handleProcessInput(activeText, selectedKhataType, customer);
    }
  };

  const handleToggleKhataType = (type: KhataTransactionChoice) => {
    playClickSound();
    setSelectedKhataType(type);
    const activeText = transcript || manualInput;
    if (activeText) {
      handleProcessInput(activeText, type, currentCustomer);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;

    if (!currentCustomer) {
      playErrorAlert();
      setIsCustomerListOpen(true);
      setMicError('براہ کرم پہلے گاہک منتخب کریں (Please select a customer first).');
      return;
    }

    setTranscript(manualInput);
    handleProcessInput(manualInput, selectedKhataType, currentCustomer);
    playSuccessChime();
  };

  const handleCopyJson = () => {
    if (!parsedResult) return;
    const jsonStr = formatIntelligentParserJson(parsedResult);
    navigator.clipboard.writeText(jsonStr);
    setCopiedJson(true);
    playClickSound();
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleConfirmAndSave = async () => {
    if (!parsedResult) return;

    if (!currentCustomer) {
      playErrorAlert();
      setIsCustomerListOpen(true);
      setMicError('براہ کرم پہلے گاہک منتخب کریں (Customer selection required).');
      return;
    }

    playSuccessChime();
    try {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    } catch {
      // Ignore
    }

    const effectiveCustomer = currentCustomer;
    const customerId = effectiveCustomer.id;
    const customerName = effectiveCustomer.name;
    const customerUrdu = effectiveCustomer.nameUrdu || effectiveCustomer.name;

    const compatOutput: FinancialVoiceOutput = {
      selected_tab: 'Khata/Supply',
      entry_type: parsedResult.transaction_type, // 'Debit' or 'Credit'
      amount: parsedResult.parsed_amount,
      description: `${customerUrdu} - ${
        parsedResult.transaction_type === 'Credit'
          ? 'وصول ہوا (Credit / SUBTRACT)'
          : 'دیے (Debit / ADD)'
      }`,
      math_action: parsedResult.math_action === 'SUBTRACT' ? 'MINUS (-)' : 'PLUS (+)',
      customerId,
      customerName,
      customerUrdu,
      tab: 'Khata',
      original_spoken_text: parsedResult.original_spoken_text,
      person_name: customerUrdu,
      customer_id: customerId,
      parsed_amount: parsedResult.parsed_amount,
      transaction_type: parsedResult.transaction_type,
    };

    await onConfirmKhataTransaction(compatOutput);
    onClose();
  };

  if (!isOpen) return null;

  const formattedJsonOutput = parsedResult ? formatIntelligentParserJson(parsedResult) : '';

  // Customer debt calculation preview
  const currentDebt = currentCustomer ? currentCustomer.balance : 0;
  const parsedAmt = parsedResult ? parsedResult.parsed_amount : 0;

  // Debit (قرض دیا / دیا): New Debt = Current Debt + Amount
  // Credit (وصولی / ملا): New Debt = Current Debt - Amount
  const newDebt =
    parsedResult?.transaction_type === 'Credit'
      ? currentDebt - parsedAmt
      : currentDebt + parsedAmt;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl relative text-slate-800 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <BookOpen className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg tracking-tight font-urdu">
                  وائس کھاتہ لیجر (Voice Khata)
                </h3>
                <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Single Module
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Customer Debt & Credit Ledger with Dynamic Learning
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* 1. CUSTOMER PRE-SELECTION TRIGGER & CARD */}
          <div className="space-y-2">
            <div
              className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all ${
                currentCustomer
                  ? 'bg-emerald-50/70 border-emerald-400 shadow-xs'
                  : 'bg-amber-50/80 border-amber-300 shadow-sm'
              } flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shadow-xs shrink-0 ${
                    currentCustomer
                      ? 'bg-emerald-700 text-white'
                      : 'bg-amber-200 text-amber-900 border border-amber-300'
                  }`}
                >
                  {currentCustomer ? <UserCheck className="w-6 h-6" /> : <User className="w-6 h-6" />}
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className={currentCustomer ? 'text-emerald-900' : 'text-amber-900'}>
                      Customer Account (گاہک کا کھاتہ):
                    </span>
                    {currentCustomer ? (
                      <span className="bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded-md text-[9px] font-black">
                        ✓ Selected & Assigned
                      </span>
                    ) : (
                      <span className="bg-amber-200 text-amber-950 px-2 py-0.5 rounded-md text-[9px] font-black animate-pulse flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-800" />
                        پہلے گاہک منتخب کریں (Required First)
                      </span>
                    )}
                  </div>

                  <div className="text-base font-black text-slate-900 font-urdu mt-0.5">
                    {currentCustomer ? (
                      <span>
                        {currentCustomer.nameUrdu || currentCustomer.name}{' '}
                        <span className="text-xs font-sans text-slate-600 font-normal">
                          ({currentCustomer.name})
                        </span>
                      </span>
                    ) : (
                      <span className="text-amber-900 font-bold">
                        آواز ریکارڈ کرنے سے پہلے گاہک منتخب کریں
                      </span>
                    )}
                  </div>

                  {currentCustomer && (
                    <div className="text-[11px] text-slate-600 font-mono mt-0.5 flex items-center gap-2">
                      <span>ID: <strong>{currentCustomer.id}</strong></span>
                      <span>•</span>
                      <span>
                        Current Debt:{' '}
                        <strong
                          className={
                            currentCustomer.balance > 0
                              ? 'text-rose-600'
                              : 'text-emerald-600'
                          }
                        >
                          {currentCustomer.balance.toLocaleString()} {currencyUnit}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Trigger Button */}
              <button
                type="button"
                id="customer-selection-trigger-btn"
                onClick={() => {
                  playClickSound();
                  setIsCustomerListOpen((prev) => !prev);
                }}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all shrink-0 ${
                  currentCustomer
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/20'
                    : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30 animate-bounce sm:animate-none'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>{currentCustomer ? 'Change Customer (تبدیل کریں)' : 'Select Customer (گاہک چنیں)'}</span>
              </button>
            </div>

            {/* CUSTOMER SELECTION DRAWER */}
            <AnimatePresence>
              {isCustomerListOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-2xl border-2 border-emerald-400 bg-white shadow-xl p-3 sm:p-4 space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-700" />
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm font-urdu">
                        گاہکوں کی فہرست (Select Customer from List)
                      </h4>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                        {customers.length} Accounts
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCustomerListOpen(false)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 font-urdu">
                    کسی بھی گاہک پر کلک کر کے اسے نامزد کریں، پھر وائس ریکارڈنگ شروع کریں:
                  </p>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      placeholder="گاہک تلاش کریں (Search by name or phone)..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      autoFocus
                    />
                  </div>

                  {/* Customer items */}
                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                    {filteredCustomers.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-400 font-urdu">
                        کوئی گاہک نہیں ملا (No customer found)
                      </div>
                    ) : (
                      filteredCustomers.map((customer) => {
                        const isSelected = currentCustomer?.id === customer.id;
                        return (
                          <div
                            key={customer.id}
                            onClick={() => handleSelectCustomer(customer)}
                            className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-50 border-emerald-400 shadow-xs'
                                : 'bg-white hover:bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                                  isSelected
                                    ? 'bg-emerald-700 text-white'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {customer.name.slice(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 text-xs font-urdu">
                                    {customer.nameUrdu || customer.name}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-sans">
                                    ({customer.name})
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {customer.phone || 'No phone'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="text-[9px] text-slate-400">موجودہ قرض:</div>
                                <div
                                  className={`text-xs font-bold font-mono ${
                                    customer.balance > 0
                                      ? 'text-rose-600'
                                      : 'text-emerald-600'
                                  }`}
                                >
                                  {customer.balance.toLocaleString()} {currencyUnit}
                                </div>
                              </div>

                              <button
                                type="button"
                                className={`p-1.5 rounded-lg flex items-center gap-1 text-[10px] font-bold ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                <Check className="w-3 h-3" />
                                <span>{isSelected ? 'Selected' : 'Select'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Transaction Type Choice: Debit (+) vs Credit (-) */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleToggleKhataType('Debit')}
                className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-xs cursor-pointer ${
                  selectedKhataType === 'Debit'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                    : 'text-slate-700 hover:bg-slate-200/70'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>DEBIT (+ قرض دیا / Add)</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleKhataType('Credit')}
                className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-xs cursor-pointer ${
                  selectedKhataType === 'Credit'
                    ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/25'
                    : 'text-slate-700 hover:bg-slate-200/70'
                }`}
              >
                <MinusCircle className="w-4 h-4" />
                <span>CREDIT (- وصولی / Subtract)</span>
              </button>
            </div>
          </div>

          {/* 2. VOICE RECORDING INTERACTION AREA */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-slate-50 to-white border border-slate-200 text-center space-y-3">
            <div className="flex flex-col items-center justify-center">
              <button
                type="button"
                id="voice-mic-main-record-btn"
                onClick={() => {
                  if (isRecording) {
                    stopVoiceRecording();
                  } else {
                    startVoiceRecording();
                  }
                }}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all transform active:scale-95 cursor-pointer relative ${
                  isRecording
                    ? 'bg-rose-600 text-white shadow-rose-600/40 animate-pulse ring-8 ring-rose-200'
                    : currentCustomer
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-600/30 hover:shadow-xl hover:scale-105'
                    : 'bg-slate-400 text-white opacity-85 hover:opacity-100'
                }`}
              >
                {isRecording ? <MicOff className="w-9 h-9" /> : <Mic className="w-9 h-9" />}
                {isRecording && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
                  </span>
                )}
              </button>

              <div className="mt-3">
                <span className="text-xs font-black text-slate-800 font-urdu block">
                  {isRecording
                    ? 'بولیں... رقم اور تفصیل سن رہے ہیں (Listening...)'
                    : currentCustomer
                    ? 'مائیک دبائیں اور بولیں (e.g. "پانچ سو روپے قرض دیا" یا "10220 وصولی")'
                    : 'پہلے اوپر دیے گئے بٹن سے گاہک منتخب کریں'}
                </span>
                <span className="text-[11px] text-slate-500 font-sans block mt-0.5">
                  Offline Algorithmic Parser & Dynamic User Voice Corrections
                </span>
              </div>
            </div>

            {/* Error Message */}
            {micError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold font-urdu flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{micError}</span>
              </div>
            )}

            {/* Spoken Live Transcript */}
            {transcript && (
              <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 font-urdu text-sm font-medium">
                <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-sans font-bold block mb-0.5">
                  Spoken Transcript:
                </span>
                &quot;{transcript}&quot;
              </div>
            )}

            {/* Manual Text Input Fallback */}
            <form onSubmit={handleManualSubmit} className="pt-2 flex items-center gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="یا اردو/انگریزی میں لکھیں (e.g. 10220 روپے دیے)..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-urdu"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs"
              >
                تجزیہ کریں
              </button>
            </form>
          </div>

          {/* Action Feedback Banner */}
          {actionFeedback && (
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold text-center text-xs">
              {actionFeedback}
            </div>
          )}

          {/* 3. PARSED OUTPUT CARD WITH FORMULA & BALANCE STATUS */}
          {parsedResult && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="p-4 rounded-3xl bg-slate-900 text-white shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      Module: Khata Ledger
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        parsedResult.transaction_type === 'Credit'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                      }`}
                    >
                      {parsedResult.transaction_type === 'Credit' ? 'CREDIT (وصولی)' : 'DEBIT (قرض دیا)'}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-mono font-black px-2.5 py-1 rounded-xl shadow-xs ${
                      parsedResult.math_action === 'ADD'
                        ? 'bg-rose-500 text-white ring-2 ring-rose-300/40'
                        : 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300/40'
                    }`}
                  >
                    {parsedResult.math_action === 'ADD' ? 'PLUS (+)' : 'MINUS (-)'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between border-t border-slate-800 pt-2.5">
                  <div>
                    <div className="text-[11px] text-slate-400">Assigned Customer Account:</div>
                    <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5 font-urdu">
                      <span>{currentCustomer?.nameUrdu || parsedResult.person_name}</span>
                      {currentCustomer && (
                        <span className="text-[10px] font-mono text-emerald-400 font-normal">
                          (ID: {currentCustomer.id})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">Exact Parsed Amount:</div>
                    <div className="text-2xl font-black font-mono text-emerald-400">
                      {parsedResult.parsed_amount.toLocaleString()} {currencyUnit}
                    </div>
                  </div>
                </div>

                {/* Direct Exact Amount Input Box with Dynamic Learning Trigger */}
                <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-700/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200 font-urdu flex items-center gap-1.5">
                      <span>رقم کا درست اندراج (Amount Field - Edit to Learn):</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 border border-emerald-800/60 px-2 py-0.5 rounded-full font-bold">
                      بغیر راؤنڈ آف • Exact Number
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      id="parsed-amount-editable-input"
                      type="number"
                      value={amountInput}
                      onChange={(e) => handleAmountInputChange(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xl font-black font-mono text-emerald-400 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-urdu">
                      {currencyUnit}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 text-right font-urdu">
                    اگر رقم میں تبدیلی کرنی ہو تو یہاں تبدیل کریں، سسٹم آئندہ کیلئے خود بخود یاد رکھے گا
                  </div>

                  {learnedCorrection && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-900/60 border border-purple-500/40 text-purple-200 text-[11px] font-medium">
                      <Brain className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>
                        Dynamic Learning Applied for <strong>&quot;{learnedCorrection.spoken_transcript}&quot;</strong> ➔{' '}
                        <strong className="text-white font-mono">{learnedCorrection.corrected_number.toLocaleString()}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* CORE FORMULA & BALANCE CALCULATION PREVIEW */}
                <div
                  className={`p-3 rounded-2xl border ${
                    newDebt > 0
                      ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                      : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                  } space-y-1.5`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="font-urdu">
                      {parsedResult.transaction_type === 'Credit'
                        ? 'وصولی فارمولا (Credit / Subtraction):'
                        : 'قرض دیا فارمولا (Debit / Addition):'}
                    </span>
                    <span className="font-mono text-[11px]">
                      {parsedResult.transaction_type === 'Credit'
                        ? `New Debt = ${currentDebt.toLocaleString()} - ${parsedAmt.toLocaleString()}`
                        : `New Debt = ${currentDebt.toLocaleString()} + ${parsedAmt.toLocaleString()}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-white/10">
                    <span className="text-xs">نتیجہ بقایا کھاتہ (New Projected Balance):</span>
                    <span
                      className={`text-lg font-black font-mono ${
                        newDebt > 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {newDebt.toLocaleString()} {currencyUnit}
                    </span>
                  </div>

                  <div className="text-[11px] font-urdu text-right font-semibold">
                    {newDebt > 0 ? (
                      <span className="text-rose-400">
                        بقایا ایکٹیو قرض (Active Debt - Strictly in RED)
                      </span>
                    ) : newDebt === 0 ? (
                      <span className="text-emerald-400">
                        ✓ تمام ادھار صاف ہو گیا (Debt Cleared - Strictly in GREEN)
                      </span>
                    ) : (
                      <span className="text-emerald-400">
                        ✓ ایڈوانس پیشگی رقم (Advance Credit - Strictly in GREEN)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Pure JSON Output Schema */}
              <div className="rounded-2xl border border-slate-200 bg-slate-900 overflow-hidden shadow-xs">
                <div className="px-3.5 py-2 bg-slate-950 flex items-center justify-between border-b border-slate-800 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-300 font-mono font-bold">
                    <Code className="w-3.5 h-3.5 text-emerald-400" />
                    <span>OUTPUT FORMAT (JSON)</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-[10px]"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-3 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                  {formattedJsonOutput}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs cursor-pointer transition-colors"
          >
            Close
          </button>

          {parsedResult && (
            <button
              type="button"
              id="confirm-khata-voice-tx-btn"
              onClick={handleConfirmAndSave}
              className={`px-5 py-2.5 rounded-2xl text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 ${
                parsedResult.transaction_type === 'Credit'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {parsedResult.transaction_type === 'Credit'
                  ? 'وصولی درج کریں (Confirm Credit)'
                  : 'قرض درج کریں (Confirm Debit)'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
