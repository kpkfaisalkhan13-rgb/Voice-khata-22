import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Copy,
  Check,
  MessageCircle,
  Mail,
  ShieldCheck,
  Lock,
  Sparkles,
  ExternalLink,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';
import { SubscriptionInfo } from '../types';
import {
  buildWhatsAppVerificationUrl,
  buildGmailVerificationUrl,
  getTrialStatus
} from '../utils/subscription';
import { playClickSound, playSuccessChime } from '../utils/audio';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopName: string;
  shopOwner?: string;
  subscription: SubscriptionInfo;
  lockedFeature?: 'VOICE' | 'PDF_ANALYTICS';
  onRecordTxzSubmission: (txzId: string, plan: 'VOICE' | 'PDF_ANALYTICS' | 'COMBO', method: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  shopName,
  shopOwner = 'دکاندار',
  subscription,
  lockedFeature = 'VOICE',
  onRecordTxzSubmission,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'VOICE' | 'PDF_ANALYTICS' | 'COMBO'>(
    lockedFeature === 'PDF_ANALYTICS' ? 'PDF_ANALYTICS' : 'VOICE'
  );
  const [selectedMethod, setSelectedMethod] = useState<'EasyPaisa' | 'JazzCash' | 'Bank'>('EasyPaisa');
  const [txzId, setTxzId] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [submittedStatus, setSubmittedStatus] = useState(false);

  if (!isOpen) return null;

  const trial = getTrialStatus(subscription);

  const planDetails = {
    VOICE: {
      name: 'آواز فیچر (Urdu Voice Groq API)',
      price: '50 روپے / ماہانہ',
      priceNum: 'Rs. 50/month',
      desc: 'اردو آواز کی شناخت اور خودکار اندراج بغیر کسی روک ٹوک کے۔',
    },
    PDF_ANALYTICS: {
      name: 'پی ڈی ایف کھاتہ و اینالیٹکس (PDF & Analytics)',
      price: '150 روپے / ماہانہ',
      priceNum: 'Rs. 150/month',
      desc: 'گاہکوں کے کھاتوں کی پرنٹ ایبل پی ڈی ایف اور دکان کی تفصیلی آمدنی رپورٹس۔',
    },
    COMBO: {
      name: 'مکمل کومبو بنڈل (Voice + PDF + Analytics)',
      price: '180 روپے / ماہانہ',
      priceNum: 'Rs. 180/month',
      desc: 'تمام پریمیم فیچرز ایک ساتھ (۲۰ روپے کی بچت کے ساتھ)۔',
    },
  };

  const paymentAccounts = {
    EasyPaisa: {
      title: 'Muhammad Aamir',
      number: '0345-9876543',
      badge: 'ایزی پیسہ (EasyPaisa)',
      color: 'from-emerald-600 to-green-500',
    },
    JazzCash: {
      title: 'Muhammad Aamir',
      number: '0300-1234567',
      badge: 'جاز کیش (JazzCash)',
      color: 'from-amber-600 to-orange-500',
    },
    Bank: {
      title: 'Udhaar Ledger Solutions',
      number: '0102-0105678901',
      iban: 'PK56MEZN0001020105678901',
      bankName: 'Meezan Bank Ltd',
      badge: 'میزان بینک (Meezan Bank)',
      color: 'from-blue-600 to-cyan-500',
    },
  };

  const copyToClipboard = (text: string, label: string) => {
    playClickSound();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleWhatsAppVerify = () => {
    if (!txzId.trim()) {
      alert('براہ کرم پہلے ٹرانزیکشن ID (TXZ ID) درج فرمائیں');
      return;
    }
    playSuccessChime();
    onRecordTxzSubmission(txzId.trim(), selectedPlan, selectedMethod);
    setSubmittedStatus(true);

    const url = buildWhatsAppVerificationUrl({
      shopName,
      shopOwner,
      planName: planDetails[selectedPlan].name,
      price: planDetails[selectedPlan].price,
      txzId: txzId.trim(),
      paymentMethod: selectedMethod,
    });
    window.open(url, '_blank');
  };

  const handleGmailVerify = () => {
    if (!txzId.trim()) {
      alert('Please enter Transaction ID (TXZ ID) first');
      return;
    }
    playSuccessChime();
    onRecordTxzSubmission(txzId.trim(), selectedPlan, selectedMethod);
    setSubmittedStatus(true);

    const url = buildGmailVerificationUrl({
      shopName,
      shopOwner,
      planName: planDetails[selectedPlan].name,
      price: planDetails[selectedPlan].price,
      txzId: txzId.trim(),
      paymentMethod: selectedMethod,
    });
    window.location.href = url;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 15 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-white max-h-[92vh] flex flex-col"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>پریمیم فیچر اپ گریڈ (Premium Subscription)</span>
          </div>
          <h3 className="text-xl font-bold font-urdu text-white">
            ادائیگی اور فوری تصدیق (Payment & Verification)
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-urdu">
            {trial.isTrialActive
              ? `آپ کے پاس مفت ٹرائل کے ${trial.daysRemaining} دن باقی ہیں۔ آپ پہلے سے ایکٹیو کر سکتے ہیں۔`
              : '۳۰ دن کا مفت ٹرائل مکمل ہو چکا ہے۔ دستی کھاتہ مفت ہے، پریمیم فیچرز جاری رکھنے کے لیے منتخب کریں۔'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
          {/* Freemium Rule Notice */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between font-urdu">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-300">دستی کھاتہ اندراج (Manual Entry):</span>
            </div>
            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
              ہمیشہ 100% مفت
            </span>
          </div>

          {/* Plan Selection */}
          <div>
            <label className="block text-slate-300 font-bold font-urdu mb-2 text-right">
              پلان منتخب کریں (Select Plan):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(['VOICE', 'PDF_ANALYTICS', 'COMBO'] as const).map((planKey) => {
                const isSelected = selectedPlan === planKey;
                const p = planDetails[planKey];
                return (
                  <button
                    key={planKey}
                    id={`plan-select-btn-${planKey}`}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setSelectedPlan(planKey);
                    }}
                    className={`p-3 rounded-2xl border text-right flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'bg-emerald-950/50 border-emerald-500 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <span className="font-urdu font-bold text-xs block text-slate-100 leading-tight">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-urdu block mt-1">
                        {p.desc}
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="font-bold text-emerald-400 text-xs font-mono">{p.priceNum}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method Tabs */}
          <div>
            <label className="block text-slate-300 font-bold font-urdu mb-2 text-right">
              ادائیگی کا طریقہ منتخب کریں (Payment Methods):
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {(['EasyPaisa', 'JazzCash', 'Bank'] as const).map((method) => (
                <button
                  key={method}
                  id={`payment-method-btn-${method}`}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setSelectedMethod(method);
                  }}
                  className={`py-2 px-1 rounded-xl text-center text-xs font-semibold transition-colors ${
                    selectedMethod === method
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  {paymentAccounts[method].badge}
                </button>
              ))}
            </div>

            {/* Account Card Details */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 relative">
              <div className="flex items-center justify-between mb-2">
                <span className="font-urdu text-emerald-400 font-bold text-sm">
                  {paymentAccounts[selectedMethod].badge}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Verified Account</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-urdu">اکاؤنٹ ٹائٹل (Account Title):</span>
                    <span className="font-bold text-white text-xs">{paymentAccounts[selectedMethod].title}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(paymentAccounts[selectedMethod].title, 'title')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Copy Title"
                  >
                    {copiedField === 'title' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-urdu">اکاؤنٹ نمبر (Account / Mobile No):</span>
                    <span className="font-bold text-emerald-300 text-sm font-mono tracking-wider">
                      {paymentAccounts[selectedMethod].number}
                    </span>
                  </div>
                  <button
                    id="copy-account-number-btn"
                    onClick={() => copyToClipboard(paymentAccounts[selectedMethod].number, 'number')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-[10px]"
                  >
                    {copiedField === 'number' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'number' ? 'کاپی ہوا' : 'کاپی'}</span>
                  </button>
                </div>

                {selectedMethod === 'Bank' && paymentAccounts.Bank.iban && (
                  <div className="flex items-center justify-between bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-urdu">IBAN نمبر:</span>
                      <span className="font-mono text-xs text-slate-200">{paymentAccounts.Bank.iban}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(paymentAccounts.Bank.iban!, 'iban')}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      {copiedField === 'iban' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TXZ ID Input Field (Mandatory in PRD) */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <label className="block text-slate-200 font-bold font-urdu mb-1 text-right">
              ٹرانزیکشن ID درج کریں (Enter Transaction ID / TXZ ID):
            </label>
            <p className="text-[11px] text-slate-400 font-urdu mb-2 text-right">
              رقم بھیجنے کے بعد ایزی پیسہ، جاز کیش یا بینک کی میسج والی TRX ID یہاں لکھیں:
            </p>
            <input
              id="txz-id-input"
              type="text"
              value={txzId}
              onChange={(e) => setTxzId(e.target.value)}
              placeholder="مثال: TRX-9832104 یا 74928103"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono tracking-wide focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Dual Action Buttons (WhatsApp & Gmail) */}
          <div>
            <span className="block text-slate-300 font-bold font-urdu mb-2 text-right">
              تصدیقی ثبوت بھیجیں (Submit Payment Proof):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* WhatsApp Verification */}
              <button
                id="verify-whatsapp-btn"
                onClick={handleWhatsAppVerify}
                className="py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 font-urdu transition-all"
              >
                <MessageCircle className="w-4 h-4 text-white" />
                <span>Verify via WhatsApp (واٹس ایپ)</span>
              </button>

              {/* Gmail Verification */}
              <button
                id="verify-gmail-btn"
                onClick={handleGmailVerify}
                className="py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 font-urdu transition-all"
              >
                <Mail className="w-4 h-4 text-white" />
                <span>Verify via Gmail (ای میل)</span>
              </button>
            </div>
          </div>

          {submittedStatus && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-urdu text-center">
              ✓ درخواست ارسال ہو گئی۔ ایڈمن جلد ہی TXZ ID چیک کر کے آپ کا کھاتہ ایکٹیویٹ کر دے گا۔
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
