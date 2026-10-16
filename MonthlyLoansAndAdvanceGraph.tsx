import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  Share2,
  Check,
  Percent,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Info,
  Clock,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Customer, Transaction } from '../types';
import { playClickSound } from '../utils/audio';

interface MonthlyLoansAndAdvanceGraphProps {
  customers: Customer[];
  transactions: Transaction[];
  theme?: 'dark' | 'light';
  shopName?: string;
  currencyUnit?: string;
}

type TimeRange = '6M' | '12M' | 'THIS_YEAR';

export interface MonthDataPoint {
  key: string; // "YYYY-MM"
  year: number;
  monthIndex: number; // 0-11
  labelUrdu: string;
  labelEn: string;
  fullMonthYearUrdu: string;
  fullMonthYearEn: string;
  loanAmount: number; // DEBIT: قرض دیا گیا
  advanceAmount: number; // CREDIT: پیشگی ادائیگی و وصولی
  loanTxCount: number;
  advanceTxCount: number;
  netChange: number; // loanAmount - advanceAmount
  recoveryRate: number; // advance / loan %
  isCurrentMonth: boolean;
  topLoanTxs: Transaction[];
  topAdvanceTxs: Transaction[];
}

const URDU_MONTHS = [
  'جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون',
  'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'
];

export const MonthlyLoansAndAdvanceGraph: React.FC<MonthlyLoansAndAdvanceGraphProps> = ({
  customers,
  transactions,
  theme = 'light',
  shopName = 'کھاتہ لیجر',
  currencyUnit = 'روپے',
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth();

  // Generate the list of months based on timeRange
  const monthlyData = useMemo<MonthDataPoint[]>(() => {
    const monthsToGenerate: { year: number; monthIndex: number }[] = [];

    if (timeRange === '6M') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonthIndex - i, 1);
        monthsToGenerate.push({ year: d.getFullYear(), monthIndex: d.getMonth() });
      }
    } else if (timeRange === '12M') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(currentYear, currentMonthIndex - i, 1);
        monthsToGenerate.push({ year: d.getFullYear(), monthIndex: d.getMonth() });
      }
    } else {
      // THIS_YEAR
      for (let m = 0; m <= currentMonthIndex; m++) {
        monthsToGenerate.push({ year: currentYear, monthIndex: m });
      }
    }

    return monthsToGenerate.map(({ year, monthIndex }) => {
      const monthDate = new Date(year, monthIndex, 1);
      const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

      // Filter transactions for this specific month & year
      const monthTxs = transactions.filter((t) => {
        const tDate = new Date(t.timestamp);
        return tDate.getFullYear() === year && tDate.getMonth() === monthIndex;
      });

      const debitTxs = monthTxs.filter((t) => t.type === 'DEBIT');
      const creditTxs = monthTxs.filter((t) => t.type === 'CREDIT');

      const loanAmount = debitTxs.reduce((sum, t) => sum + (t.amount || 0), 0);
      const advanceAmount = creditTxs.reduce((sum, t) => sum + (t.amount || 0), 0);
      const netChange = loanAmount - advanceAmount;

      const recoveryRate =
        loanAmount > 0
          ? Math.min(100, Math.round((advanceAmount / loanAmount) * 100))
          : advanceAmount > 0
          ? 100
          : 0;

      const isCurrentMonth = year === currentYear && monthIndex === currentMonthIndex;

      // Sort top transactions
      const topLoanTxs = [...debitTxs].sort((a, b) => b.amount - a.amount).slice(0, 3);
      const topAdvanceTxs = [...creditTxs].sort((a, b) => b.amount - a.amount).slice(0, 3);

      return {
        key,
        year,
        monthIndex,
        labelUrdu: URDU_MONTHS[monthIndex],
        labelEn: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        fullMonthYearUrdu: `${URDU_MONTHS[monthIndex]} ${year}`,
        fullMonthYearEn: monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        loanAmount,
        advanceAmount,
        loanTxCount: debitTxs.length,
        advanceTxCount: creditTxs.length,
        netChange,
        recoveryRate,
        isCurrentMonth,
        topLoanTxs,
        topAdvanceTxs,
      };
    });
  }, [transactions, timeRange, currentYear, currentMonthIndex]);

  // Default active selected month to current month or latest available
  const activeMonth = useMemo(() => {
    if (selectedMonthKey) {
      const found = monthlyData.find((m) => m.key === selectedMonthKey);
      if (found) return found;
    }
    const current = monthlyData.find((m) => m.isCurrentMonth);
    return current || monthlyData[monthlyData.length - 1] || null;
  }, [monthlyData, selectedMonthKey]);

  // Aggregate metrics across the entire displayed range
  const summaryTotals = useMemo(() => {
    const totalLoans = monthlyData.reduce((sum, m) => sum + m.loanAmount, 0);
    const totalAdvances = monthlyData.reduce((sum, m) => sum + m.advanceAmount, 0);
    const netGrowth = totalLoans - totalAdvances;
    const overallRecoveryRate =
      totalLoans > 0
        ? Math.min(100, Math.round((totalAdvances / totalLoans) * 100))
        : totalAdvances > 0
        ? 100
        : 0;

    // Peak month for loans
    const highestLoanMonth = [...monthlyData].sort((a, b) => b.loanAmount - a.loanAmount)[0];
    const highestAdvanceMonth = [...monthlyData].sort((a, b) => b.advanceAmount - a.advanceAmount)[0];

    // Max amount for bar scaling (ensure minimum scale of 1000 to prevent divide-by-zero)
    const maxVal = Math.max(
      ...monthlyData.map((m) => Math.max(m.loanAmount, m.advanceAmount)),
      5000
    );

    return {
      totalLoans,
      totalAdvances,
      netGrowth,
      overallRecoveryRate,
      highestLoanMonth,
      highestAdvanceMonth,
      maxVal,
    };
  }, [monthlyData]);

  // Customer debt vs advance breakdown
  const customerBreakdown = useMemo(() => {
    let debtCustomersCount = 0;
    let debtAmount = 0;
    let advanceCustomersCount = 0;
    let advanceAmount = 0;
    let settledCustomersCount = 0;

    customers.forEach((c) => {
      if (c.balance > 0) {
        debtCustomersCount++;
        debtAmount += c.balance;
      } else if (c.balance < 0) {
        advanceCustomersCount++;
        advanceAmount += Math.abs(c.balance);
      } else {
        settledCustomersCount++;
      }
    });

    return {
      debtCustomersCount,
      debtAmount,
      advanceCustomersCount,
      advanceAmount,
      settledCustomersCount,
    };
  }, [customers]);

  // Share or copy report
  const handleShareReport = () => {
    playClickSound();
    const periodLabel =
      timeRange === '6M' ? 'گزشتہ ۶ ماہ' : timeRange === '12M' ? 'گزشتہ ۱۲ ماہ' : `${currentYear} سالانہ`;

    const report = `📊 *${shopName} - ماہانہ قرضہ جات و پیشگی ادائیگی تجزیاتی گراف*
📅 مدت: ${periodLabel} (${monthlyData[0]?.fullMonthYearUrdu} تا ${monthlyData[monthlyData.length - 1]?.fullMonthYearUrdu})
-----------------------------------------
🔴 *کل دیا گیا قرض (Total Loans Given):* ${summaryTotals.totalLoans.toLocaleString()} ${currencyUnit}
🟢 *کل پیشگی ادائیگی و وصولی (Advances & Collected):* ${summaryTotals.totalAdvances.toLocaleString()} ${currencyUnit}
📈 *خالص فرق (Net Outstanding Shift):* ${summaryTotals.netGrowth >= 0 ? `+${summaryTotals.netGrowth.toLocaleString()}` : summaryTotals.netGrowth.toLocaleString()} ${currencyUnit}
🎯 *وصولی و پیشگی شرح (Recovery Ratio):* ${summaryTotals.overallRecoveryRate}%
-----------------------------------------
📌 *ماہانہ تفصیل (Monthly Breakdown):*
${monthlyData
  .map(
    (m) =>
      `• ${m.fullMonthYearUrdu}: قرض: ${m.loanAmount.toLocaleString()} | وصولی/پیشگی: ${m.advanceAmount.toLocaleString()} | شرح: ${m.recoveryRate}%`
  )
  .join('\n')}
-----------------------------------------
👥 *گاہکوں کی موجودہ صورتحال:*
• قرض دار گاہک: ${customerBreakdown.debtCustomersCount} (کل واجب الادا: ${customerBreakdown.debtAmount.toLocaleString()} ${currencyUnit})
• پیشگی / ایڈوانس جمع گاہک: ${customerBreakdown.advanceCustomersCount} (پیشگی رقم: ${customerBreakdown.advanceAmount.toLocaleString()} ${currencyUnit})
• صاف کھاتے: ${customerBreakdown.settledCustomersCount}

📱 تیار کردہ بذریعہ آواز کھاتہ ایپ (Voice Ledger App)`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(report);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(report)}`;
    window.open(waUrl, '_blank');
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`rounded-3xl border transition-all ${
        isDark
          ? 'bg-slate-900/90 border-slate-800 text-white'
          : 'bg-white border-slate-200/90 text-slate-900 shadow-sm'
      } p-4 sm:p-5 space-y-4`}
    >
      {/* Graph Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight font-urdu flex items-center gap-1.5">
                <span>ماہانہ قرضہ جات و پیشگی ادائیگی گراف</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-sans font-bold">
                  Loans vs Advances
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ماہ بہ ماہ دیا گیا نیا ادھار قرض اور پیشگی جمع / وصولی کا تصویری موازنہ
              </p>
            </div>
          </div>
        </div>

        {/* Time Span Toggle */}
        <div className="flex items-center gap-1 self-start sm:self-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setTimeRange('6M');
            }}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              timeRange === '6M'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            6 Months
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setTimeRange('12M');
            }}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              timeRange === '12M'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            12 Months
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setTimeRange('THIS_YEAR');
            }}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              timeRange === 'THIS_YEAR'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            {currentYear}
          </button>
        </div>
      </div>

      {/* Aggregate KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Total Loans Given */}
        <div
          className={`p-3 rounded-2xl border transition-all ${
            isDark
              ? 'bg-slate-950 border-rose-950/40 text-rose-300'
              : 'bg-rose-50/80 border-rose-200/80 text-rose-950'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="font-urdu">کل دیا گیا قرض</span>
            <span className="w-5 h-5 rounded-lg bg-rose-200/60 dark:bg-rose-900/60 flex items-center justify-center text-rose-700 dark:text-rose-300">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-1 text-base sm:text-lg font-black font-mono tracking-tight text-rose-700 dark:text-rose-400">
            {summaryTotals.totalLoans.toLocaleString()}
          </div>
          <div className="text-[10px] text-rose-600 dark:text-rose-400/80 font-urdu mt-0.5">
            {currencyUnit} (ادھار دی گئی رقوم)
          </div>
        </div>

        {/* Total Advance & Received */}
        <div
          className={`p-3 rounded-2xl border transition-all ${
            isDark
              ? 'bg-slate-950 border-emerald-950/40 text-emerald-300'
              : 'bg-emerald-50/80 border-emerald-200/80 text-emerald-950'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="font-urdu">پیشگی ادائیگی و وصولی</span>
            <span className="w-5 h-5 rounded-lg bg-emerald-200/60 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-1 text-base sm:text-lg font-black font-mono tracking-tight text-emerald-700 dark:text-emerald-400">
            {summaryTotals.totalAdvances.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400/80 font-urdu mt-0.5">
            {currencyUnit} (وصول و پیشگی جمع)
          </div>
        </div>

        {/* Net Change */}
        <div
          className={`p-3 rounded-2xl border transition-all ${
            isDark
              ? 'bg-slate-950 border-slate-800 text-slate-200'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="font-urdu">خالص بقایا اضافہ</span>
            <span className="w-5 h-5 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div
            className={`mt-1 text-base sm:text-lg font-black font-mono tracking-tight ${
              summaryTotals.netGrowth > 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {summaryTotals.netGrowth >= 0
              ? `+${summaryTotals.netGrowth.toLocaleString()}`
              : summaryTotals.netGrowth.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-urdu mt-0.5">
            {summaryTotals.netGrowth >= 0 ? 'قرض میں خالص اضافہ' : 'پیشگی ریکوری زیادہ'}
          </div>
        </div>

        {/* Recovery & Advance Ratio */}
        <div
          className={`p-3 rounded-2xl border transition-all ${
            isDark
              ? 'bg-slate-950 border-amber-950/40 text-amber-300'
              : 'bg-amber-50/80 border-amber-200/80 text-amber-950'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="font-urdu">وصولی و پیشگی شرح</span>
            <span className="w-5 h-5 rounded-lg bg-amber-200/60 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-300">
              <Percent className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-1 text-base sm:text-lg font-black font-mono tracking-tight text-amber-600 dark:text-amber-400">
            {summaryTotals.overallRecoveryRate}%
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400/80 font-urdu mt-0.5">
            Advance Recovery Ratio
          </div>
        </div>
      </div>

      {/* Main Interactive Visual Bar Chart */}
      <div
        className={`p-4 rounded-3xl border transition-all ${
          isDark
            ? 'bg-slate-950 border-slate-800'
            : 'bg-slate-50/70 border-slate-200/80'
        }`}
      >
        {/* Chart Legend & Tap Instruction */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 text-xs font-bold font-urdu">
            {/* Red Bar Legend: Loans */}
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-gradient-to-t from-rose-600 to-rose-400 inline-block shadow-xs" />
              <span className="text-rose-600 dark:text-rose-400">دیا گیا قرض (Loans)</span>
            </div>
            {/* Green Bar Legend: Advance Payments */}
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-gradient-to-t from-emerald-600 to-emerald-400 inline-block shadow-xs" />
              <span className="text-emerald-600 dark:text-emerald-400">پیشگی ادائیگی و وصولی (Advances)</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-urdu flex items-center gap-1">
            <Info className="w-3 h-3 text-slate-400" />
            <span>ماہانہ تفصیل دیکھنے کے لیے کسی بھی ماہ پر کلک کریں</span>
          </div>
        </div>

        {/* Visual Graph Container */}
        <div className="relative pt-6 pb-2">
          {/* Background Grid Guide Lines */}
          <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none opacity-40">
            <div className="border-b border-dashed border-slate-300 dark:border-slate-800 flex justify-between text-[9px] text-slate-400 font-mono">
              <span>{Math.round(summaryTotals.maxVal).toLocaleString()}</span>
              <span>100%</span>
            </div>
            <div className="border-b border-dashed border-slate-300 dark:border-slate-800 flex justify-between text-[9px] text-slate-400 font-mono">
              <span>{Math.round(summaryTotals.maxVal / 2).toLocaleString()}</span>
              <span>50%</span>
            </div>
            <div className="border-b border-slate-300 dark:border-slate-800 flex justify-between text-[9px] text-slate-400 font-mono">
              <span>0</span>
              <span>0%</span>
            </div>
          </div>

          {/* Bars Grid */}
          <div
            className={`grid gap-1.5 sm:gap-3 items-end h-44 sm:h-52 px-2`}
            style={{ gridTemplateColumns: `repeat(${monthlyData.length}, minmax(0, 1fr))` }}
          >
            {monthlyData.map((m) => {
              const isSelected = activeMonth?.key === m.key;

              // Compute percentage heights relative to maxVal
              const loanHeightPct = Math.min(
                100,
                Math.max(6, Math.round((m.loanAmount / summaryTotals.maxVal) * 100))
              );
              const advanceHeightPct = Math.min(
                100,
                Math.max(6, Math.round((m.advanceAmount / summaryTotals.maxVal) * 100))
              );

              return (
                <div
                  key={m.key}
                  onClick={() => {
                    playClickSound();
                    setSelectedMonthKey(m.key);
                  }}
                  className={`flex flex-col items-center justify-end h-full cursor-pointer group relative p-1 rounded-2xl transition-all ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 ring-2 ring-indigo-500 shadow-xs'
                      : 'hover:bg-slate-200/50 dark:hover:bg-slate-900/60'
                  }`}
                >
                  {/* Floating Tooltip Bubble on Hover / Selected */}
                  <div
                    className={`absolute -top-12 z-20 pointer-events-none transition-all duration-150 whitespace-nowrap text-[10px] p-1.5 rounded-xl shadow-lg border ${
                      isSelected
                        ? 'opacity-100 scale-100 bg-slate-900 text-white border-slate-700'
                        : 'opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 bg-slate-900/90 text-white border-slate-700'
                    }`}
                  >
                    <div className="font-urdu font-bold text-center text-[10px] text-indigo-300 pb-0.5 border-b border-slate-800">
                      {m.fullMonthYearUrdu}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 font-mono">
                      <span className="text-rose-400">قرض: {m.loanAmount.toLocaleString()}</span>
                      <span className="text-emerald-400">پیشگی: {m.advanceAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Dual Bars: Loan vs Advance */}
                  <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full pb-1">
                    {/* Loan Bar (Red) */}
                    <div className="flex-1 flex flex-col items-center justify-end h-full max-w-[20px] sm:max-w-[26px]">
                      <div
                        style={{ height: `${loanHeightPct}%` }}
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          m.loanAmount > 0
                            ? 'bg-gradient-to-t from-rose-600 to-rose-400 group-hover:from-rose-500 group-hover:to-rose-300 shadow-xs'
                            : 'bg-rose-200/50 dark:bg-rose-950/40'
                        }`}
                      />
                    </div>

                    {/* Advance Bar (Green) */}
                    <div className="flex-1 flex flex-col items-center justify-end h-full max-w-[20px] sm:max-w-[26px]">
                      <div
                        style={{ height: `${advanceHeightPct}%` }}
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          m.advanceAmount > 0
                            ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:from-emerald-500 group-hover:to-emerald-300 shadow-xs'
                            : 'bg-emerald-200/50 dark:bg-emerald-950/40'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Month Label Underneath */}
                  <div className="w-full text-center pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span
                      className={`block text-[10px] sm:text-[11px] font-urdu transition-colors truncate ${
                        isSelected
                          ? 'font-black text-indigo-600 dark:text-indigo-400'
                          : m.isCurrentMonth
                          ? 'font-bold text-slate-900 dark:text-slate-100'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {m.labelUrdu}
                    </span>
                    <span className="text-[9px] text-slate-400 font-sans block truncate -mt-0.5">
                      {m.labelEn}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Month In-Depth Focus Card */}
      {activeMonth && (
        <div
          className={`p-4 rounded-3xl border transition-all ${
            isDark
              ? 'bg-slate-950/90 border-slate-800 text-slate-100'
              : 'bg-indigo-50/40 border-indigo-100 text-slate-900'
          } space-y-3`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-100/80 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-sans">
                Focused Month Details
              </span>
              <h4 className="text-base font-black font-urdu text-slate-900 dark:text-white flex items-center gap-2">
                <span>{activeMonth.fullMonthYearUrdu} کی تفصیلی جائزہ رپورٹ</span>
                {activeMonth.isCurrentMonth && (
                  <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-indigo-600 text-white font-bold">
                    Current Month
                  </span>
                )}
              </h4>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold">
                قرض: {activeMonth.loanAmount.toLocaleString()} {currencyUnit}
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                پیشگی: {activeMonth.advanceAmount.toLocaleString()} {currencyUnit}
              </span>
            </div>
          </div>

          {/* Month Comparison Ratio Bar */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold mb-1.5 font-urdu">
              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <span>قرض تناسب ({activeMonth.loanTxCount} انٹریز)</span>
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">
                ریکوری و پیشگی شرح: {activeMonth.recoveryRate}%
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span>پیشگی و وصولی ({activeMonth.advanceTxCount} انٹریز)</span>
              </span>
            </div>

            {/* Proportion Bar */}
            <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{
                  width: `${
                    activeMonth.loanAmount + activeMonth.advanceAmount > 0
                      ? Math.round(
                          (activeMonth.loanAmount /
                            (activeMonth.loanAmount + activeMonth.advanceAmount)) *
                            100
                        )
                      : 50
                  }%`,
                }}
                className="bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-300"
              />
              <div
                style={{
                  width: `${
                    activeMonth.loanAmount + activeMonth.advanceAmount > 0
                      ? Math.round(
                          (activeMonth.advanceAmount /
                            (activeMonth.loanAmount + activeMonth.advanceAmount)) *
                            100
                        )
                      : 50
                  }%`,
                }}
                className="bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-300"
              />
            </div>
          </div>

          {/* Top Transactions in This Month */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Top Loan Recipients */}
            <div
              className={`p-3 rounded-2xl border ${
                isDark
                  ? 'bg-slate-900 border-rose-950/50'
                  : 'bg-white border-rose-100 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-rose-100 dark:border-slate-800 text-xs font-bold text-rose-700 dark:text-rose-400 font-urdu">
                <span className="flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>اس ماہ کے بڑے ادھار (Top Loans)</span>
                </span>
                <span className="text-[10px] font-sans text-slate-400">
                  {activeMonth.topLoanTxs.length} ریکارڈ
                </span>
              </div>

              {activeMonth.topLoanTxs.length === 0 ? (
                <p className="text-[11px] text-slate-400 font-urdu py-2 text-center">
                  اس ماہ کوئی قرض انٹری درج نہیں۔
                </p>
              ) : (
                <div className="space-y-1.5">
                  {activeMonth.topLoanTxs.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between text-xs p-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80"
                    >
                      <div className="truncate mr-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200 font-urdu block truncate">
                          {tx.customerNameUrdu || tx.customerName}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {tx.note || 'ادھار'}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400 shrink-0">
                        +{tx.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Advance Payers / Collections */}
            <div
              className={`p-3 rounded-2xl border ${
                isDark
                  ? 'bg-slate-900 border-emerald-950/50'
                  : 'bg-white border-emerald-100 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-emerald-100 dark:border-slate-800 text-xs font-bold text-emerald-700 dark:text-emerald-400 font-urdu">
                <span className="flex items-center gap-1">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>اس ماہ کی بڑی وصولیاں و پیشگی (Top Advances)</span>
                </span>
                <span className="text-[10px] font-sans text-slate-400">
                  {activeMonth.topAdvanceTxs.length} ریکارڈ
                </span>
              </div>

              {activeMonth.topAdvanceTxs.length === 0 ? (
                <p className="text-[11px] text-slate-400 font-urdu py-2 text-center">
                  اس ماہ کوئی وصولی یا پیشگی رقم درج نہیں۔
                </p>
              ) : (
                <div className="space-y-1.5">
                  {activeMonth.topAdvanceTxs.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between text-xs p-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80"
                    >
                      <div className="truncate mr-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200 font-urdu block truncate">
                          {tx.customerNameUrdu || tx.customerName}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {tx.note || 'وصولی / پیشگی'}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        -{tx.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer Advance & Debt Balance Portfolio Bar */}
      <div
        className={`p-3.5 rounded-2xl border text-xs ${
          isDark
            ? 'bg-slate-950 border-slate-800 text-slate-300'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        } flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="font-urdu font-bold">
            مجموعی دکان کا کھاتہ پورٹ فولیو ({customers.length} کل کھاتے):
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-urdu text-[11px]">
          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            <span>قرض دار گاہک: <strong>{customerBreakdown.debtCustomersCount}</strong> ({customerBreakdown.debtAmount.toLocaleString()} {currencyUnit})</span>
          </span>

          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>پیشگی رقم گاہک: <strong>{customerBreakdown.advanceCustomersCount}</strong> ({customerBreakdown.advanceAmount.toLocaleString()} {currencyUnit})</span>
          </span>

          <span className="text-slate-400">
            صاف: <strong>{customerBreakdown.settledCustomersCount}</strong>
          </span>
        </div>
      </div>

      {/* Action to Share / Export Graph Report */}
      <div className="pt-2 flex items-center justify-end">
        <button
          type="button"
          onClick={handleShareReport}
          className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs font-urdu flex items-center gap-2 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
        >
          {isCopied ? <Check className="w-4 h-4 text-white" /> : <Share2 className="w-4 h-4" />}
          <span>
            {isCopied
              ? 'گراف رپورٹ کاپی ہو گئی اور واٹس ایپ کھل گئی!'
              : 'ماہانہ قرض و پیشگی گراف واٹس ایپ پر شیئر کریں'}
          </span>
        </button>
      </div>
    </div>
  );
};
