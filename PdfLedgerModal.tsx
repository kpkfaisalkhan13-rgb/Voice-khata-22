import React, { useState } from 'react';
import {
  X,
  Printer,
  FileText,
  Share2,
  MessageCircle,
  Check,
  Copy,
  Calendar,
  Building,
  User,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { Customer, Transaction } from '../types';
import { playClickSound, playSuccessChime } from '../utils/audio';

interface PdfLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  allCustomers: Customer[];
  allTransactions: Transaction[];
  shopName: string;
  shopOwner?: string;
}

export const PdfLedgerModal: React.FC<PdfLedgerModalProps> = ({
  isOpen,
  onClose,
  customer,
  allCustomers,
  allTransactions,
  shopName,
  shopOwner = 'دکاندار',
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    customer ? customer.id : allCustomers[0]?.id || ''
  );
  const [copiedText, setCopiedText] = useState(false);

  if (!isOpen) return null;

  const currentCustomer = customer || allCustomers.find((c) => c.id === selectedCustomerId);
  const customerTxns = currentCustomer
    ? allTransactions
        .filter((t) => t.customerId === currentCustomer.id)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    : [];

  const totalDebit = customerTxns
    .filter((t) => t.type === 'DEBIT')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCredit = customerTxns
    .filter((t) => t.type === 'CREDIT')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = currentCustomer ? currentCustomer.balance : totalDebit - totalCredit;

  const handlePrint = () => {
    playClickSound();
    window.print();
  };

  // Build formal statement text for sharing
  const getStatementShareText = () => {
    if (!currentCustomer) return '';
    const statusText = netBalance > 0 ? 'واجب الادا بقایا قرض' : netBalance < 0 ? 'پیشگی جمع رقم' : 'کھاتہ برابر';
    const recentTxnsList = customerTxns.slice(-5).map((t, idx) => {
      const dateStr = new Date(t.timestamp).toLocaleDateString('ur-PK');
      const typeStr = t.type === 'DEBIT' ? 'قرض' : 'وصولی';
      return `${idx + 1}. ${dateStr} - ${typeStr}: ${t.amount.toLocaleString()} روپے (${t.note})`;
    }).join('\n');

    return `📋 *کھاتہ اسٹیٹمنٹ - ${shopName}*
👤 *محترم گاہک:* ${currentCustomer.nameUrdu || currentCustomer.name}
📅 *تاریخ:* ${new Date().toLocaleDateString('ur-PK')}
---------------------------
💰 *موجودہ خالص بقایا:* *${Math.abs(netBalance).toLocaleString()} روپے* (${statusText})
کل قرض دیا گیا: ${totalDebit.toLocaleString()} روپے
کل وصولی ہوئی: ${totalCredit.toLocaleString()} روپے
---------------------------
📜 *آخری لین دین:*
${recentTxnsList || 'کوئی ٹرانزیکشن نہیں'}
---------------------------
پروپرائیٹر: ${shopOwner}
شکریہ! جزاک اللہ خیراً`;
  };

  // Web Share API (Android native share sheet / WhatsApp / Drive)
  const handleNativeShare = async () => {
    playClickSound();
    const shareText = getStatementShareText();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `کھاتہ اسٹیٹمنٹ - ${currentCustomer?.nameUrdu || currentCustomer?.name || shopName}`,
          text: shareText,
        });
        playSuccessChime();
        return;
      } catch (err) {
        // User cancelled or share failed, fallback to WhatsApp
        console.log('Share dismissed or fallback:', err);
      }
    }

    // Fallback: WhatsApp share
    handleWhatsAppShare();
  };

  // Direct WhatsApp Share
  const handleWhatsAppShare = () => {
    playClickSound();
    const text = getStatementShareText();
    let url = '';
    if (currentCustomer?.phone) {
      const cleanPhone = currentCustomer.phone.replace(/[^0-9]/g, '');
      const formattedPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.substring(1) : cleanPhone;
      url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
    } else {
      url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    }
    window.open(url, '_blank');
  };

  // Copy Statement Text to Clipboard
  const handleCopyStatement = () => {
    playClickSound();
    const text = getStatementShareText();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedText(true);
      playSuccessChime();
      setTimeout(() => setCopiedText(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto print:p-0 print:bg-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[92vh] flex flex-col print:max-h-none print:shadow-none print:rounded-none print:w-full"
      >
        {/* Top Actions (Hidden in Print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-200 print:hidden gap-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-base text-slate-900 font-urdu leading-tight">
                گاہک کھاتہ پی ڈی ایف و شیئر (PDF Ledger & Share)
              </h3>
              <span className="text-xs text-slate-500">آفیشل رسید و کھاتہ اسٹیٹمنٹ</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {!customer && allCustomers.length > 1 && (
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-urdu font-medium text-slate-800"
              >
                {allCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameUrdu || c.name}
                  </option>
                ))}
              </select>
            )}

            {/* Native Share / WhatsApp Buttons */}
            <button
              id="share-ledger-native-btn"
              onClick={handleNativeShare}
              title="واٹس ایپ یا دیگر ایپس پر شیئر کریں"
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-urdu flex items-center gap-1 shadow-sm transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>شیئر کریں</span>
            </button>

            <button
              id="share-ledger-whatsapp-btn"
              onClick={handleWhatsAppShare}
              title="براہ راست واٹس ایپ کھولیں"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-urdu flex items-center gap-1 shadow-sm transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>واٹس ایپ</span>
            </button>

            <button
              id="copy-ledger-text-btn"
              onClick={handleCopyStatement}
              title="کھاتہ تحریر کاپی کریں"
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center transition-colors"
            >
              {copiedText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              id="print-ledger-btn"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold font-urdu flex items-center gap-1 shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>پرنٹ / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-5 print:overflow-visible text-slate-900" id="printable-ledger-doc">
          {/* Statement Header */}
          <div className="border-b-2 border-slate-800 pb-4 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black font-urdu text-slate-950 tracking-tight">
                {shopName}
              </h1>
              <span className="text-xs text-slate-600 font-urdu block">
                پروپرائیٹر: {shopOwner} • باضابطہ کھاتہ ریکارڈ
              </span>
              <span className="text-[11px] text-slate-500 block font-mono mt-0.5">
                تاریخ اجرا: {new Date().toLocaleDateString('ur-PK')} - {new Date().toLocaleTimeString()}
              </span>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 font-urdu font-bold text-xs rounded-full border border-emerald-300">
                کھاتہ اسٹیٹمنٹ
              </span>
            </div>
          </div>

          {/* Customer Summary Bar */}
          {currentCustomer && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row justify-between gap-3">
              <div>
                <span className="text-xs text-slate-500 font-urdu block">گاہک کی تفصیلات:</span>
                <span className="text-lg font-bold font-urdu text-slate-950 block">
                  {currentCustomer.nameUrdu || currentCustomer.name}
                  <span className="text-xs font-sans text-slate-600 ml-1.5 font-normal">
                    ({currentCustomer.name})
                  </span>
                </span>
                <span className="text-xs text-slate-600 font-mono block">
                  فون: {currentCustomer.phone || 'فون نمبر درج نہیں'}
                </span>
                {currentCustomer.address && (
                  <span className="text-xs text-slate-600 font-urdu block">
                    پتہ: {currentCustomer.address}
                  </span>
                )}
              </div>

              <div className="text-right sm:border-r sm:pr-4 border-slate-200">
                <span className="text-xs text-slate-500 font-urdu block">موجودہ خالص بقایا:</span>
                <span
                  className={`text-2xl font-black font-mono block ${
                    currentCustomer.balance > 0 ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {Math.abs(currentCustomer.balance).toLocaleString()} روپے
                </span>
                <span className="text-xs font-urdu font-bold text-slate-600">
                  {currentCustomer.balance > 0
                    ? 'آپ نے وصول کرنے ہیں (ادھار)'
                    : currentCustomer.balance < 0
                    ? 'آپ نے دینے ہیں (پیشگی)'
                    : 'حساب برابر'}
                </span>
                {currentCustomer.debtLimit && (
                  <span className="text-[10px] text-slate-500 font-urdu block mt-0.5">
                    مقررہ حد: {currentCustomer.debtLimit.toLocaleString()} روپے
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Transactions Ledger Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-sm text-slate-900 font-urdu">
                لین دین کی مکمل تفصیل (Transaction History):
              </h4>
              <span className="text-xs text-slate-500 font-mono">
                کل انٹریز: {customerTxns.length}
              </span>
            </div>

            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-urdu border-y border-slate-300">
                  <th className="py-2.5 px-3">نمبر</th>
                  <th className="py-2.5 px-3">تاریخ و وقت</th>
                  <th className="py-2.5 px-3">تفصیل / سامان</th>
                  <th className="py-2.5 px-3 text-rose-700 text-left">قرض دیا (+)</th>
                  <th className="py-2.5 px-3 text-emerald-700 text-left">وصول ہوئے (-)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-urdu">
                {customerTxns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      اس گاہک کا کوئی لین دین درج نہیں ہے۔
                    </td>
                  </tr>
                ) : (
                  customerTxns.map((tx, idx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-sans text-[11px]">
                        {new Date(tx.timestamp).toLocaleDateString()} {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 font-medium">
                        {tx.note}
                        {tx.rawTranscript && (
                          <span className="text-[10px] text-slate-400 block font-urdu">
                            (آواز: &quot;{tx.rawTranscript}&quot;)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-rose-700 text-left">
                        {tx.type === 'DEBIT' ? tx.amount.toLocaleString() : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 text-left">
                        {tx.type === 'CREDIT' ? tx.amount.toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200 font-urdu">
                <tr>
                  <td colSpan={3} className="py-2.5 px-3 text-slate-700">
                    کل میزان (Total Figures):
                  </td>
                  <td className="py-2.5 px-3 font-mono text-rose-700 text-left">
                    {totalDebit.toLocaleString()} روپے
                  </td>
                  <td className="py-2.5 px-3 font-mono text-emerald-700 text-left">
                    {totalCredit.toLocaleString()} روپے
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Verification & Stamp Footer */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-urdu">
            <div>
              <span className="block">تصدیق کنندہ: {shopOwner}</span>
              <span className="block text-[10px] text-slate-400 font-mono">
                Computer Generated Ledger via Voice Udhaar App
              </span>
            </div>
            <div className="text-center border-t border-slate-400 pt-1 w-32">
              دستخط / مہر
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
