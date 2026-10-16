import React, { useState } from 'react';
import { Fingerprint, Lock, ShieldCheck, Delete, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playClickSound, playSuccessChime, playErrorAlert } from '../utils/audio';

interface BiometricLockModalProps {
  correctPin: string;
  onUnlock: () => void;
  shopName: string;
}

export const BiometricLockModal: React.FC<BiometricLockModalProps> = ({
  correctPin,
  onUnlock,
  shopName,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const handleDigit = (digit: string) => {
    if (pinInput.length >= 4) return;
    playClickSound();
    const newPin = pinInput + digit;
    setPinInput(newPin);
    setErrorMsg('');

    if (newPin.length === 4) {
      if (newPin === correctPin) {
        playSuccessChime();
        setTimeout(onUnlock, 150);
      } else {
        playErrorAlert();
        setErrorMsg('غلط پن درج کیا گیا ہے (Incorrect PIN)');
        setTimeout(() => setPinInput(''), 600);
      }
    }
  };

  const handleDelete = () => {
    playClickSound();
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleBiometricAuth = () => {
    setIsScanning(true);
    playClickSound();

    setTimeout(() => {
      setIsScanning(false);
      playSuccessChime();
      onUnlock();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl px-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center"
      >
        {/* App Branding & Lock Header */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
          <Lock className="w-8 h-8 text-emerald-400" />
        </div>

        <h2 className="text-xl font-bold text-white tracking-tight">{shopName}</h2>
        <p className="text-sm text-emerald-400 font-urdu mt-1 text-base">
          صرافہ و کریانہ کھاتہ بک - بائیو میٹرک سیکیورٹی
        </p>

        {/* Biometric Fingerprint Button */}
        <div className="my-5 relative flex flex-col items-center">
          <motion.button
            id="fingerprint-scan-btn"
            onClick={handleBiometricAuth}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all ${
              isScanning
                ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.5)]'
                : 'border-slate-700 hover:border-emerald-500 bg-slate-800/80'
            }`}
          >
            <Fingerprint
              className={`w-10 h-10 ${
                isScanning ? 'text-emerald-300 animate-pulse' : 'text-slate-300 hover:text-emerald-400'
              }`}
            />
          </motion.button>
          <span className="text-xs text-slate-400 mt-2 font-medium">
            {isScanning ? 'انگلی کی تصدیق جاری ہے...' : 'فنگر پرنٹ ٹچ کریں یا پن درج کریں'}
          </span>
        </div>

        {/* PIN Indicators */}
        <div className="flex gap-4 my-2">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = index < pinInput.length;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full border transition-all ${
                  isFilled
                    ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-[0_0_10px_rgba(52,211,153,0.8)]'
                    : 'bg-slate-800 border-slate-700'
                }`}
              />
            );
          })}
        </div>

        <AnimatePresence>
          {errorMsg && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-rose-400 mt-2 font-medium"
            >
              {errorMsg}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] mt-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              id={`pin-btn-${digit}`}
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-2xl bg-slate-800/60 hover:bg-slate-700/80 active:bg-emerald-600/30 border border-slate-700/50 text-xl font-semibold text-white flex items-center justify-center transition-colors"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={() => setShowHint(!showHint)}
            className="h-14 rounded-2xl bg-slate-800/30 hover:bg-slate-800 border border-transparent text-slate-400 flex items-center justify-center text-xs"
            title="Hint"
          >
            <KeyRound className="w-5 h-5 text-slate-500" />
          </button>
          <button
            id="pin-btn-0"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-800/60 hover:bg-slate-700/80 active:bg-emerald-600/30 border border-slate-700/50 text-xl font-semibold text-white flex items-center justify-center transition-colors"
          >
            0
          </button>
          <button
            id="pin-btn-backspace"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-800/30 hover:bg-slate-800 border border-transparent text-slate-400 flex items-center justify-center transition-colors"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {showHint && (
          <p className="text-xs text-emerald-400/80 mt-3">
            ڈیمو پن کوڈ: <span className="font-mono font-bold text-white">{correctPin}</span>
          </p>
        )}

        <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>SQLCipher AES-256 آن ڈیوائس محفوظ ڈیٹا بیس</span>
        </div>
      </motion.div>
    </div>
  );
};
