import React, { useState, useMemo } from 'react';
import {
  X,
  TrendingUp,
  BarChart3,
  Users,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Award,
  Calendar,
  Share2,
  Check,
  Percent,
  Clock,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { Customer, Transaction } from '../types';
import { playClickSound } from '../utils/audio';
import { MonthlyLoansAndAdvanceGraph } from './MonthlyLoansAndAdvanceGraph';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  transactions: Transaction[];
  shopName: string;
}

type PeriodTab = 'CURRENT_MONTH' | 'PREVIOUS_MONTH' | 'ALL_TIME';

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  customers,
  transactions,
  shopName,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodTab>('CURRENT_MONTH');
  const [copiedReport, setCopiedReport] = useState(false);

  if (!isOpen) return null;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // Format month names in Urdu and English
  const getMonthNameUrdu = (date: Date) => {
    const monthsUrdu = [
      'جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون',
      'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'
    ];
    return monthsUrdu[date.getMonth()];
  };

  const getMonthNameEn = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const currentMonthDate = new Date(currentYear, currentMonth, 1);
  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);

  // Filter transactions according to selected period
  const filteredTransactions = useMemo(() => {
    if (selectedPeriod === 'ALL_TIME') {
      return transactions;
    }

    const targetDate = selectedPeriod === 'CURRENT_MONTH' ? currentMonthDate : prevMonthDate;
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();

    return transactions.filter((t) => {
      const d = new Date(t.timestamp);
      return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
    });
  }, [transactions, selectedPeriod, currentMonthDate, prevMonthDate]);

  // Calculations for the selected period
  const periodDebits = filteredTransactions.filter((t) => t.type === 'DEBIT');
  const periodCredits = filteredTransactions.filter((t) => t.type === 'CREDIT');

  const periodGivenAmount = periodDebits.reduce((sum, t) => sum + t.amount, 0);
  const periodCollectedAmount = periodCredits.reduce((sum, t) => sum + t.amount, 0);
  const periodNetChange = periodGivenAmount - periodCollectedAmount;

  const periodRecoveryRate =
    periodGivenAmount > 0
      ? Math.min(100, Math.round((periodCollectedAmount / periodGivenAmount) * 100))
      : periodCollectedAmount > 0
      ? 100
      : 0;

  // Lifetime metrics for overall balance
  let totalToReceive = 0;
  let totalToGive = 0;
  customers.forEach((c) => {
    if (c.balance > 0) totalToReceive += c.balance;
    else if (c.balance < 0) totalToGive += Math.abs(c.balance);
  });

  // Top borrowers for the selected period
  const topDebtorsThisPeriod = useMemo(() => {
    const customerDebitMap = new Map<string, { customer: Customer | null; name: string; nameUrdu: string; totalDebit: number }>();

    periodDebits.forEach((t) => {
      const existing = customerDebitMap.get(t.customerId) || {
        customer: customers.find((c) => c.id === t.customerId) || null,
        name: t.customerName,
        nameUrdu: t.customerNameUrdu,
        totalDebit: 0,
      };
      existing.totalDebit += t.amount;
      customerDebitMap.set(t.customerId, existing);
    });

    return Array.from(customerDebitMap.values())
      .sort((a, b) => b.totalDebit - a.totalDebit)
      .slice(0, 5);
  }, [periodDebits, customers]);

  // Generate 6-Month comparative chart data
  const monthlyTrendData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const mYear = d.getFullYear();
      const mMonth = d.getMonth();
      const monthTxs = transactions.filter((t) => {
        const txDate = new Date(t.timestamp);
        return txDate.getFullYear() === mYear && txDate.getMonth() === mMonth;
      });

      const debit = monthTxs.filter((t) => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0);
      const credit = monthTxs.filter((t) => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);

      months.push({
        labelUrdu: getMonthNameUrdu(d),
        labelEn: d.toLocaleDateString('en-US', { month: 'short' }),
        year: mYear,
        debit,
        credit,
        net: debit - credit,
        isCurrent: i === 0,
      });
    }

    const maxAmount = Math.max(...months.map((m) => Math.max(m.debit, m.credit, 1000)));
    return { months, maxAmount };
  }, [transactions, currentYear, currentMonth]);

  // Share Monthly Summary to WhatsApp or Clipboard
  const handleShareMonthlyReport = () => {
    playClickSound();
    const periodTitle =
      selectedPeriod === 'CURRENT_MONTH'
        ? `ماہانہ رپورٹ: ${getMonthNameUrdu(currentMonthDate)} ${currentYear}`
        : selectedPeriod === 'PREVIOUS_MONTH'
        ? `ماہانہ رپورٹ: ${getMonthNameUrdu(prevMonthDate)} ${prevMonthDate.getFullYear()}`
        : 'کاروباری رپورٹ (کل ریکارڈ)';

    const reportMessage = `📊 *${shopName} - ${periodTitle}*
---------------------------
💰 *دیا گیا قرض (Udhaar Given):* ${periodGivenAmount.toLocaleString()} روپے
💵 *کل وصولی (Cash Recovered):* ${periodCollectedAmount.toLocaleString()} روپے
📈 *خالص بقایا اضافہ:* ${periodNetChange >= 0 ? `+${periodNetChange.toLocaleString()}` : periodNetChange.toLocaleString()} روپے
🎯 *وصولی کی شرح (Recovery Rate):* ${periodRecoveryRate}%
📝 *کل ٹرانزیکشنز:* ${filteredTransactions.length} (قرض: ${periodDebits.length} | وصولی: ${periodCredits.length})
---------------------------
🏦 *مجموعی دکان کا بقایا قرض:* ${totalToReceive.toLocaleString()} روپے
شکریہ!`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(reportMessage);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    }

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(reportMessage)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 15 }}
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative text-white max-h-[92vh] flex flex-col"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>ماہانہ کھاتہ اینالیٹکس و کارکردگی (Monthly Analytics)</span>
          </div>
          <h3 className="text-xl font-bold font-urdu text-slate-100">
            {shopName} کی کاروباری رپورٹ
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            ماہ بہ ماہ قرض کا بہاؤ، نقد وصولی شرح، اور تجزیاتی جائزہ
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-4 font-urdu text-xs">
          <button
            onClick={() => {
              playClickSound();
              setSelectedPeriod('CURRENT_MONTH');
            }}
            className={`py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1 ${
              selectedPeriod === 'CURRENT_MONTH'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>اس ماہ ({getMonthNameUrdu(currentMonthDate)})</span>
          </button>

          <button
            onClick={() => {
              playClickSound();
              setSelectedPeriod('PREVIOUS_MONTH');
            }}
            className={`py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1 ${
              selectedPeriod === 'PREVIOUS_MONTH'
                ? 'bg-indigo-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>گزشتہ ماہ ({getMonthNameUrdu(prevMonthDate)})</span>
          </button>

          <button
            onClick={() => {
              playClickSound();
              setSelectedPeriod('ALL_TIME');
            }}
            className={`py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1 ${
              selectedPeriod === 'ALL_TIME'
                ? 'bg-slate-700 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>تمام ریکارڈ (All)</span>
          </button>
        </div>

        {/* Scrollable Analytics Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
          {/* Top Monthly KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-urdu block flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-rose-400" />
                <span>دیا گیا قرض</span>
              </span>
              <span className="text-base font-black text-rose-400 font-mono mt-1 block">
                {periodGivenAmount.toLocaleString()}
              </span>
              <span className="text-[9px] text-slate-500 font-urdu">روپے ادھار مال</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-urdu block flex items-center gap-1">
                <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                <span>وصول شدہ رقم</span>
              </span>
              <span className="text-base font-black text-emerald-400 font-mono mt-1 block">
                {periodCollectedAmount.toLocaleString()}
              </span>
              <span className="text-[9px] text-slate-500 font-urdu">روپے نقد وصولی</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-urdu block flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-indigo-400" />
                <span>خالص تبدیلی</span>
              </span>
              <span
                className={`text-base font-black font-mono mt-1 block ${
                  periodNetChange > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {periodNetChange >= 0 ? `+${periodNetChange.toLocaleString()}` : periodNetChange.toLocaleString()}
              </span>
              <span className="text-[9px] text-slate-500 font-urdu">
                {periodNetChange >= 0 ? 'قرض میں اضافہ' : 'قرض میں کمی'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-urdu block flex items-center gap-1">
                <Percent className="w-3 h-3 text-amber-400" />
                <span>وصولی کی شرح</span>
              </span>
              <span className="text-base font-black text-amber-400 font-mono mt-1 block">
                {periodRecoveryRate}%
              </span>
              <span className="text-[9px] text-slate-500 font-urdu">Recovery Rate</span>
            </div>
          </div>

          {/* Recovery Ratio Progress Bar */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="font-urdu font-bold text-slate-200 text-xs">
                وصولی کا تناسب ({periodRecoveryRate}% ریکوری):
              </span>
              <span className="text-emerald-400 font-bold font-mono text-xs">
                {periodCollectedAmount.toLocaleString()} / {(periodGivenAmount + periodCollectedAmount).toLocaleString()} PKR
              </span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${periodRecoveryRate}%` }}
                className="bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              />
              <div
                style={{ width: `${100 - periodRecoveryRate}%` }}
                className="bg-rose-500/80 transition-all duration-500"
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 font-urdu">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> نقد وصولی ({periodCredits.length} انٹریز)
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> نیا ادھار ({periodDebits.length} انٹریز)
              </span>
            </div>
          </div>

          {/* Comprehensive Monthly Loans & Advance Payment Graph */}
          <MonthlyLoansAndAdvanceGraph
            customers={customers}
            transactions={transactions}
            theme="dark"
            shopName={shopName}
            currencyUnit="روپے"
          />

          {/* Top Debtors for this Selected Period */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-amber-400" />
              <h4 className="font-bold text-slate-200 font-urdu text-xs">
                اس مدت میں سب سے زیادہ ادھار لینے والے گاہک:
              </h4>
            </div>

            <div className="space-y-2">
              {topDebtorsThisPeriod.length === 0 ? (
                <p className="text-slate-500 font-urdu text-center py-2">
                  اس مدت میں کوئی ادھار انٹری نہیں ہے۔
                </p>
              ) : (
                topDebtorsThisPeriod.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/80"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-mono text-[10px] text-slate-400 font-bold">
                        {i + 1}
                      </span>
                      <div>
                        <span className="font-bold font-urdu text-slate-200 block text-xs">
                          {item.nameUrdu || item.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-sans">
                          {item.customer?.phone || item.name}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-rose-400 text-xs block">
                        +{item.totalDebit.toLocaleString()} روپے
                      </span>
                      <span className="text-[9px] text-slate-500 font-urdu">نیا ادھار لیا</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Overall Shop Health Bar */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-slate-400 font-urdu">
            <span>
              کل کسٹمرز: <strong className="text-white font-mono">{customers.length}</strong>
            </span>
            <span>
              کل واجب الادا قرض:{' '}
              <strong className="text-rose-400 font-mono">{totalToReceive.toLocaleString()} روپے</strong>
            </span>
            <span>
              پیشگی وصولی:{' '}
              <strong className="text-emerald-400 font-mono">{totalToGive.toLocaleString()} روپے</strong>
            </span>
          </div>
        </div>

        {/* Share Monthly Report Button */}
        <div className="pt-3 border-t border-slate-800 flex gap-2">
          <button
            onClick={handleShareMonthlyReport}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-urdu flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
          >
            {copiedReport ? <Check className="w-4 h-4 text-white" /> : <Share2 className="w-4 h-4" />}
            <span>
              {copiedReport
                ? 'رپورٹ کاپی ہو گئی اور واٹس ایپ کھل گئی!'
                : 'ماہانہ رپورٹ واٹس ایپ پر شیئر کریں (Share Report)'}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
