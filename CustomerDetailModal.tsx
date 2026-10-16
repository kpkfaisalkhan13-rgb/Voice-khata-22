import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Phone,
  MessageCircle,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  FileText,
  AlertTriangle,
  Sliders,
  Search,
  ShieldAlert,
  Trash2,
  Mic,
  MicOff,
  Sparkles,
} from 'lucide-react';
import { Customer, Transaction, TransactionType } from '../types';
import { dbService } from '../services/db';
import { connectivityService } from '../services/connectivityService';
import { playClickSound, playSuccessChime, playAlertSound, playVoiceStartSound, playVoiceStopSound, playErrorAlert } from '../utils/audio';
import { parseUrduNumberText } from '../utils/urduParser';
import { HighlightText } from './HighlightText';
import { useLanguage } from '../i18n/LanguageContext';

interface CustomerDetailModalProps {
  customer: Customer;
  transactions: Transaction[];
  onClose: () => void;
  onAddTransaction: (customerId: string, amount: number, type: TransactionType, note: string) => Promise<void>;
  onUpdateCustomer?: (customerId: string, updates: Partial<Customer>) => Promise<void>;
  onExportPdf?: () => void;
  onDeleteCustomer?: (customer: Customer) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  transactions,
  onClose,
  onAddTransaction,
  onUpdateCustomer,
  onExportPdf,
  onDeleteCustomer,
}) => {
  const { t, isUrdu } = useLanguage();
  const [showAddTx, setShowAddTx] = useState(false);
  const [showLimitEdit, setShowLimitEdit] = useState(false);
  const [amount, setAmount] = useState('');
  const [txType, setTxType] = useState<TransactionType>('DEBIT');
  const [note, setNote] = useState('');
  const [copiedReminder, setCopiedReminder] = useState(false);
  const [searchTxQuery, setSearchTxQuery] = useState('');
  const [customDebtLimit, setCustomDebtLimit] = useState(
    customer.debtLimit !== undefined ? customer.debtLimit.toString() : '20000'
  );
  const [isRecordingAmount, setIsRecordingAmount] = useState(false);
  const [amountVoiceTranscript, setAmountVoiceTranscript] = useState<string | null>(null);
  const amountSpeechRecognizerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (amountSpeechRecognizerRef.current) {
        try {
          amountSpeechRecognizerRef.current.stop();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  const handleStartVoiceAmount = () => {
    // Network Connectivity Guardrail: Check network status before voice input
    const connCheck = connectivityService.checkVoiceAvailability(isUrdu);
    if (!connCheck.allowed) {
      playErrorAlert();
      alert(
        connCheck.message ||
          'Voice features require an internet connection. Please connect to the internet or use manual entry.'
      );
      return;
    }

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isRecordingAmount && amountSpeechRecognizerRef.current) {
      playVoiceStopSound();
      try {
        amountSpeechRecognizerRef.current.stop();
      } catch {
        // Ignore
      }
      setIsRecordingAmount(false);
      return;
    }

    try {
      playVoiceStartSound();
      setAmountVoiceTranscript(null);
      const recognizer = new SpeechRecognition();
      amountSpeechRecognizerRef.current = recognizer;
      recognizer.continuous = false;
      recognizer.interimResults = true;
      recognizer.lang = 'ur-PK';

      recognizer.onstart = () => {
        setIsRecordingAmount(true);
      };

      recognizer.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          setAmountVoiceTranscript(currentTranscript);
          // Step 3a: Auto-lookup user_voice_corrections before displaying result
          const learned = dbService.findVoiceCorrection(currentTranscript);
          const parsedExact = learned && learned.corrected_number > 0
            ? learned.corrected_number
            : parseUrduNumberText(currentTranscript);

          if (parsedExact > 0) {
            // Display this calculated exact number directly in the amount input box without rounding off
            setAmount(String(parsedExact));
          }
          // Detect transaction type if spoken
          if (/وصول|ملا|ملے|جمع|credit|wapas/i.test(currentTranscript)) {
            setTxType('CREDIT');
          } else if (/دیے|دیا|ادھار|قرض|debit|likho/i.test(currentTranscript)) {
            setTxType('DEBIT');
          }
        }
      };

      recognizer.onerror = () => {
        setIsRecordingAmount(false);
      };

      recognizer.onend = () => {
        setIsRecordingAmount(false);
        playSuccessChime();
      };

      recognizer.start();
    } catch {
      setIsRecordingAmount(false);
    }
  };

  const customerTxs = transactions.filter((t) => t.customerId === customer.id);

  const debtLimit = customer.debtLimit ?? 20000;
  const isDebtExceeded = customer.balance > debtLimit;

  // Transaction filter
  const filteredTxs = customerTxs.filter((t) => {
    if (!searchTxQuery.trim()) return true;
    const q = searchTxQuery.toLowerCase();
    return (
      t.note?.toLowerCase().includes(q) ||
      t.amount.toString().includes(q) ||
      t.type.toLowerCase().includes(q)
    );
  });

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    playClickSound();
    await onAddTransaction(
      customer.id,
      numAmount,
      txType,
      note.trim() || (txType === 'DEBIT' ? 'دستی ادھار' : 'دستی وصولی')
    );

    playSuccessChime();
    setAmount('');
    setNote('');
    setShowAddTx(false);
  };

  const handleUpdateDebtLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newLimit = parseFloat(customDebtLimit);
    if (isNaN(newLimit) || newLimit < 0) return;

    playClickSound();
    if (onUpdateCustomer) {
      await onUpdateCustomer(customer.id, { debtLimit: newLimit });
      playSuccessChime();
    }
    setShowLimitEdit(false);
  };

  const handleShareReminder = () => {
    playClickSound();
    const isDebit = customer.balance > 0;
    const formattedAmount = Math.abs(customer.balance).toLocaleString();
    const message = isDebit
      ? `محترم جناب ${customer.nameUrdu || customer.name} صاحب، آپ کے کھاتے کا بقایا ادھار ${formattedAmount} روپے ہے۔ برائے مہربانی جلد از جلد ادائی فرمائیں۔ شکریہ! (بذریعہ ڈیجی کھاتہ)`
      : `محترم جناب ${customer.nameUrdu || customer.name} صاحب، آپ کا پیشگی بیلنس ${formattedAmount} روپے ہے۔ شکریہ! (بذریعہ ڈیجی کھاتہ)`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(message);
      setCopiedReminder(true);
      setTimeout(() => setCopiedReminder(false), 2000);
    }

    if (customer.phone) {
      const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
      const formattedPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.substring(1) : cleanPhone;
      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const numAmount = parseFloat(amount) || 0;
  const projectedBalance = txType === 'DEBIT' ? customer.balance + numAmount : customer.balance - numAmount;
  const willExceedDebtLimit = txType === 'DEBIT' && projectedBalance > debtLimit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xl relative text-slate-800 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold font-urdu text-slate-900">
                {customer.nameUrdu || customer.name}
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-sans font-medium">
                {customer.name}
              </span>
            </div>
            {customer.phone && (
              <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-mono">{customer.phone}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Delete Khata Action Button */}
            {onDeleteCustomer && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onDeleteCustomer(customer);
                }}
                className="p-1.5 text-red-500 hover:text-red-700 rounded-full bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                title="کھاتہ ڈیلیٹ کریں (Delete Khata)"
              >
                <Trash2 className="w-5 h-5 text-red-600" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Debt Limit Alert Banner */}
        {isDebtExceeded && (
          <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <div className="flex items-center justify-between font-bold font-urdu text-rose-900">
                <span>⚠️ قرض کی حد سے تجاوز (Debt Limit Exceeded!)</span>
                <span className="font-mono text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  +{(customer.balance - debtLimit).toLocaleString()} PKR زائد
                </span>
              </div>
              <p className="mt-1 font-urdu text-[11px] text-rose-700 leading-relaxed">
                موجودہ ادھار ({customer.balance.toLocaleString()} روپے) مقررہ حد ({debtLimit.toLocaleString()} روپے) سے زائد ہے۔
              </p>
            </div>
          </div>
        )}

        {/* Balance Status Banner */}
        <div className="my-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-urdu">کل بقایا رقم (Net Balance)</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span
                className={`text-2xl font-black tracking-tight ${
                  customer.balance > 0
                    ? 'text-rose-600'
                    : 'text-emerald-600'
                }`}
              >
                {Math.abs(customer.balance).toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 font-urdu">{t.currencyUnit}</span>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold font-urdu ${
                customer.balance > 0
                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              {customer.balance > 0 ? t.owesMerchantBadge : customer.balance < 0 ? t.merchantOwesBadge : t.settledBadge}
            </span>

            {/* Debt Limit gauge info */}
            <div className="mt-1.5 flex items-center justify-end gap-1 text-[11px] text-slate-500">
              <span className="font-urdu">حد:</span>
              <span className="font-mono text-amber-800 font-bold">{debtLimit.toLocaleString()} PKR</span>
              <button
                onClick={() => setShowLimitEdit(!showLimitEdit)}
                title="قرض کی حد تبدیل کریں"
                className="p-1 text-slate-400 hover:text-amber-700 transition-colors"
              >
                <Sliders className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Inline Debt Limit Editor */}
        {showLimitEdit && (
          <form onSubmit={handleUpdateDebtLimit} className="mb-3 p-3 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-urdu text-amber-900 font-semibold">
              <span>گاہک کیلئے ادھار کی زیادہ سے زیادہ حد (PKR):</span>
              <span className="text-[10px] text-slate-500">موجودہ: {debtLimit.toLocaleString()}</span>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={customDebtLimit}
                onChange={(e) => setCustomDebtLimit(e.target.value)}
                className="flex-1 bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                placeholder="20000"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs font-urdu transition-colors"
              >
                {t.save}
              </button>
              <button
                type="button"
                onClick={() => setShowLimitEdit(false)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-urdu"
              >
                {t.cancel}
              </button>
            </div>
          </form>
        )}

        {/* Action Buttons */}
        <div className={`grid ${onExportPdf ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mb-3`}>
          <button
            onClick={() => setShowAddTx(!showAddTx)}
            className="py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors font-urdu shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>نیا اندراج</span>
          </button>
          <button
            onClick={handleShareReminder}
            className="py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-emerald-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors font-urdu border border-slate-200"
          >
            {copiedReminder ? <Check className="w-4 h-4 text-emerald-600" /> : <MessageCircle className="w-4 h-4 text-emerald-600" />}
            <span>{copiedReminder ? 'کاپی ہوا!' : 'واٹس ایپ یاد دہانی'}</span>
          </button>
          {onExportPdf && (
            <button
              onClick={() => {
                playClickSound();
                onExportPdf();
              }}
              className="py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-teal-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors font-urdu border border-slate-200"
            >
              <FileText className="w-4 h-4 text-teal-600" />
              <span>PDF کھاتہ</span>
            </button>
          )}
        </div>

        {/* Inline Manual Add Transaction Form */}
        {showAddTx && (
          <form onSubmit={handleSaveTransaction} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-3 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 font-urdu">دستی اندراج (Manual Entry):</h4>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTxType('DEBIT')}
                className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 font-urdu ${
                  txType === 'DEBIT'
                    ? 'bg-rose-600 text-white shadow'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>ادھار دیا (+)</span>
              </button>
              <button
                type="button"
                onClick={() => setTxType('CREDIT')}
                className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 font-urdu ${
                  txType === 'CREDIT'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>وصول ہوئے (-)</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-urdu">
                <span>رقم (PKR):</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  آف لائن اردو وائس سپورٹ
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAmount(val);
                    const num = parseFloat(val);
                    if (amountVoiceTranscript && num > 0) {
                      dbService.saveUserVoiceCorrection(amountVoiceTranscript, num).catch((err) => {
                        console.warn('Failed to save voice correction in customer modal:', err);
                      });
                    }
                  }}
                  placeholder="رقم درج کریں (روپے)"
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-base font-bold text-slate-900 font-mono focus:outline-none focus:border-emerald-500 text-right shadow-2xs"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleStartVoiceAmount}
                  title="بول کر رقم درج کریں (Urdu Voice Amount)"
                  className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                    isRecordingAmount
                      ? 'bg-rose-500 border-rose-600 text-white animate-pulse shadow-md shadow-rose-500/30'
                      : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-700'
                  }`}
                >
                  {isRecordingAmount ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>
              {amountVoiceTranscript && (
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-urdu flex items-center justify-between">
                  <span>بولے گئے الفاظ: &quot;{amountVoiceTranscript}&quot;</span>
                  <span className="font-mono font-bold text-emerald-700 text-xs">
                    {amount ? `${Number(amount).toLocaleString()} PKR` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Will exceed warning notice */}
            {willExceedDebtLimit && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800 font-urdu flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  خبردار! نیا قرض <strong>{projectedBalance.toLocaleString()} روپے</strong> ہو جائے گا (حد: {debtLimit.toLocaleString()} روپے)۔
                </span>
              </div>
            )}

            <div>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="تفصیل یا سامان (اختیاری)"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-urdu focus:outline-none focus:border-emerald-500 text-right"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddTx(false)}
                className="w-1/3 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-urdu"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className={`w-2/3 py-2 rounded-xl font-bold text-xs font-urdu ${
                  willExceedDebtLimit
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {t.save}
              </button>
            </div>
          </form>
        )}

        {/* Search inside transactions */}
        {customerTxs.length > 3 && (
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTxQuery}
              onChange={(e) => setSearchTxQuery(e.target.value)}
              placeholder="ٹرانزیکشنز میں تلاش کریں..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 font-urdu placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 text-right"
            />
          </div>
        )}

        {/* Transaction History List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-urdu mb-1">
            <span>لین دین کی تاریخ (History):</span>
            <span className="font-mono text-[11px] font-bold text-slate-700">{filteredTxs.length} entries</span>
          </div>

          {filteredTxs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 font-urdu text-xs">
              کوئی اندراج موجود نہیں۔
            </div>
          ) : (
            filteredTxs.map((tx) => (
              <div
                key={tx.id}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      tx.type === 'DEBIT'
                        ? 'bg-rose-100 text-rose-600 border border-rose-200'
                        : 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                    }`}
                  >
                    {tx.type === 'DEBIT' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownLeft className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <span className="font-urdu font-semibold text-slate-900 block">
                      <HighlightText text={tx.note} query={searchTxQuery} />
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans block">
                      {new Date(tx.timestamp).toLocaleDateString()} • {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`font-mono font-bold text-sm block ${
                      tx.type === 'DEBIT' ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {tx.type === 'DEBIT' ? '+' : '-'}
                    <HighlightText text={tx.amount.toLocaleString()} query={searchTxQuery} />
                  </span>
                  <span className="text-[10px] text-slate-400 font-urdu">
                    {tx.type === 'DEBIT' ? 'ادھار' : 'وصولی'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
