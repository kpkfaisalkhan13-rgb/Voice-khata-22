import React, { useState } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  CreditCard,
  Share2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Customer, Transaction, CountryCode, SubscriptionInfo } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { getTrialStatus } from '../utils/subscription';
import { playClickSound, playSuccessSound } from '../utils/audio';
import { MonthlyLoansAndAdvanceGraph } from './MonthlyLoansAndAdvanceGraph';

interface AnalyticsScreenProps {
  customers: Customer[];
  transactions: Transaction[];
  country: CountryCode;
  subscription: SubscriptionInfo;
  shopName?: string;
  onOpenPdfModal: () => void;
  onSubmitPaymentProof: (screenshotBase64: string, txzId: string, method: string) => void;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({
  customers,
  transactions,
  country,
  subscription,
  shopName,
  onOpenPdfModal,
  onSubmitPaymentProof,
}) => {
  const { t } = useLanguage();

  const trial = getTrialStatus(subscription);
  const isTempAccess =
    subscription.tempAccessUntil && new Date(subscription.tempAccessUntil).getTime() > Date.now();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [txzIdInput, setTxzIdInput] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentProofModal, setShowPaymentProofModal] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Financial summary
  const { totalGot, totalGave, netBalance } = React.useMemo(() => {
    let got = 0;
    let gave = 0;
    customers.forEach((c) => {
      if (c.balance > 0) got += c.balance;
      else if (c.balance < 0) gave += Math.abs(c.balance);
    });
    return { totalGot: got, totalGave: gave, netBalance: gave - got };
  }, [customers]);

  // Payment methods per country
  const paymentMethodsByCountry: Record<
    CountryCode,
    { title: string; price: string; accounts: { name: string; number: string; title: string }[] }
  > = {
    PK: {
      title: 'Pakistan - Local Mobile Wallets & Banks',
      price: 'Rs. 100 / month',
      accounts: [
        { name: 'JazzCash', number: '0300-1234567', title: 'Voice Ledger Official' },
        { name: 'EasyPaisa', number: '0333-9876543', title: 'Voice Ledger Official' },
        { name: 'Meezan Bank', number: '0101-0203040506', title: 'Voice Udhaar Technologies' },
      ],
    },
    IN: {
      title: 'India - UPI, Google Pay & PhonePe',
      price: '₹100 / month',
      accounts: [
        { name: 'UPI ID', number: 'voiceledger@okaxis', title: 'Voice Ledger India' },
        { name: 'Google Pay', number: '+91 98765 43210', title: 'Voice Ledger India' },
        { name: 'PhonePe / Paytm', number: '+91 98765 43210', title: 'Voice Ledger India' },
      ],
    },
    US: {
      title: 'USA & International Payments',
      price: '$5 / month',
      accounts: [
        { name: 'Payoneer', number: 'payments@voiceledger.app', title: 'Voice Ledger LLC' },
        { name: 'Wise / Wire', number: 'US89370400440532013000', title: 'Voice Ledger LLC' },
      ],
    },
  };

  const currentPaymentInfo = paymentMethodsByCountry[country] || paymentMethodsByCountry.PK;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitProof = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !filePreview) {
      alert('Please select or upload a payment screenshot');
      return;
    }

    setIsSubmitting(true);
    playSuccessSound();

    setTimeout(() => {
      onSubmitPaymentProof(
        filePreview || 'screenshot_uploaded',
        txzIdInput || 'MANUAL_TX_' + Date.now(),
        selectedMethod || currentPaymentInfo.accounts[0].name
      );
      setIsSubmitting(false);
      setShowPaymentProofModal(false);
      setSelectedFile(null);
      setFilePreview(null);
      setTxzIdInput('');
      setNotification('🎉 24-Hour Instant Temporary Access Granted! Admin verification in progress.');
      setTimeout(() => setNotification(null), 6000);
    }, 600);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] pb-24 pt-4 px-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{t.tabAnalytics}</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
              Reports & PDF
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Business insights, customer balance distribution and PDF generation
          </p>
        </div>

        <button
          id="analytics-generate-pdf-btn"
          type="button"
          onClick={() => {
            playClickSound();
            onOpenPdfModal();
          }}
          className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
        >
          <FileText className="w-4 h-4" />
          <span>{t.pdfLedger}</span>
        </button>
      </div>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-semibold shadow-md flex items-center justify-between"
          >
            <span>{notification}</span>
            <button onClick={() => setNotification(null)} className="text-white/80 hover:text-white">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Monetization / Trial Status Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-xl relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {isTempAccess
                ? 'Temporary 24h Access Active'
                : trial.isTrialActive
                ? '1-Month Free Trial Active'
                : 'Paid Plan Required'}
            </span>
            <h3 className="text-base font-black mt-0.5">
              {isTempAccess
                ? '24-Hour Instant Access Active'
                : trial.isTrialActive
                ? `Day ${trial.currentDay} of 30 (${trial.daysRemaining} days left)`
                : 'Full Analytics & PDF Export'}
            </h3>
          </div>

          <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            {currentPaymentInfo.price}
          </span>
        </div>

        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          {trial.isTrialActive || isTempAccess
            ? 'All advanced analytics, business summaries, and PDF exports are currently unlocked.'
            : 'Basic voice ledger & voice calculator are free forever. Upgrade to keep full analytics and PDF export.'}
        </p>

        {/* Verification / Upgrade Button */}
        <div className="mt-3 pt-3 border-t border-slate-700/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Local Payment: {currentPaymentInfo.title}
          </span>
          <button
            id="analytics-upload-screenshot-btn"
            type="button"
            onClick={() => {
              playClickSound();
              setShowPaymentProofModal(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Payment Screenshot</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">
            {t.totalReceive}
          </span>
          <span className="text-base font-black text-rose-600 block mt-1">
            {totalGot.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400">{t.creditTerm}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">
            {t.totalGive}
          </span>
          <span className="text-base font-black text-emerald-600 block mt-1">
            {totalGave.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400">{t.debitTerm}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">
            {t.netBalance}
          </span>
          <span className="text-base font-black text-slate-900 block mt-1">
            {netBalance.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400">Net Outstanding</span>
        </div>
      </div>

      {/* Main Monthly Loans & Advance Payment Graph Component */}
      <MonthlyLoansAndAdvanceGraph
        customers={customers}
        transactions={transactions}
        theme="light"
        shopName={shopName || t.appName}
        currencyUnit={t.currencyUnit}
      />

      {/* Quick PDF Action Card */}
      <div className="p-4 rounded-3xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-600 text-white">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Generate PDF Khata Ledger</h4>
            <p className="text-xs text-slate-600">Download formatted statement or share on WhatsApp</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            onOpenPdfModal();
          }}
          className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-all shadow-sm"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>

      {/* Monthly Transaction Breakdown */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Ledger Activity Breakdown ({transactions.length} total entries)
        </h3>

        <div className="space-y-2">
          {transactions.slice(0, 5).map((tx) => (
            <div
              key={tx.id}
              className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-slate-800">{tx.customerName}</span>
                <span className="text-slate-400 text-[11px] block">{tx.note}</span>
              </div>
              <div className="text-right">
                <span
                  className={`font-mono font-bold ${
                    tx.type === 'DEBIT' ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {tx.type === 'DEBIT' ? '+' : '-'}{tx.amount.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {new Date(tx.timestamp).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Payment Verification Modal */}
      <AnimatePresence>
        {showPaymentProofModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-4 my-6"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-bold text-slate-900">Manual Payment Verification</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPaymentProofModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              {/* Local payment accounts */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-800">{currentPaymentInfo.title}</div>
                <div className="space-y-1.5">
                  {currentPaymentInfo.accounts.map((acc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/60 font-mono text-[11px]"
                    >
                      <div>
                        <span className="font-bold text-emerald-700">{acc.name}:</span>{' '}
                        <span className="text-slate-800">{acc.number}</span>
                      </div>
                      <span className="text-slate-400 text-[10px]">({acc.title})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instant 24h Access Promise */}
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Instant 24-Hour Temporary Access:</strong> Once you upload your payment screenshot, your account is immediately granted 24 hours of full access while our admin verifies your transaction.
                </div>
              </div>

              <form onSubmit={handleSubmitProof} className="space-y-3">
                {/* Method selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Select Payment Method
                  </label>
                  <select
                    value={selectedMethod}
                    onChange={(e) => setSelectedMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                  >
                    {currentPaymentInfo.accounts.map((acc, idx) => (
                      <option key={idx} value={acc.name}>
                        {acc.name} ({acc.number})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Optional Txz ID */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Transaction ID / TID (Optional)
                  </label>
                  <input
                    type="text"
                    value={txzIdInput}
                    onChange={(e) => setTxzIdInput(e.target.value)}
                    placeholder="e.g. TX10928374 or UPI Ref"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none"
                  />
                </div>

                {/* Screenshot Upload / Drag Drop */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Upload Payment Screenshot *
                  </label>
                  <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-4 text-center bg-slate-50 cursor-pointer relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {filePreview ? (
                      <div className="space-y-2">
                        <img
                          src={filePreview}
                          alt="Payment Screenshot Preview"
                          className="max-h-32 mx-auto rounded-lg shadow-xs object-contain"
                        />
                        <span className="text-[11px] text-emerald-700 font-bold block">
                          ✓ Screenshot selected. Tap to change.
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                        <span className="text-xs font-semibold text-slate-700 block">
                          Click or drag payment screenshot here
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          PNG, JPG, or Screenshot accepted
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Submitting Proof...'
                      : 'Submit Screenshot & Get Instant 24h Access'}
                  </span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
