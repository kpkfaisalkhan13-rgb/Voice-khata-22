import React, { useState } from 'react';
import { X, UserPlus, Phone, MapPin, DollarSign, Sparkles } from 'lucide-react';
import { playClickSound, playSuccessChime } from '../utils/audio';
import { URDU_NAME_MAPPINGS, ENGLISH_TO_URDU_MAP } from '../utils/urduParser';
import { useLanguage } from '../i18n/LanguageContext';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, nameUrdu: string, phone: string, address: string, initialBalance: number, debtLimit?: number) => Promise<void>;
  prefilledName?: string;
  prefilledUrduName?: string;
  prefilledBalance?: number;
  defaultDebtLimit?: number;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  prefilledName = '',
  prefilledUrduName = '',
  prefilledBalance = 0,
  defaultDebtLimit = 20000,
}) => {
  const { t, isUrdu } = useLanguage();
  const [name, setName] = useState(prefilledName);
  const [nameUrdu, setNameUrdu] = useState(prefilledUrduName);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [initialBalance, setInitialBalance] = useState(prefilledBalance ? prefilledBalance.toString() : '0');
  const [debtLimit, setDebtLimit] = useState(defaultDebtLimit.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleUrduNameChange = (val: string) => {
    setNameUrdu(val);
    if (!name && URDU_NAME_MAPPINGS[val]) {
      setName(URDU_NAME_MAPPINGS[val]);
    }
  };

  const handleEnglishNameChange = (val: string) => {
    setName(val);
    const mapped = ENGLISH_TO_URDU_MAP[val.toLowerCase()];
    if (!nameUrdu && mapped) {
      setNameUrdu(mapped);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() && !nameUrdu.trim()) return;

    setIsSubmitting(true);
    playClickSound();

    const finalName = name.trim() || nameUrdu.trim();
    const finalNameUrdu = nameUrdu.trim() || name.trim();
    const balanceNum = parseFloat(initialBalance) || 0;
    const limitNum = parseFloat(debtLimit) || defaultDebtLimit;

    await onAdd(finalName, finalNameUrdu, phone.trim(), address.trim(), balanceNum, limitNum);
    playSuccessChime();
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative text-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className={`text-lg font-bold text-slate-900 ${isUrdu ? 'font-urdu' : ''}`}>
                {isUrdu ? 'نیا کھاتہ کھولیں' : 'Add New Customer'}
              </h3>
              <p className="text-xs text-slate-400">EasyKhata / DigiKhata Record</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 font-urdu text-right">
              کسٹمر کا نام (اردو میں):
            </label>
            <input
              type="text"
              value={nameUrdu}
              onChange={(e) => handleUrduNameChange(e.target.value)}
              placeholder="مثال: علی احمد / عمر فاروق"
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-urdu text-right focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer Name (English / Roman):
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleEnglishNameChange(e.target.value)}
              placeholder="e.g. Ali Ahmed"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="font-urdu">فون نمبر (موبائل):</span>
              <Phone className="w-3.5 h-3.5 text-slate-400" />
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0300-1234567"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="font-urdu">پتہ / دکان کی تفصیل:</span>
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="محلہ / مارکیٹ / پتہ"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-urdu text-right focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="font-urdu">شروع کا بقایا ادھار (Initial Balance):</span>
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
            </label>
            <input
              type="number"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="0"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
            <span className="text-[10px] text-slate-400 block mt-1 font-urdu">
              مثبت (+) رقم = گاہک نے آپ کو دینے ہیں (قرض لیا ہوا ہے)۔
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-amber-800 mb-1 flex items-center justify-between">
              <span className="font-urdu">قرض کی زیادہ سے زیادہ حد (Debt Limit):</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 border border-amber-200 text-amber-800 font-bold">
                PKR LIMIT
              </span>
            </label>
            <input
              type="number"
              value={debtLimit}
              onChange={(e) => setDebtLimit(e.target.value)}
              placeholder="20000"
              className="w-full bg-amber-50/40 border border-amber-300 rounded-xl px-3.5 py-2.5 text-sm text-amber-950 font-mono focus:outline-none focus:border-amber-500 focus:bg-white"
            />
            <span className="text-[10px] text-slate-500 block mt-1 font-urdu">
              اس رقم سے زیادہ ادھار پر سرخ الرٹ نشان دکھایا جائے گا۔
            </span>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-urdu flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t.save}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
