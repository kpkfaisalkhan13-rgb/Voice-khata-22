import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  MicOff,
  CheckCircle2,
  XCircle,
  Volume2,
  AlertTriangle,
  UserPlus,
  ArrowRight,
  Info,
  X,
  Keyboard,
  Sparkles,
  Search,
  BookOpen,
  Layers,
  Calculator,
  Copy,
  Check,
  RotateCcw,
  Code,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Customer,
  VoiceParseResult,
  MultiVoiceParseResult,
  MultiTransactionParseResponse,
  VoiceIntentClassification,
  VoiceEngineResponse,
  UserVoiceCorrection,
} from '../types';
import { dbService } from '../services/db';
import { connectivityService } from '../services/connectivityService';
import {
  parseVoiceCommandComprehensive,
  parseVoiceEngineCommand,
} from '../utils/urduParser';
import {
  playSuccessChime,
  playErrorAlert,
  playVoiceStartSound,
  playVoiceStopSound,
  playClickSound,
} from '../utils/audio';
import {
  transcribeAudioWithGroq,
  parseMultiTransactionsWithGroqAI,
  classifyVoiceIntentWithGroqAI,
  processWithVoiceEngineGroqAI,
  BrowserUrduSpeechRecognizer,
} from '../services/groqWhisper';
import { useLanguage } from '../i18n/LanguageContext';

interface VoiceEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onConfirmTransaction: (parsed: VoiceParseResult) => Promise<void>;
  onCreateNewCustomer: (name: string, nameUrdu: string, initialAmount?: number) => void;
  onSelectCustomer?: (customer: Customer) => void;
  groqApiKey: string;
  whisperModel: string;
}

export const VoiceEntryModal: React.FC<VoiceEntryModalProps> = ({
  isOpen,
  onClose,
  customers,
  onConfirmTransaction,
  onCreateNewCustomer,
  onSelectCustomer,
  groqApiKey,
  whisperModel,
}) => {
  const { t, isUrdu } = useLanguage();

  // Voice recording & transcription state
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Parsed results state
  const [voiceEngineResult, setVoiceEngineResult] = useState<VoiceEngineResponse | null>(null);
  const [parseResult, setParseResult] = useState<VoiceParseResult | null>(null);
  const [multiResult, setMultiResult] = useState<MultiVoiceParseResult | null>(null);
  const [copiedCalc, setCopiedCalc] = useState(false);
  const [showJsonView, setShowJsonView] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Audio visualization & error state
  const [audioLevel, setAudioLevel] = useState<number[]>(new Array(16).fill(6));
  const [recordDuration, setRecordDuration] = useState(0);
  const [noSpeechDetected, setNoSpeechDetected] = useState(false);
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const liveTranscriptRef = useRef<string>('');
  const speechRecognizerRef = useRef<BrowserUrduSpeechRecognizer | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Safe media cleanup function
  const cleanupMediaTracks = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore
        }
      });
    }
  }, []);

  // Clear all states on modal close or open
  useEffect(() => {
    if (!isOpen) {
      if (isRecording) {
        stopRecording();
      }
      cleanupMediaTracks();
      setTranscript('');
      setManualInput('');
      setParseResult(null);
      setMultiResult(null);
      setVoiceEngineResult(null);
      setIsProcessing(false);
      setProcessingStatus('');
      setNoSpeechDetected(false);
      setMicErrorMessage(null);
      setCopiedCalc(false);
    }
  }, [isOpen, cleanupMediaTracks]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      cleanupMediaTracks();
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [cleanupMediaTracks]);

  // Record duration timer
  useEffect(() => {
    if (isRecording) {
      setRecordDuration(0);
      durationTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [isRecording]);

  // Simulated animated audio levels during active recording
  useEffect(() => {
    if (!isRecording) {
      setAudioLevel(new Array(16).fill(6));
      return;
    }

    const interval = setInterval(() => {
      setAudioLevel(
        Array.from({ length: 16 }, () => Math.floor(Math.random() * 26) + 6)
      );
    }, 90);

    return () => clearInterval(interval);
  }, [isRecording]);

  // Start live voice recording
  const startRecording = async () => {
    // Network Connectivity Guardrail: Check network status before voice input
    const connCheck = connectivityService.checkVoiceAvailability(isUrdu);
    if (!connCheck.allowed) {
      playErrorAlert();
      setMicErrorMessage(
        connCheck.message ||
          'Voice features require an internet connection. Please connect to the internet or use manual entry.'
      );
      setShowManualInput(true);
      return;
    }

    setMicErrorMessage(null);
    setNoSpeechDetected(false);
    setTranscript('');
    setParseResult(null);
    setMultiResult(null);
    setVoiceEngineResult(null);
    setCopiedCalc(false);
    audioChunksRef.current = [];
    liveTranscriptRef.current = '';

    playVoiceStartSound();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Initialize MediaRecorder
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/wav',
      ];
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      const mediaRecorder = selectedMime
        ? new MediaRecorder(stream, { mimeType: selectedMime })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: selectedMime || 'audio/webm',
        });
        cleanupMediaTracks();
        parseVoiceInput(audioBlob);
      };

      mediaRecorder.start(250); // timeslice: flush audio every 250ms
      setIsRecording(true);

      // Start Browser Web Speech API as live feedback
      try {
        const recognizer = new BrowserUrduSpeechRecognizer();
        recognizer.start(
          (liveText) => {
            liveTranscriptRef.current = liveText;
            setTranscript(liveText);
          },
          (err) => {
            console.warn('Web Speech recognizer notice:', err);
          },
          () => {
            // Speech ended
          }
        );
        speechRecognizerRef.current = recognizer;
      } catch (speechErr) {
        console.warn('Live Web Speech API unavailable:', speechErr);
      }
    } catch (err: unknown) {
      console.error('Microphone access failed:', err);
      const error = err as { name?: string; message?: string };
      setIsRecording(false);
      playErrorAlert();

      if (
        error.name === 'NotAllowedError' ||
        error.name === 'PermissionDeniedError'
      ) {
        setMicErrorMessage(
          'براہ کرم مائیکروفون کی اجازت دیں (Allow Microphone Permission)'
        );
      } else if (
        error.name === 'NotFoundError' ||
        error.name === 'DevicesNotFoundError'
      ) {
        setMicErrorMessage(
          'کوئی مائیکروفون نہیں ملا۔ برائے مہربانی مائیک منسلک کریں۔'
        );
      } else {
        setMicErrorMessage(
          `مائیکروفون ایرر: ${error.message || 'اجازت نہیں مل سکی'}`
        );
      }
    }
  };

  // Stop active voice recording
  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    playVoiceStopSound();

    if (speechRecognizerRef.current) {
      try {
        speechRecognizerRef.current.stop();
      } catch {
        // Ignore
      }
      speechRecognizerRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('MediaRecorder stop error:', err);
      }
    }
  };

  // Process audio blob and transcribe
  const parseVoiceInput = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setProcessingStatus(isUrdu ? 'آواز کی شناخت کی جا رہی ہے...' : 'Transcribing voice...');

    let transcribedText = '';
    let groqEngineData: VoiceEngineResponse | null = null;
    let groqIntentData: VoiceIntentClassification | null = null;
    let groqMultiData: MultiTransactionParseResponse | null = null;

    // 1. Groq Whisper audio transcription
    if (groqApiKey && audioBlob.size > 2000) {
      try {
        setProcessingStatus(
          isUrdu
            ? `گروک وسپر (${whisperModel}) سے آواز سمجھی جا رہی ہے...`
            : `Transcribing via Groq Whisper (${whisperModel})...`
        );
        const whisperRes = await transcribeAudioWithGroq(
          audioBlob,
          groqApiKey,
          whisperModel
        );
        if (whisperRes && whisperRes.text) {
          transcribedText = whisperRes.text;
        }
      } catch (err) {
        console.warn('Groq Whisper error, using fallback:', err);
      }
    }

    // 2. Fallback to Web Speech API live captured text
    if (!transcribedText) {
      transcribedText = (transcript || liveTranscriptRef.current || '').trim();
    }

    if (!transcribedText) {
      setNoSpeechDetected(true);
      setParseResult(null);
      setMultiResult(null);
      setVoiceEngineResult(null);
      setIsProcessing(false);
      setProcessingStatus('');
      playErrorAlert();
      return;
    }

    setTranscript(transcribedText);

    // 3. Process with Groq AI Multilingual Voice Engine
    if (groqApiKey) {
      try {
        setProcessingStatus(
          isUrdu
            ? 'وائس انجن اور ارادے (Intent) کا تجزیہ جاری ہے...'
            : 'Voice Engine processing calculations & ledger intents...'
        );

        // Step 1: Voice Engine (Calculations + Ledger Merging)
        groqEngineData = await processWithVoiceEngineGroqAI(
          transcribedText,
          customers.map((c) => ({ id: c.id, name: c.name, nameUrdu: c.nameUrdu })),
          groqApiKey
        );

        // Step 2: Intent classification (check if user wants to search account)
        groqIntentData = await classifyVoiceIntentWithGroqAI(transcribedText, groqApiKey);

        // Step 3: If multi-item transactions are present
        if (groqIntentData?.intent !== 'SEARCH_ACCOUNT' && (!groqEngineData || groqEngineData.mode !== 'CALCULATOR')) {
          groqMultiData = await parseMultiTransactionsWithGroqAI(transcribedText, groqApiKey);
        }
      } catch (aiErr) {
        console.warn('Groq AI parser error:', aiErr);
      }
    }

    processTranscript(transcribedText, groqEngineData, groqMultiData, groqIntentData);
    setIsProcessing(false);
    setProcessingStatus('');
  };

  const processTranscript = (
    spokenText: string,
    groqEngine?: VoiceEngineResponse | null,
    groqMulti?: MultiTransactionParseResponse | null,
    groqIntent?: VoiceIntentClassification | null
  ) => {
    if (!spokenText.trim()) {
      setNoSpeechDetected(true);
      setParseResult(null);
      setMultiResult(null);
      setVoiceEngineResult(null);
      return;
    }
    setNoSpeechDetected(false);
    setTranscript(spokenText);

    // 1. Process with Voice Engine (Calculations & Ledger Merging)
    const engineRes = parseVoiceEngineCommand(spokenText, customers, groqEngine);
    setVoiceEngineResult(engineRes);

    // CASE A: Pure Voice Calculator
    if (engineRes.mode === 'CALCULATOR') {
      setParseResult(null);
      setMultiResult(null);
      playSuccessChime();
      try {
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.6 },
        });
      } catch {
        // Ignore
      }
      return;
    }

    // CASE B: Search Account Query
    const comprehensive = parseVoiceCommandComprehensive(
      spokenText,
      customers,
      groqMulti,
      groqIntent
    );

    if (comprehensive.intent === 'SEARCH_ACCOUNT') {
      setMultiResult(comprehensive);
      setParseResult(null);
      if (comprehensive.matchedSearchCustomer) {
        playSuccessChime();
        try {
          confetti({
            particleCount: 35,
            spread: 45,
            origin: { y: 0.6 },
          });
        } catch {
          // Ignore
        }
      } else {
        playErrorAlert();
      }
      return;
    }

    // CASE C: Multi-item Transactions (2 or more distinct entries)
    if (comprehensive.transactions.length > 1) {
      setMultiResult(comprehensive);
      setParseResult(null);
      const anyValid = comprehensive.transactions.some((t) => t.exists);
      if (anyValid) {
        playSuccessChime();
        try {
          confetti({
            particleCount: 45,
            spread: 55,
            origin: { y: 0.6 },
          });
        } catch {
          // Ignore
        }
      } else {
        playErrorAlert();
      }
      return;
    }

    // CASE D: Single Ledger Transaction (with existing account merging & math resolution)
    setMultiResult(null);
    if (engineRes.ledger_data) {
      // Auto-Lookup user_voice_corrections table before displaying result
      const learnedCorrection = dbService.findVoiceCorrection(spokenText);
      const finalAmount = learnedCorrection && learnedCorrection.corrected_number > 0
        ? learnedCorrection.corrected_number
        : engineRes.ledger_data.amount;

      const matched =
        customers.find(
          (c) => c.name.toLowerCase() === engineRes.ledger_data!.account_name.toLowerCase()
        ) || null;

      const singleResult: VoiceParseResult = {
        customerName: engineRes.ledger_data.account_name,
        customerNameUrdu: matched ? matched.nameUrdu : engineRes.ledger_data.account_name,
        amount: finalAmount,
        type: engineRes.ledger_data.type,
        rawText: spokenText,
        matchedCustomer: matched,
        exists: engineRes.ledger_data.is_existing_account && !!matched,
        notes: learnedCorrection
          ? `Auto-applied Custom Learning: "${learnedCorrection.spoken_transcript}" ➔ ${finalAmount}`
          : engineRes.calculator_data?.expression
          ? `Voice Calculation: ${engineRes.calculator_data.expression} = ${engineRes.calculator_data.result}`
          : undefined,
      };

      setParseResult(singleResult);
      if (singleResult.exists && singleResult.matchedCustomer) {
        playSuccessChime();
        try {
          confetti({
            particleCount: 45,
            spread: 55,
            origin: { y: 0.6 },
          });
        } catch {
          // Ignore
        }
      } else {
        playErrorAlert();
      }
    }
  };

  // Test phrases covering Voice Engine, Math Calculations, Multi-transactions, and Search
  const testPhrases = [
    {
      label: 'Ali ko 500 plus 200 diye (Math + Merge)',
      text: 'Ali ko 500 plus 200 diye',
      tag: 'Ledger + Math (700)',
    },
    {
      label: '500 plus 200 zarb 3 (Calculator)',
      text: '500 plus 200 zarb 3',
      tag: 'Calculator (1,100)',
    },
    {
      label: '10 hazar zarb 3 (Voice Calculator)',
      text: '10 hazar zarb 3',
      tag: 'Calculator (30,000)',
    },
    {
      label: '2 lakh 50 hazar jama 30 hazar (Positional)',
      text: '2 lakh 50 hazar jama 30 hazar',
      tag: 'Positional (280,000)',
    },
    {
      label: '1500 taqseem 3 (Division)',
      text: '1500 taqseem 3',
      tag: 'Divide (500)',
    },
    {
      label: 'Received 1200 from Rahul (CREDIT)',
      text: 'Received 1200 from Rahul',
      tag: 'CREDIT',
    },
    {
      label: 'Usman ne 300 wapas kiye (CREDIT)',
      text: 'Usman ne 300 wapas kiye',
      tag: 'CREDIT',
    },
    {
      label: 'Ali ka khata dikhao (Search Query)',
      text: 'Ali ka khata dikhao',
      tag: 'Search',
    },
    {
      label: 'Ali ko 500 diye aur Rahul se 1200 milay (Multi)',
      text: 'Ali ko 500 diye aur Rahul se 1200 milay',
      tag: 'Multi (2 Txns)',
    },
  ];

  const handleApplyPreset = async (text: string) => {
    playClickSound();
    setIsProcessing(true);
    setProcessingStatus(isUrdu ? 'وائس انجن تجزیہ کر رہا ہے...' : 'Voice Engine analyzing...');

    let groqEngineData: VoiceEngineResponse | null = null;
    let groqIntentData: VoiceIntentClassification | null = null;
    let groqMultiData: MultiTransactionParseResponse | null = null;

    if (groqApiKey) {
      try {
        groqEngineData = await processWithVoiceEngineGroqAI(
          text,
          customers.map((c) => ({ id: c.id, name: c.name, nameUrdu: c.nameUrdu })),
          groqApiKey
        );
        groqIntentData = await classifyVoiceIntentWithGroqAI(text, groqApiKey);
        if (groqIntentData?.intent !== 'SEARCH_ACCOUNT' && (!groqEngineData || groqEngineData.mode !== 'CALCULATOR')) {
          groqMultiData = await parseMultiTransactionsWithGroqAI(text, groqApiKey);
        }
      } catch (err) {
        console.warn('Groq AI preset parse err:', err);
      }
    }

    processTranscript(text, groqEngineData, groqMultiData, groqIntentData);
    setIsProcessing(false);
    setProcessingStatus('');
  };

  const handleConfirmSave = async () => {
    if (!parseResult || !parseResult.exists || !parseResult.matchedCustomer) return;
    playClickSound();
    await onConfirmTransaction(parseResult);
    onClose();
  };

  const handleConfirmSingleItem = async (item: VoiceParseResult) => {
    if (!item.exists || !item.matchedCustomer) return;
    playClickSound();
    await onConfirmTransaction(item);
    setMultiResult((prev) => {
      if (!prev) return null;
      const remaining = prev.transactions.filter((t) => t !== item);
      if (remaining.length === 0) {
        onClose();
        return null;
      }
      return { ...prev, transactions: remaining };
    });
    playSuccessChime();
  };

  const handleConfirmAllValid = async () => {
    if (!multiResult) return;
    const validItems = multiResult.transactions.filter(
      (t) => t.exists && t.matchedCustomer
    );
    if (validItems.length === 0) return;
    playClickSound();
    for (const item of validItems) {
      await onConfirmTransaction(item);
    }
    playSuccessChime();
    onClose();
  };

  const handleOpenSearchLedger = (cust: Customer) => {
    playClickSound();
    if (onSelectCustomer) {
      onSelectCustomer(cust);
    }
    onClose();
  };

  const handleCreateCustomerFromBlocked = () => {
    if (!parseResult) return;
    playClickSound();
    onCreateNewCustomer(
      parseResult.customerName,
      parseResult.customerNameUrdu,
      parseResult.type === 'DEBIT' ? parseResult.amount : -parseResult.amount
    );
    onClose();
  };

  const handleCopyCalcResult = () => {
    if (!voiceEngineResult?.calculator_data) return;
    playClickSound();
    navigator.clipboard.writeText(String(voiceEngineResult.calculator_data.result));
    setCopiedCalc(true);
    setTimeout(() => setCopiedCalc(false), 2000);
  };

  const handleCopyEngineJson = () => {
    if (!voiceEngineResult) return;
    playClickSound();
    navigator.clipboard.writeText(JSON.stringify(voiceEngineResult, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleUseCalcInLedger = () => {
    if (!voiceEngineResult?.calculator_data) return;
    playClickSound();
    // Default to first customer if available, or prompt
    const defaultCust = customers[0] || null;
    setVoiceEngineResult({
      mode: 'LEDGER',
      ledger_data: {
        account_name: defaultCust ? defaultCust.name : 'Customer',
        is_existing_account: Boolean(defaultCust),
        amount: voiceEngineResult.calculator_data.result,
        type: 'DEBIT',
      },
      calculator_data: voiceEngineResult.calculator_data,
      raw_text: transcript,
    });
    setParseResult({
      customerName: defaultCust ? defaultCust.name : 'Customer',
      customerNameUrdu: defaultCust ? defaultCust.nameUrdu : 'گاہک',
      amount: voiceEngineResult.calculator_data.result,
      type: 'DEBIT',
      rawText: transcript,
      matchedCustomer: defaultCust,
      exists: Boolean(defaultCust),
      notes: `Voice Calculation: ${voiceEngineResult.calculator_data.expression} = ${voiceEngineResult.calculator_data.result}`,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="w-full max-w-md bg-white border border-[#E0E0E0] rounded-2xl p-6 shadow-xl relative text-slate-800 my-4"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
          aria-label={t.close}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium mb-2">
            <Mic className="w-3.5 h-3.5 text-emerald-600" />
            <span className={isUrdu ? 'font-urdu' : ''}>{t.voiceModalTitle}</span>
          </div>
          <h3 className={`text-lg font-bold tracking-tight text-slate-900 ${isUrdu ? 'font-urdu' : ''}`}>
            {t.voiceModalTitle}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.voiceModalSubtitle}
          </p>
        </div>

        {/* Interactive Microphone Record Area */}
        <div className="flex flex-col items-center justify-center my-3">
          <button
            id="voice-record-btn"
            onClick={() => {
              if (isRecording) {
                stopRecording();
              } else {
                startRecording();
              }
            }}
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-md transition-all ${
              isRecording
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white'
            }`}
            aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
          >
            {isRecording ? (
              <MicOff className="w-8 h-8 text-white animate-pulse" />
            ) : (
              <Mic className="w-8 h-8 text-white" />
            )}
          </button>

          {/* Dynamic Status Indicator */}
          <div className="mt-3 text-center">
            <span
              className={`text-xs font-medium px-3 py-1 rounded-full inline-flex items-center gap-1.5 ${
                isRecording
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {isRecording && <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />}
              <span className={isUrdu ? 'font-urdu' : ''}>
                {isRecording
                  ? `${t.voiceModalListening} (${recordDuration}s)`
                  : t.voiceModalIdle}
              </span>
            </span>
          </div>

          {/* Audio Waveform visualizer */}
          {isRecording && (
            <div className="flex items-center justify-center gap-1 h-8 mt-3">
              {audioLevel.map((lvl, idx) => (
                <div
                  key={idx}
                  className="w-1 bg-emerald-600 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(4, lvl)}px` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Error notice for microphone permissions */}
        {micErrorMessage && (
          <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-urdu leading-normal">{micErrorMessage}</span>
          </div>
        )}

        {/* Warning: No speech detected */}
        {noSpeechDetected && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className={isUrdu ? 'font-urdu' : ''}>
              {t.voiceModalNoSpeechDetected}
            </span>
          </motion.div>
        )}

        {/* Live Audio Transcript Box */}
        {(transcript || isProcessing) && (
          <div className="bg-slate-50 border border-[#E0E0E0] rounded-xl p-3 mb-3 text-center">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="flex items-center gap-1 font-medium">
                <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t.voiceModalSpokenText}</span>
              </span>
              {groqApiKey && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-medium">
                  <Sparkles className="w-3 h-3" />
                  <span>Groq Engine</span>
                </span>
              )}
            </div>

            <p className={`text-base font-semibold text-slate-800 leading-normal min-h-[26px] ${isUrdu ? 'font-urdu' : ''}`}>
              {isProcessing ? processingStatus || t.voiceModalProcessing : `"${transcript}"`}
            </p>

            {/* Voice Engine JSON Output Inspector Toggle */}
            {voiceEngineResult && (
              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => setShowJsonView(!showJsonView)}
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-700 font-mono font-medium transition-colors"
                >
                  <Code className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{showJsonView ? 'Hide JSON Output' : 'View Engine JSON'}</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200 text-slate-700 font-bold ml-0.5">
                    {voiceEngineResult.mode}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyEngineJson}
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-emerald-700 font-medium transition-colors"
                >
                  {copiedJson ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Expandable JSON Output */}
            {showJsonView && voiceEngineResult && (
              <motion.pre
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 text-left bg-slate-900 text-emerald-400 p-2.5 rounded-lg text-[11px] font-mono overflow-x-auto leading-tight shadow-inner"
              >
                {JSON.stringify(voiceEngineResult, null, 2)}
              </motion.pre>
            )}
          </div>
        )}

        {/* RESULT SECTION: VOICE CALCULATOR vs SEARCH ACCOUNT vs MULTI-ITEM vs SINGLE LEDGER */}
        <AnimatePresence>
          {/* =========================================
              1. VOICE CALCULATOR RESULT CARD
              ========================================= */}
          {voiceEngineResult &&
            voiceEngineResult.mode === 'CALCULATOR' &&
            voiceEngineResult.calculator_data && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-3"
              >
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 text-center shadow-xs">
                  <div className="w-9 h-9 mx-auto rounded-full bg-indigo-100 flex items-center justify-center mb-1.5">
                    <Calculator className="w-5 h-5 text-indigo-600" />
                  </div>

                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-semibold mb-1">
                    {t.voiceCalculatorTitle}
                  </span>

                  {/* Mathematical Expression */}
                  <div className="bg-white border border-indigo-100 rounded-lg p-2.5 mt-2 text-center">
                    <span className="text-[11px] text-slate-500 block mb-0.5 font-medium">
                      {t.voiceExpression}
                    </span>
                    <p className="font-mono text-sm text-slate-700 tracking-wider">
                      {voiceEngineResult.calculator_data.expression}
                    </p>

                    {/* Evaluated Result */}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">{t.voiceCalculationResult}:</span>
                      <span className="text-xl font-extrabold text-indigo-700 font-mono">
                        = {voiceEngineResult.calculator_data.result.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Calculator Actions */}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleCopyCalcResult}
                      className="flex-1 py-2 px-3 rounded-lg bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-700 font-medium text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      {copiedCalc ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCalc ? 'Copied!' : t.voiceCopyResult}</span>
                    </button>

                    <button
                      onClick={handleUseCalcInLedger}
                      className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span className={isUrdu ? 'font-urdu' : ''}>{t.voiceUseInLedger}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          {/* =========================================
              2. SEARCH ACCOUNT QUERY INTENT
              ========================================= */}
          {multiResult && multiResult.intent === 'SEARCH_ACCOUNT' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-3"
            >
              <div className="bg-slate-50 border border-[#E0E0E0] rounded-xl p-3.5 text-center">
                <div className="w-9 h-9 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-1.5">
                  <Search className="w-5 h-5 text-blue-600" />
                </div>

                <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-semibold mb-1">
                  {t.voiceSearchIntentTitle}
                </span>

                <p className="text-xs text-slate-500 mb-2">
                  {isUrdu ? 'مطلوبہ کھاتہ:' : 'Target Account:'}{' '}
                  <span className="font-semibold text-slate-800">{multiResult.targetName || '—'}</span>
                </p>

                {multiResult.matchedSearchCustomer ? (
                  <div className="bg-white border border-emerald-200 rounded-lg p-3 text-left mb-2 shadow-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="font-bold text-slate-900 font-urdu text-sm block">
                          {multiResult.matchedSearchCustomer.nameUrdu}
                        </span>
                        <span className="text-xs text-slate-500">
                          {multiResult.matchedSearchCustomer.name}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        کھاتہ موجود ہے
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                      <span className="text-slate-500">{t.netBalance}:</span>
                      <span
                        className={`font-bold ${
                          multiResult.matchedSearchCustomer.balance > 0
                            ? 'text-emerald-700'
                            : multiResult.matchedSearchCustomer.balance < 0
                            ? 'text-rose-700'
                            : 'text-slate-600'
                        }`}
                      >
                        {multiResult.matchedSearchCustomer.balance > 0
                          ? `${multiResult.matchedSearchCustomer.balance.toLocaleString()} PKR (${t.totalReceive})`
                          : multiResult.matchedSearchCustomer.balance < 0
                          ? `${Math.abs(multiResult.matchedSearchCustomer.balance).toLocaleString()} PKR (${t.totalGive})`
                          : '0 PKR (Settled)'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenSearchLedger(multiResult.matchedSearchCustomer!)}
                      className="w-full mt-3 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span className={isUrdu ? 'font-urdu' : ''}>{t.voiceOpenLedger}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-center mb-2">
                    <div className="inline-flex items-center gap-1 text-xs text-rose-800 font-semibold mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>{t.voiceModalCustomerNotFound}</span>
                    </div>
                    <p className="text-xs text-slate-600 mb-2 font-urdu">
                      نام &quot;{multiResult.targetName}&quot; کا کھاتہ درج نہیں ہے۔ نیا کھاتہ کھولیں۔
                    </p>
                    <button
                      onClick={() => {
                        onCreateNewCustomer(multiResult.targetName || '', multiResult.targetName || '');
                        onClose();
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span className={isUrdu ? 'font-urdu' : ''}>{t.voiceModalCreateCustomer}</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* =========================================
              3. MULTI-ITEM TRANSACTIONS (2+ entries)
              ========================================= */}
          {multiResult &&
            multiResult.intent === 'ADD_TRANSACTION' &&
            multiResult.transactions.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-3"
              >
                <div className="bg-slate-50 border border-[#E0E0E0] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      <span>
                        {multiResult.transactions.length} {t.voiceMultiEntriesFound}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {multiResult.transactions.filter((t) => t.exists).length} / {multiResult.transactions.length} Valid
                    </span>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {multiResult.transactions.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg border text-xs bg-white ${
                          item.exists ? 'border-emerald-200' : 'border-rose-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 font-urdu text-sm">
                                {item.customerNameUrdu}
                              </span>
                              <span className="text-slate-400 text-[10px]">
                                ({item.customerName})
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-bold text-slate-900 font-mono">
                                {item.amount.toLocaleString()} PKR
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  item.type === 'DEBIT'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {item.type === 'DEBIT' ? 'DEBIT (قرض دیا)' : 'CREDIT (وصول ہوا)'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right flex flex-col items-end gap-1">
                            {item.exists && item.matchedCustomer ? (
                              <button
                                onClick={() => handleConfirmSingleItem(item)}
                                className="py-1 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] flex items-center gap-1 shadow-xs transition-colors"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span className={isUrdu ? 'font-urdu' : ''}>{t.save}</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  onCreateNewCustomer(
                                    item.customerName,
                                    item.customerNameUrdu,
                                    item.type === 'DEBIT' ? item.amount : -item.amount
                                  );
                                  onClose();
                                }}
                                className="py-1 px-2.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-medium text-[11px] flex items-center gap-1 shadow-xs transition-colors"
                              >
                                <UserPlus className="w-3 h-3" />
                                <span className={isUrdu ? 'font-urdu' : ''}>{t.voiceModalCreateCustomer}</span>
                              </button>
                            )}
                            <span className={`text-[10px] ${item.exists ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {item.exists ? 'کھاتہ موجود ہے' : 'کھاتہ موجود نہیں'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Multi-Save All Valid Action */}
                  {multiResult.transactions.filter((t) => t.exists && t.matchedCustomer).length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-200">
                      <button
                        onClick={handleConfirmAllValid}
                        className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        <span className={isUrdu ? 'font-urdu' : ''}>
                          {t.voiceSaveAllValid} (
                          {multiResult.transactions.filter((t) => t.exists && t.matchedCustomer).length})
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          {/* =========================================
              4. SINGLE PARSED TRANSACTION (WITH EXISTING ACCOUNT MERGING)
              ========================================= */}
          {parseResult && (!multiResult || multiResult.transactions.length <= 1) && (!voiceEngineResult || voiceEngineResult.mode !== 'CALCULATOR') && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-3"
            >
              {/* Existing Account Found & Merged */}
              {parseResult.exists && parseResult.matchedCustomer ? (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-center shadow-xs">
                  <div className="w-9 h-9 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-1.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>

                  {/* Existing Account Merged Banner */}
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold mb-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>{t.voiceAccountMerged}</span>
                  </div>

                  <p className="text-[11px] text-emerald-700 mb-1 leading-normal">
                    {t.voiceAccountMergedDesc}
                  </p>

                  <h4 className={`text-sm font-bold text-slate-900 leading-snug mt-1 ${isUrdu ? 'font-urdu' : ''}`}>
                    {parseResult.amount.toLocaleString()} روپے {parseResult.matchedCustomer.nameUrdu || parseResult.matchedCustomer.name} کے کھاتے میں
                  </h4>

                  {/* Math Expression Badge if arithmetic was calculated */}
                  {voiceEngineResult?.calculator_data?.expression &&
                    voiceEngineResult.calculator_data.expression !== String(parseResult.amount) && (
                      <div className="mt-1.5 inline-block px-2.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-mono">
                        حساب: {voiceEngineResult.calculator_data.expression} = {parseResult.amount.toLocaleString()} PKR
                      </div>
                    )}

                  {/* Summary breakdown card */}
                  <div className="grid grid-cols-3 gap-2 bg-white rounded-lg p-2.5 mt-2.5 text-xs border border-[#E0E0E0]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">{t.voiceModalCustomerLabel}</span>
                      <span className="font-semibold text-slate-800 font-urdu text-xs block truncate">
                        {parseResult.matchedCustomer.nameUrdu}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">({parseResult.matchedCustomer.name})</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">{t.voiceModalAmountLabel} (Tap to edit)</span>
                      <input
                        type="number"
                        value={parseResult.amount || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setParseResult({ ...parseResult, amount: val });
                          const activeSpoken = (transcript || parseResult.rawText || '').trim();
                          if (activeSpoken && val > 0) {
                            dbService.saveUserVoiceCorrection(activeSpoken, val);
                          }
                        }}
                        className="font-bold text-slate-900 text-xs w-24 px-1.5 py-0.5 border border-slate-300 rounded font-mono bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">{t.voiceModalTypeLabel}</span>
                      <span
                        className={`font-semibold px-1.5 py-0.5 rounded text-[10px] inline-block mt-0.5 ${
                          parseResult.type === 'DEBIT'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {parseResult.type === 'DEBIT' ? 'DEBIT (قرض دیا)' : 'CREDIT (وصول ہوا)'}
                      </span>
                    </div>
                  </div>

                  {/* Current Account Balance notice */}
                  <div className="mt-2 text-[11px] text-slate-600 bg-white/70 py-1 px-2 rounded border border-slate-100 flex items-center justify-between">
                    <span>موجودہ بقایا:</span>
                    <span className="font-semibold font-mono">
                      {parseResult.matchedCustomer.balance.toLocaleString()} PKR
                    </span>
                  </div>

                  {/* Confirmation Button */}
                  <div className="mt-3 flex gap-2">
                    <button
                      id="confirm-voice-entry-btn"
                      onClick={handleConfirmSave}
                      className="w-full py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <span className={isUrdu ? 'font-urdu' : ''}>{t.voiceModalConfirmSave}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Customer DOES NOT Exist in DB (Requires New Account) */
                <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 text-center shadow-xs">
                  <div className="w-9 h-9 mx-auto rounded-full bg-rose-100 flex items-center justify-center mb-1.5">
                    <XCircle className="w-5 h-5 text-rose-600" />
                  </div>

                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-semibold mb-1.5">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    <span>{t.voiceModalCustomerNotFound}</span>
                  </div>

                  <h4 className={`text-xs font-bold text-rose-900 leading-snug mb-1 ${isUrdu ? 'font-urdu' : ''}`}>
                    {t.voiceModalBlockedTitle}
                  </h4>

                  <p className="text-xs text-slate-600 mb-2.5 font-urdu leading-normal">
                    نام &quot;{parseResult.customerNameUrdu || parseResult.customerName}&quot; ({parseResult.amount.toLocaleString()} روپے) کا کھاتہ پہلے سے موجود نہیں۔ اندراج سے قبل نیا کھاتہ کھولیں۔
                  </p>

                  <div className="flex gap-2 mt-2">
                    <button
                      id="create-new-customer-btn"
                      onClick={handleCreateCustomerFromBlocked}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-1 shadow-xs"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span className={isUrdu ? 'font-urdu' : ''}>{t.voiceModalCreateCustomer}</span>
                    </button>
                    <button
                      id="cancel-blocked-entry-btn"
                      onClick={() => {
                        setParseResult(null);
                        setMultiResult(null);
                        setVoiceEngineResult(null);
                      }}
                      className="py-2 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium"
                    >
                      {t.voiceModalCancel}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Verification Sentences */}
        <div className="mt-2.5 border-t border-slate-100 pt-2.5">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t.voiceModalTestPhrasesTitle}</span>
            </span>
            <button
              onClick={() => setShowManualInput(!showManualInput)}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>{showManualInput ? t.close : t.voiceModalManualEntry}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {testPhrases.map((phrase, idx) => (
              <button
                key={idx}
                id={`preset-phrase-${idx}`}
                onClick={() => handleApplyPreset(phrase.text)}
                className="text-left p-2 rounded-lg bg-slate-50 hover:bg-emerald-50/70 border border-[#E0E0E0] hover:border-emerald-300 text-xs text-slate-700 flex items-center justify-between transition-colors"
              >
                <span className="text-xs font-medium text-slate-800 truncate pr-1">
                  {phrase.label}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 shrink-0 font-mono">
                  {phrase.tag}
                </span>
              </button>
            ))}
          </div>

          {/* Manual Input Fallback */}
          {showManualInput && (
            <div className="mt-2.5 bg-slate-50 p-2.5 rounded-xl border border-[#E0E0E0]">
              <label className="block text-xs text-slate-600 mb-1 font-medium text-right">
                {t.voiceModalManualEntry}:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="مثال: 500 plus 200 zarb 3 یا Ali ko 500 plus 200 diye"
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-urdu"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (manualInput.trim()) handleApplyPreset(manualInput.trim());
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (manualInput.trim()) {
                      handleApplyPreset(manualInput.trim());
                    }
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs"
                >
                  {t.voiceModalCheckText}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
