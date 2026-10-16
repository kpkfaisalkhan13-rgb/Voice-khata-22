import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Download,
  Upload,
  Key,
  Database,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Fingerprint,
  Mic,
  CreditCard,
  Sparkles,
  Calendar,
  Clock,
  Check,
  Cloud,
  HardDrive,
  Radio,
  AlertTriangle
} from 'lucide-react';
import { AppSettings } from '../types';
import { getTrialStatus, ADMIN_PIN } from '../utils/subscription';
import { googleDriveService, GoogleDriveFile } from '../services/googleDriveService';
import { connectivityService } from '../services/connectivityService';
import { adService } from '../services/adService';
import { playClickSound, playSuccessChime, playErrorAlert } from '../utils/audio';

interface BackupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: Partial<AppSettings>) => void;
  onExportEncrypted: () => Promise<void>;
  onExportRawSQLite: () => void;
  onImportEncrypted: (fileContent: string, pin: string) => Promise<boolean>;
  onOpenPaymentModal: () => void;
  onExtendSubscription: (plan: 'VOICE' | 'PDF_ANALYTICS' | 'COMBO', days: number) => void;
  onSimulateTrialDay: (day: number) => void;
}

export const BackupSettingsModal: React.FC<BackupSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onExportEncrypted,
  onExportRawSQLite,
  onImportEncrypted,
  onOpenPaymentModal,
  onExtendSubscription,
  onSimulateTrialDay,
}) => {
  const [groqKey, setGroqKey] = useState(settings.groqApiKey || '');
  const [model, setModel] = useState(settings.whisperModel || 'whisper-large-v3-turbo');
  const [shopName, setShopName] = useState(settings.shopName);
  const [newPin, setNewPin] = useState(settings.pin || '1234');
  const [biometric, setBiometric] = useState(settings.biometricEnabled);
  const [securityEnabled, setSecurityEnabled] = useState(
    Boolean(settings.biometricEnabled && settings.pin && settings.pin.trim())
  );
  const [defaultDebtLimit, setDefaultDebtLimit] = useState(
    (settings.defaultDebtLimit ?? 20000).toString()
  );
  const [enableDebtAlerts, setEnableDebtAlerts] = useState(
    settings.enableDebtAlerts ?? true
  );

  // Admin section state
  const [adminPinInput, setAdminPinInput] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminError, setAdminError] = useState(false);
  const [adminActionNotice, setAdminActionNotice] = useState<string | null>(null);

  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importPin, setImportPin] = useState('');
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Google Drive OAuth 2.0 State
  const [gdriveTokenInput, setGdriveTokenInput] = useState('');
  const [isDriveConnected, setIsDriveConnected] = useState(googleDriveService.isConnected());
  const [driveStatus, setDriveStatus] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);

  useEffect(() => {
    setIsDriveConnected(googleDriveService.isConnected());
  }, [isOpen]);

  if (!isOpen) return null;

  const trial = getTrialStatus(settings.subscription);
  const sub = settings.subscription;

  const handleAdminUnlock = () => {
    playClickSound();
    if (adminPinInput.trim() === ADMIN_PIN) {
      playSuccessChime();
      setIsAdminUnlocked(true);
      setAdminError(false);
    } else {
      setAdminError(true);
    }
  };

  const handleAdminExtend = (plan: 'VOICE' | 'PDF_ANALYTICS' | 'COMBO', days = 30) => {
    playSuccessChime();
    onExtendSubscription(plan, days);
    setAdminActionNotice(`✓ سبسکرپشن برائے "${plan}" کامیابی سے ۳۰ دن کے لیے بڑھا دی گئی!`);
    setTimeout(() => setAdminActionNotice(null), 4000);
  };

  const handleSimulate = (day: number) => {
    playClickSound();
    onSimulateTrialDay(day);
    setAdminActionNotice(`✓ ٹرائل کو ڈے ${day} پر سیٹ کر دیا گیا (${day <= 30 ? 'فری ٹرائل فعال' : 'ٹرائل ایکسپائر - لاک موڈ'})`);
    setTimeout(() => setAdminActionNotice(null), 4000);
  };

  const handleSave = () => {
    playClickSound();
    onSaveSettings({
      groqApiKey: groqKey.trim(),
      whisperModel: model,
      shopName: shopName.trim() || 'بسم اللہ جنرل سٹور',
      pin: securityEnabled ? (newPin.length === 4 ? newPin : '1234') : '',
      biometricEnabled: securityEnabled ? biometric : false,
      defaultDebtLimit: Number(defaultDebtLimit) || 20000,
      enableDebtAlerts,
    });
    playSuccessChime();
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setSelectedFileContent(text);
      setImportStatus('فائل منتخب ہو گئی۔ درآمد کرنے کے لیے پن درج کریں۔');
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!selectedFileContent) return;
    try {
      playClickSound();
      const ok = await onImportEncrypted(selectedFileContent, importPin || newPin);
      if (ok) {
        playSuccessChime();
        setImportStatus('بیک اپ کامیابی سے بحال ہو گیا! (Restored successfully)');
        setTimeout(() => onClose(), 1200);
      }
    } catch {
      setImportStatus('درآمد ناکام ہوئی۔ غلط پن کوڈ یا خراب فائل۔');
    }
  };

  const handleConnectDrive = () => {
    // Network Connectivity Guardrail
    const connCheck = connectivityService.checkCloudAvailability(true);
    if (!connCheck.allowed) {
      playErrorAlert();
      setDriveStatus(connCheck.message || 'Cloud sync requires an internet connection. Please connect to Wi-Fi or mobile data.');
      return;
    }

    playClickSound();
    if (!gdriveTokenInput.trim()) {
      setDriveStatus('برائے مہربانی OAuth ٹوکن درج فرمائیں۔');
      return;
    }
    googleDriveService.setToken(gdriveTokenInput.trim(), 7200);
    setIsDriveConnected(true);
    setDriveStatus('✓ گوگل ڈرائیو کامیابی سے منسلک ہو گیا! (Connected)');
  };

  const handleDisconnectDrive = () => {
    playClickSound();
    googleDriveService.disconnect();
    setIsDriveConnected(false);
    setDriveFiles([]);
    setDriveStatus('گوگل ڈرائیو ڈس کنیکٹ ہو گیا۔');
  };

  const handleDriveUpload = async () => {
    // Network Connectivity Guardrail
    const connCheck = connectivityService.checkCloudAvailability(true);
    if (!connCheck.allowed) {
      playErrorAlert();
      setDriveStatus(connCheck.message || 'Cloud sync requires an internet connection. Please connect to Wi-Fi or mobile data.');
      return;
    }

    if (!googleDriveService.isConnected()) {
      setDriveStatus('پہلے گوگل ڈرائیو منسلک کریں۔');
      return;
    }

    try {
      setIsUploadingDrive(true);
      setDriveStatus('اینکرپٹڈ بیک اپ تیار ہو رہا ہے...');
      playClickSound();
      await onExportEncrypted();
      setDriveStatus('✓ اینکرپٹڈ فائل تیار ہے اور گوگل ڈرائیو سنک جاری ہے');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDriveStatus(`خرابی: ${msg}`);
    } finally {
      setIsUploadingDrive(false);
    }
  };

  const handleLoadDriveBackups = async () => {
    // Network Connectivity Guardrail
    const connCheck = connectivityService.checkCloudAvailability(true);
    if (!connCheck.allowed) {
      playErrorAlert();
      setDriveStatus(connCheck.message || 'Cloud sync requires an internet connection. Please connect to Wi-Fi or mobile data.');
      return;
    }

    playClickSound();
    setDriveStatus('ڈرائیو سے فائلیں چیک کی جا رہی ہیں...');
    const files = await googleDriveService.listBackups();
    setDriveFiles(files);
    if (files.length === 0) {
      setDriveStatus('کوئی سابقہ بیک اپ نہیں ملا۔');
    } else {
      setDriveStatus(`✓ ${files.length} بیک اپ فائلیں مل گئیں۔`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-white max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-urdu text-white">سیٹنگز و اینکرپٹڈ بیک اپ</h3>
              <p className="text-[11px] text-slate-400">Settings & SQLCipher Storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-sm">
          {/* SQLCipher Zero-Cost Encryption Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-950 border border-emerald-500/30 flex items-start gap-3">
            <Database className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <span>SQLCipher AES-256 GCM Storage</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                  $0 Zero-Cost
                </span>
              </h4>
              <p className="text-xs text-slate-300 font-urdu mt-1 leading-relaxed">
                تمام کھاتے 100 فیصد آپ کے فون میں محفوظ ہیں، بغیر کسی بیرونی سرور فیس کے۔ ڈیٹا بیس 256-bit اینکرپشن کے ساتھ بند ہے۔
              </p>
            </div>
          </div>

          {/* Subscription & Freemium Status */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-white flex items-center gap-1.5 font-urdu">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>سبسکرپشن و فری ٹرائل اسٹیٹس (Subscription Status)</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  trial.isTrialActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {trial.isTrialActive ? `ڈے ${trial.currentDay} / 30 (مفت ٹرائل)` : 'ٹرائل مکمل (Day 31+)'}
              </span>
            </div>

            <div className="text-xs text-slate-300 font-urdu leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              {trial.isTrialActive ? (
                <p className="text-emerald-300">
                  ✓ آپ ۳۰ دن کے مفت ٹرائل پر ہیں۔ تمام فیچرز (آواز، پی ڈی ایف، اینالیٹکس) مفت ہیں۔ ({trial.daysRemaining} دن باقی)
                </p>
              ) : (
                <div className="space-y-1 text-slate-300">
                  <p className="text-amber-300 font-semibold">
                    ۳۰ دن کا ٹرائل ختم ہو چکا ہے۔ دستی کھاتہ مفت ہے۔
                  </p>
                  <p className="text-[11px] text-slate-400">
                    وائس فیچر: {sub.voiceExpiresAt && new Date(sub.voiceExpiresAt).getTime() > Date.now() ? '✓ ایکٹیو' : '🔒 بند (50 روپے/ماہ)'} • پی ڈی ایف و اینالیٹکس: {sub.pdfAnalyticsExpiresAt && new Date(sub.pdfAnalyticsExpiresAt).getTime() > Date.now() ? '✓ ایکٹیو' : '🔒 بند (150 روپے/ماہ)'}
                  </p>
                </div>
              )}
            </div>

            <button
              id="open-payment-dialog-from-settings"
              onClick={() => {
                playClickSound();
                onOpenPaymentModal();
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs font-urdu flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
            >
              <CreditCard className="w-4 h-4" />
              <span>پریمیم پلان اپ گریڈ اور ادائیگی (EasyPaisa / JazzCash / Bank)</span>
            </button>
          </div>

          {/* Admin Manual Unlock System (Protected by ADMIN123) */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-300 flex items-center gap-1.5 font-urdu">
                {isAdminUnlocked ? <Unlock className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-slate-500" />}
                <span>ایڈمن مینول انلاک سسٹم (Admin Unlock Option)</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">PIN: ADMIN123</span>
            </div>

            {!isAdminUnlocked ? (
              <div className="flex gap-2">
                <input
                  type="password"
                  value={adminPinInput}
                  onChange={(e) => {
                    setAdminPinInput(e.target.value);
                    setAdminError(false);
                  }}
                  placeholder="ایڈمن پن درج کریں (ADMIN123)"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  id="admin-pin-unlock-btn"
                  onClick={handleAdminUnlock}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold font-urdu transition-colors"
                >
                  انلاک ایڈمن
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 font-urdu flex items-center justify-between">
                  <span>✓ ایڈمن موڈ فعال ہے۔ واٹس ایپ یا جی میل رسید دیکھ کر ۳۰ دن بڑھائیں۔</span>
                  <span className="text-[10px] font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-200">
                    AUTHORIZED
                  </span>
                </div>

                {/* Last Submitted TXZ ID details if any */}
                {sub.lastTxzIdSubmitted && (
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono">
                    <span className="text-slate-400 block font-urdu">موصولہ تصدیق:</span>
                    <span className="text-white font-bold">TXZ ID: {sub.lastTxzIdSubmitted}</span>
                    <span className="text-slate-400 block">طریقہ: {sub.lastPaymentMethod || 'EasyPaisa/JazzCash'} • پلان: {sub.paymentPendingPlan || 'COMBO'}</span>
                  </div>
                )}

                {/* 30-Day Extension Action Buttons */}
                <div className="space-y-2">
                  <span className="text-xs text-slate-300 font-urdu font-bold block">
                    سبسکرپشن ۳۰ دن کے لیے ایکٹیویٹ کریں:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      id="admin-extend-voice-btn"
                      onClick={() => handleAdminExtend('VOICE', 30)}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 text-xs font-urdu font-bold transition-all text-center"
                    >
                      +30 دن آواز (Rs 50)
                    </button>
                    <button
                      id="admin-extend-pdf-btn"
                      onClick={() => handleAdminExtend('PDF_ANALYTICS', 30)}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-teal-500/40 text-teal-300 text-xs font-urdu font-bold transition-all text-center"
                    >
                      +30 دن PDF (Rs 150)
                    </button>
                    <button
                      id="admin-extend-combo-btn"
                      onClick={() => handleAdminExtend('COMBO', 30)}
                      className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs font-urdu transition-all text-center shadow-sm"
                    >
                      +30 دن کومبو بنڈل
                    </button>
                  </div>
                </div>

                {/* Trial Simulator Testing Controls */}
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400 font-urdu block mb-1.5">
                    ٹیسٹنگ کے لیے ٹرائل ڈے تبدیل کریں (Simulate Freemium Days):
                  </span>
                  <div className="flex gap-2">
                    <button
                      id="simulate-day-5-btn"
                      onClick={() => handleSimulate(5)}
                      className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-[11px] font-urdu"
                    >
                      ڈے 5 (مفت ٹرائل جاری)
                    </button>
                    <button
                      id="simulate-day-35-btn"
                      onClick={() => handleSimulate(35)}
                      className="flex-1 py-1.5 px-2 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/50 text-rose-300 rounded-lg text-[11px] font-urdu"
                    >
                      ڈے 35 (ٹرائل ختم / لاک)
                    </button>
                  </div>
                </div>

                {adminActionNotice && (
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-urdu text-center">
                    {adminActionNotice}
                  </div>
                )}
              </div>
            )}

            {adminError && (
              <p className="text-xs text-rose-400 font-urdu">
                غلط ایڈمن پن کوڈ! درست پن &apos;ADMIN123&apos; درج فرمائیں۔
              </p>
            )}
          </div>
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-200 flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-emerald-400" />
                <span>Groq API Key (Urdu Whisper Speech-to-Text)</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Whisper-v3</span>
            </div>
            <p className="text-xs text-slate-400 font-urdu">
              اگر آپ کے پاس Groq API Key ہے تو یہاں درج کریں تاکہ اردو آواز کی 100 فیصد درست شناخت ممکن ہو۔ خالی چھوڑنے پر براؤزر سپیچ ریکگنیشن استعمال ہوگی۔
            </p>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">ماڈل (Model):</span>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200"
              >
                <option value="whisper-large-v3-turbo">whisper-large-v3-turbo (تیز ترین)</option>
                <option value="whisper-large-v3">whisper-large-v3 (مکمل درست)</option>
              </select>
            </div>
          </div>

          {/* App Security & PIN / Passcode Settings with 'Remove Security / Remove Code' Toggle */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-200 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>ایپ سیکیورٹی اور پن کوڈ (App Security & Passcode)</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  securityEnabled
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : 'bg-slate-900 text-slate-400 border-slate-700'
                }`}
              >
                {securityEnabled ? 'PIN ACTIVE' : 'NO CODE / DIRECT OPEN'}
              </span>
            </div>

            {/* Remove Security / Remove Code Toggle Trigger */}
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-200 font-urdu">
                  {securityEnabled ? 'پن کوڈ سیکیورٹی فعال ہے' : 'سیکیورٹی ختم ہے (ایپ ڈائریکٹ کھلے گی)'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {securityEnabled
                    ? 'ایپ کھلنے پر ۴ ہندسوں کا پن کوڈ طلب کیا جاتا ہے۔'
                    : 'Passcode disabled. App opens directly without asking for a PIN.'}
                </div>
              </div>

              {/* 'Remove Security / Remove Code' Toggle Button */}
              <button
                type="button"
                id="toggle-security-btn"
                onClick={() => {
                  playClickSound();
                  setSecurityEnabled((prev) => !prev);
                  if (securityEnabled) {
                    setBiometric(false);
                  } else {
                    setBiometric(true);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-95 ${
                  securityEnabled
                    ? 'bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/80'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500'
                }`}
              >
                {securityEnabled ? 'Remove Security / Remove Code' : 'Enable Security / Set Code'}
              </button>
            </div>

            {securityEnabled ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-urdu">۴ ہندسوں کا پن کوڈ (4-Digit PIN):</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-center text-base font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <input
                      type="checkbox"
                      checked={biometric}
                      onChange={(e) => setBiometric(e.target.checked)}
                      className="accent-emerald-500 rounded w-4 h-4"
                    />
                    <span className="text-xs text-slate-300 font-urdu">فنگر پرنٹ آن رکھیں (Biometric)</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-[11px] text-emerald-300 font-urdu text-center">
                ✓ سیکیورٹی اور کوڈ ختم کر دیا گیا ہے۔ سیو کرنے کے بعد ایپ کھلتے وقت کوئی پن کوڈ نہیں مانگے گی۔
              </div>
            )}
          </div>

          {/* Shop Information */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <label className="block text-xs text-slate-300 font-urdu text-right">دکان کا نام (Shop Title):</label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-urdu text-right focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Debt Limit & Overdue Alert Configuration */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-200 flex items-center gap-1.5 font-urdu">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>قرض کی حد و الرٹ سیٹنگز (Debt Limit Settings)</span>
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                ALERT SYSTEM
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-urdu">
                  طے شدہ قرض کی حد (روپے):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={defaultDebtLimit}
                    onChange={(e) => setDefaultDebtLimit(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-urdu">
                    PKR
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-urdu block mt-1">
                  نئے کھاتوں کے لیے ڈیفالٹ حد
                </span>
              </div>

              <div className="flex flex-col justify-center">
                <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={enableDebtAlerts}
                    onChange={(e) => setEnableDebtAlerts(e.target.checked)}
                    className="accent-amber-500 rounded w-4 h-4"
                  />
                  <div>
                    <span className="text-xs text-slate-200 font-urdu block font-medium">
                      حد پار الرٹس فعال رکھیں
                    </span>
                    <span className="text-[10px] text-slate-400 font-urdu block">
                      حد سے زائد قرض پر فوری سرخ بینر دکھائیں
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Export & Import */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <span className="font-semibold text-xs text-slate-200 block">
              اینکرپٹڈ فائل ایکسپورٹ و بیک اپ (Data Backup & Restore):
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onExportEncrypted}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700 hover:border-emerald-500/50 flex flex-col items-center text-center gap-1.5 text-xs text-slate-200 transition-colors"
              >
                <Download className="w-5 h-5 text-emerald-400" />
                <span className="font-bold font-urdu text-emerald-300">محفوظ بیک اپ ڈاؤن لوڈ</span>
                <span className="text-[10px] text-slate-500">.db.enc (AES-256)</span>
              </button>

              <button
                onClick={onExportRawSQLite}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700 hover:border-emerald-500/50 flex flex-col items-center text-center gap-1.5 text-xs text-slate-200 transition-colors"
              >
                <FileCode className="w-5 h-5 text-teal-400" />
                <span className="font-bold font-urdu text-teal-300">SQLite فائل ایکسپورٹ</span>
                <span className="text-[10px] text-slate-500">.sqlite database</span>
              </button>
            </div>

            {/* Import Backup */}
            <div className="pt-2 border-t border-slate-800">
              <label className="block text-xs text-slate-400 mb-1.5 font-urdu">
                بیک اپ فائل اپلوڈ کریں (.db.enc):
              </label>
              <div className="flex gap-2">
                <label className="flex-1 cursor-pointer bg-slate-900 hover:bg-slate-800 border border-dashed border-slate-700 rounded-xl px-3 py-2 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>فائل منتخب کریں</span>
                  <input type="file" accept=".enc,.json,.txt" onChange={handleFileChange} className="hidden" />
                </label>
              </div>

              {selectedFileContent && (
                <div className="mt-2.5 flex gap-2">
                  <input
                    type="password"
                    maxLength={4}
                    value={importPin}
                    onChange={(e) => setImportPin(e.target.value)}
                    placeholder="بیک اپ کا پن کوڈ"
                    className="w-1/2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                  <button
                    onClick={handleExecuteImport}
                    className="w-1/2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs font-urdu"
                  >
                    بیک اپ بحال کریں
                  </button>
                </div>
              )}

              {importStatus && (
                <div className="mt-2 text-[11px] text-emerald-400 font-urdu flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{importStatus}</span>
                </div>
              )}
            </div>
          </div>

          {/* Google Drive API (OAuth 2.0) User-Side Backup */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-200 flex items-center gap-1.5 font-urdu">
                <Cloud className="w-4 h-4 text-sky-400" />
                <span>گوگل ڈرائیو کلاؤڈ بیک اپ (Google Drive OAuth 2.0)</span>
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                  isDriveConnected
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {isDriveConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>

            <p className="text-xs text-slate-400 font-urdu leading-relaxed">
              صارف کا اپنا ذاتی Google Drive اکاؤنٹ (OAuth 2.0)۔ آپ کا اینکرپٹڈ SQLCipher بیک اپ محفوظ طریقے سے آپ کی اپنی ڈرائیو میں رکھا جاتا ہے، بغیر کسی تھرڈ پارٹی سرور کے۔
            </p>

            {!isDriveConnected ? (
              <div className="space-y-2 pt-1">
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={gdriveTokenInput}
                    onChange={(e) => setGdriveTokenInput(e.target.value)}
                    placeholder="OAuth Access Token (ya Bearer token)..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                  <button
                    onClick={handleConnectDrive}
                    className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs font-urdu transition-colors"
                  >
                    منسلک کریں
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 font-urdu">
                  صارفین Google OAuth 2.0 کلائنٹ کے ذریعے بآسانی اپنے کلاؤڈ کھاتے کو براہ راست بیک اپ کر سکتے ہیں۔
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 pt-1">
                <div className="flex gap-2">
                  <button
                    onClick={handleDriveUpload}
                    disabled={isUploadingDrive}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white font-bold text-xs font-urdu flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingDrive ? 'اپلوڈ ہو رہا ہے...' : 'ڈرائیو پر بیک اپ بھیجیں'}</span>
                  </button>

                  <button
                    onClick={handleLoadDriveBackups}
                    className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-urdu transition-colors"
                  >
                    فائلیں دیکھیں
                  </button>

                  <button
                    onClick={handleDisconnectDrive}
                    className="py-2.5 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 text-xs font-urdu transition-colors"
                  >
                    منقطع کریں
                  </button>
                </div>

                {driveFiles.length > 0 && (
                  <div className="max-h-28 overflow-y-auto space-y-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-urdu block mb-1">گوگل ڈرائیو بیک اپ فائلیں:</span>
                    {driveFiles.map((f) => (
                      <div key={f.id} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-950/60">
                        <span className="text-slate-300 font-mono text-[11px] truncate max-w-[200px]">{f.name}</span>
                        <span className="text-[10px] text-slate-500">{new Date(f.createdTime).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {driveStatus && (
              <p className="text-xs text-sky-400 font-urdu">{driveStatus}</p>
            )}
          </div>

          {/* Ad Architecture Placeholders (Clean Isolation for Future Monetization) */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-300 flex items-center gap-1.5 font-urdu">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>اشتہارات آرکیٹیکچر (Ad Architecture Placeholders)</span>
              </span>
              <span className="text-[10px] bg-slate-800 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                0 ADS ACTIVE (DORMANT)
              </span>
            </div>
            <p className="text-xs text-slate-400 font-urdu leading-relaxed">
              ایپ میں بینر اشتہارات اور ریوارڈڈ ویڈیو اشتہارات کے لیے مکمل سروس آرکیٹیکچر (`adService.ts`) تیار ہے۔ فی الوقت کوئی اشتہار نہیں چلایا گیا تاکہ صارفین کا کام بلاتعطل جاری رہے۔
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-400 font-mono">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span>Google AdMob:</span>
                <span className="text-emerald-400 font-bold">Hook Ready</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span>Muslim Ad Network:</span>
                <span className="text-teal-400 font-bold">Hook Ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer save */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {savedSuccess ? 'سیٹنگز محفوظ ہو گئیں!' : ''}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-urdu hover:bg-slate-700"
            >
              بند کریں
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-urdu flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <span>محفوظ کریں (Save)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
