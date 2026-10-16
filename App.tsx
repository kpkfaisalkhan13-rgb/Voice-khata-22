import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Mic,
  Settings,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Wallet,
  Phone,
  FileText,
  BarChart3,
  CreditCard,
  AlertTriangle,
  ShieldAlert,
  ChevronDown,
  Smartphone,
  Sparkles,
  Edit2,
  Check,
  ArrowRight,
  Trash2,
  Clipboard,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Customer,
  Transaction,
  VoiceParseResult,
  TransactionType,
  AppSettings,
  CountryCode,
  FinancialTab,
  FinancialVoiceOutput,
} from './types';
import { dbService, DEFAULT_SETTINGS } from './services/db';
import { HighlightText } from './components/HighlightText';
import { BiometricLockModal } from './components/BiometricLockModal';
import { VoiceEntryModal } from './components/VoiceEntryModal';
import { CustomerDetailModal } from './components/CustomerDetailModal';
import { AddCustomerModal } from './components/AddCustomerModal';
import { BackupSettingsModal } from './components/BackupSettingsModal';
import { PaymentModal } from './components/PaymentModal';
import { PdfLedgerModal } from './components/PdfLedgerModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { LanguageSelector } from './components/LanguageSelector';
import { VoiceFab } from './components/VoiceFab';
import { BottomNavBar, AppTab } from './components/BottomNavBar';
import { VoiceCalcScreen } from './components/VoiceCalcScreen';
import { AnalyticsScreen } from './components/AnalyticsScreen';
import { DeleteKhataDialog } from './components/DeleteKhataDialog';
import { FinancialVoiceModal } from './components/FinancialVoiceModal';
import { WelcomeScreen } from './components/WelcomeScreen';
import { OnboardingModal } from './components/OnboardingModal';
import { FlutterCodeModal } from './components/FlutterCodeModal';
import { SmartPasteModal } from './components/SmartPasteModal';
import { CurrencySelector } from './components/CurrencySelector';
import { useLanguage } from './i18n/LanguageContext';
import { Language } from './i18n/translations';
import { isVoiceFeatureUnlocked, isPdfAnalyticsUnlocked, getTrialStatus } from './utils/subscription';
import { playClickSound, playSuccessSound, playErrorAlert } from './utils/audio';
import { connectivityService } from './services/connectivityService';

export default function App() {
  const { t, language, setLanguage, isUrdu, isHindi, currencySymbol, setCurrencySymbol, formatCurrency } = useLanguage();
  const [isDbReady, setIsDbReady] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Active Tab: Khata Ledger
  const [activeTab, setActiveTab] = useState<AppTab>('KHATA');

  // Modals & Screen states
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(
    () => !sessionStorage.getItem('welcome_seen')
  );
  const [isLocked, setIsLocked] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isFinancialVoiceModalOpen, setIsFinancialVoiceModalOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isFlutterModalOpen, setIsFlutterModalOpen] = useState(false);
  const [isSmartPasteModalOpen, setIsSmartPasteModalOpen] = useState(false);
  const [paymentLockedFeature, setPaymentLockedFeature] = useState<'VOICE' | 'PDF_ANALYTICS'>('VOICE');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Flutter Delete Khata Dialog States
  const [isDeleteKhataDialogOpen, setIsDeleteKhataDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Business Name Editing in Dropdown
  const [isEditingBusinessName, setIsEditingBusinessName] = useState(false);
  const [businessNameEditInput, setBusinessNameEditInput] = useState('');
  const [isBusinessDropdownOpen, setIsBusinessDropdownOpen] = useState(false);

  // Pre-fill state for Add Customer
  const [prefilledAddData, setPrefilledAddData] = useState<{
    name: string;
    nameUrdu: string;
    balance: number;
  }>({ name: '', nameUrdu: '', balance: 0 });

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'RECEIVE' | 'GIVE' | 'EXCEEDED'>('ALL');
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Network Connectivity State (Real-time online/offline detection & guardrails)
  const [isOnline, setIsOnline] = useState<boolean>(connectivityService.isConnected());
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(connectivityService.isSimulatingOffline());

  useEffect(() => {
    const unsubscribe = connectivityService.subscribe((online, sim) => {
      setIsOnline(online);
      setIsSimulatedOffline(sim);
    });
    return () => unsubscribe();
  }, []);

  // Initialize Local SQLite Database
  useEffect(() => {
    async function loadData() {
      await dbService.init();
      const currentSettings = dbService.getSettings();
      setSettings(currentSettings);
      setCustomers(dbService.getCustomers());
      setTransactions(dbService.getTransactions());
      setIsDbReady(true);
      setBusinessNameEditInput(currentSettings.businessName || currentSettings.shopName || 'My Ledger');

      if (currentSettings.biometricEnabled && currentSettings.pin) {
        setIsLocked(true);
      }
    }
    loadData();
  }, []);

  const refreshLocalState = () => {
    setCustomers(dbService.getCustomers());
    setTransactions(dbService.getTransactions());
    if (selectedCustomer) {
      const updated = dbService.getCustomerById(selectedCustomer.id);
      if (updated) setSelectedCustomer(updated);
    }
  };

  // Onboarding Complete Handler
  const handleOnboardingComplete = (data: {
    language: Language;
    country: CountryCode;
    currency: string;
    businessName: string;
  }) => {
    setLanguage(data.language);
    setCurrencySymbol(data.currency);
    const updated = dbService.saveSettings({
      ...settings,
      onboardingCompleted: true,
      country: data.country,
      currency: data.currency,
      businessName: data.businessName,
      shopName: data.businessName,
      biometricEnabled: false,
    });
    setSettings(updated);
    setBusinessNameEditInput(data.businessName);
    setBannerNotice(`✓ Welcome! ${data.businessName} is ready with ${data.currency} currency.`);
    setTimeout(() => setBannerNotice(null), 4000);
  };

  // Business Name update from header dropdown
  const handleSaveBusinessName = () => {
    if (!businessNameEditInput.trim()) return;
    const updated = dbService.saveSettings({
      ...settings,
      businessName: businessNameEditInput.trim(),
      shopName: businessNameEditInput.trim(),
    });
    setSettings(updated);
    setIsEditingBusinessName(false);
    setIsBusinessDropdownOpen(false);
    playSuccessSound();
  };

  // Voice Transaction Confirmation
  const handleConfirmVoiceTransaction = async (parsed: VoiceParseResult) => {
    if (!parsed.matchedCustomer) return;

    await dbService.addTransaction({
      customerId: parsed.matchedCustomer.id,
      customerName: parsed.matchedCustomer.name,
      customerNameUrdu: parsed.matchedCustomer.nameUrdu,
      amount: parsed.amount,
      type: parsed.type,
      note: parsed.notes || (parsed.type === 'DEBIT' ? 'قرض با آواز / डेबिट' : 'وصولی با آواز / क्रेडिट'),
      rawTranscript: parsed.rawText,
    });

    refreshLocalState();
    setBannerNotice(
      `✓ ${parsed.amount.toLocaleString()} ${parsed.matchedCustomer.nameUrdu || parsed.matchedCustomer.name} ke khate mein darj ho gaye.`
    );
    setTimeout(() => setBannerNotice(null), 4000);
  };

  const handleOpenAddCustomerFromVoice = (name: string, nameUrdu: string, initialBalance = 0) => {
    setPrefilledAddData({ name, nameUrdu, balance: initialBalance });
    setIsAddCustomerOpen(true);
  };

  const handleAddNewCustomer = async (
    name: string,
    nameUrdu: string,
    phone: string,
    address: string,
    initialBalance: number,
    debtLimit?: number
  ) => {
    const created = await dbService.addCustomer({
      name,
      nameUrdu,
      phone,
      address,
      balance: initialBalance,
      debtLimit: debtLimit ?? settings.defaultDebtLimit ?? 20000,
    });

    if (initialBalance !== 0) {
      await dbService.addTransaction({
        customerId: created.id,
        customerName: created.name,
        customerNameUrdu: created.nameUrdu,
        amount: Math.abs(initialBalance),
        type: initialBalance > 0 ? 'DEBIT' : 'CREDIT',
        note: 'ابتدائی بقایا اندراج / प्रारंभिक बैलेंस',
      });
    }

    refreshLocalState();
    setPrefilledAddData({ name: '', nameUrdu: '', balance: 0 });
    setBannerNotice(`✓ ${created.name} ka khata kamyabi se ban gaya.`);
    setTimeout(() => setBannerNotice(null), 4000);
  };

  const handleUpdateCustomer = async (id: string, updates: Partial<Customer>) => {
    await dbService.updateCustomer(id, updates);
    refreshLocalState();
  };

  // Flutter Delete Khata Dialog Option
  // void deleteKhataDialog(BuildContext context, String customerName)
  const openDeleteKhataDialog = (cust?: Customer | null) => {
    playClickSound();
    setCustomerToDelete(cust || selectedCustomer || (customers.length > 0 ? customers[0] : null));
    setIsDeleteKhataDialogOpen(true);
  };

  const handleConfirmDeleteKhata = async () => {
    const target = customerToDelete || selectedCustomer || (customers.length > 0 ? customers[0] : null);
    if (!target) {
      setIsDeleteKhataDialogOpen(false);
      return;
    }
    const targetName = target.nameUrdu || target.name;
    await dbService.deleteCustomer(target.id);
    refreshLocalState();
    if (selectedCustomer?.id === target.id) {
      setSelectedCustomer(null);
    }
    setIsDeleteKhataDialogOpen(false);
    setCustomerToDelete(null);
    playSuccessSound();
    setBannerNotice(`✓ ${targetName} کا کھاتہ اور تمام ریکارڈ کامیابی سے ڈیلیٹ کر دیا گیا۔`);
    setTimeout(() => setBannerNotice(null), 4000);
  };

  const handleManualAddTransaction = async (
    customerId: string,
    amount: number,
    type: TransactionType,
    note: string
  ) => {
    const customer = dbService.getCustomerById(customerId);
    if (!customer) return;

    await dbService.addTransaction({
      customerId,
      customerName: customer.name,
      customerNameUrdu: customer.nameUrdu,
      amount,
      type,
      note,
    });

    refreshLocalState();
  };

  // Voice Khata Assistant Handler (Customer Debt & Credit Ledger)
  const handleOpenFinancialVoiceAssistant = (targetCustomer?: Customer | null) => {
    // Network Connectivity Guardrail: Check network status first
    if (!isOnline) {
      playErrorAlert();
      setBannerNotice(
        isUrdu
          ? 'آواز کی سہولت کے لیے انٹرنیٹ درکار ہے۔ برائے مہربانی انٹرنیٹ سے جڑیں یا دستی اندراج استعمال کریں۔'
          : 'Voice features require an internet connection. Please connect to the internet or use manual entry.'
      );
      setTimeout(() => setBannerNotice(null), 5000);
      return;
    }

    playClickSound();
    if (targetCustomer) {
      setSelectedCustomer(targetCustomer);
    }
    setIsFinancialVoiceModalOpen(true);
  };

  const handleConfirmFinancialKhataTransaction = async (parsed: FinancialVoiceOutput) => {
    let matchedCustomer: Customer | undefined;

    // Prioritize explicit customer ID assigned during pre-recording customer selection
    if (parsed.customerId) {
      matchedCustomer = customers.find((c) => c.id === parsed.customerId);
    }
    if (!matchedCustomer && parsed.customer_id) {
      matchedCustomer = customers.find((c) => c.id === parsed.customer_id);
    }

    if (!matchedCustomer) {
      matchedCustomer = customers.find(
        (c) =>
          (parsed.customerName && c.name.toLowerCase() === parsed.customerName.toLowerCase()) ||
          (parsed.customerUrdu && c.nameUrdu === parsed.customerUrdu) ||
          (parsed.person_name && c.name.toLowerCase() === parsed.person_name.toLowerCase()) ||
          (parsed.person_name && c.nameUrdu === parsed.person_name)
      );
    }

    // If customer doesn't exist yet, create one
    if (!matchedCustomer && (parsed.customerName || parsed.customerUrdu || parsed.person_name)) {
      matchedCustomer = await dbService.addCustomer({
        name: parsed.customerName || parsed.person_name || 'New Account',
        nameUrdu: parsed.customerUrdu || parsed.person_name || 'نیا کھاتہ',
        phone: '',
        address: '',
        balance: 0,
        debtLimit: settings.defaultDebtLimit ?? 20000,
      });
    }

    const targetCustomer = matchedCustomer || customers[0];
    if (targetCustomer) {
      // CREDIT (وصول ہوا / پیسے ملے / کٹوتی): SUBTRACT (-) from Customer Debt
      // Formula: Remaining Debt = Current Balance - Parsed Amount
      // DEBIT (دیے / ادھار / قرض): ADD (+) to Customer Debt
      // Formula: New Debt = Current Balance + Parsed Amount
      const isCredit = parsed.entry_type === 'Credit' || parsed.transaction_type === 'Credit';
      const txType: TransactionType = isCredit ? 'CREDIT' : 'DEBIT';
      await dbService.addTransaction({
        customerId: targetCustomer.id,
        customerName: targetCustomer.name,
        customerNameUrdu: targetCustomer.nameUrdu,
        amount: parsed.amount,
        type: txType,
        note: parsed.description,
      });
      refreshLocalState();
      setBannerNotice(
        `✓ ${parsed.amount.toLocaleString()} ${targetCustomer.nameUrdu || targetCustomer.name} ke khate se ${isCredit ? 'تفریق / کٹوتی (SUBTRACT)' : 'شامل (ADD)'} ho gaye.`
      );
      setTimeout(() => setBannerNotice(null), 4000);
    }
  };

  // Payment Proof Submission (Instant 24-Hour Access)
  const handleSubmitPaymentProof = (screenshotBase64: string, txzId: string, method: string) => {
    const tempExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    dbService.updateSubscription({
      lastTxzIdSubmitted: txzId,
      lastPaymentMethod: method,
      paymentScreenshotUrl: screenshotBase64,
      tempAccessUntil: tempExpiry,
      paymentPendingPlan: 'COMBO',
      paymentSubmittedAt: new Date().toISOString(),
    });
    setSettings(dbService.getSettings());
    setBannerNotice('🎉 24-Hour Instant Temporary Access Granted! Admin verification in progress.');
    setTimeout(() => setBannerNotice(null), 6000);
  };

  // Export & Import Handlers
  const handleExportEncrypted = async () => {
    const jsonStr = await dbService.exportEncryptedBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice_udhaar_backup_${new Date().toISOString().slice(0, 10)}.db.enc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportRawSQLite = () => {
    const rawBytes = dbService.exportRawSQLite();
    if (!rawBytes) return;
    const blob = new Blob([rawBytes as unknown as BlobPart], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice_udhaar_${new Date().toISOString().slice(0, 10)}.sqlite`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportEncrypted = async (fileContent: string, pin: string) => {
    const success = await dbService.importEncryptedBackup(fileContent, pin);
    if (success) {
      refreshLocalState();
    }
    return success;
  };

  const handleOpenVoiceWithCheck = () => {
    // Network Connectivity Guardrail: Check network status first
    if (!isOnline) {
      playErrorAlert();
      setBannerNotice(
        isUrdu
          ? 'آواز کی سہولت کے لیے انٹرنیٹ درکار ہے۔ برائے مہربانی انٹرنیٹ سے جڑیں یا دستی اندراج استعمال کریں۔'
          : 'Voice features require an internet connection. Please connect to the internet or use manual entry.'
      );
      setTimeout(() => setBannerNotice(null), 5000);
      return;
    }
    playClickSound();
    setIsVoiceModalOpen(true);
  };

  const handleOpenPdfWithCheck = (cust?: Customer) => {
    playClickSound();
    setIsPdfModalOpen(true);
  };

  const handleRecordTxzSubmission = (
    txzId: string,
    plan: 'VOICE' | 'PDF_ANALYTICS' | 'COMBO',
    method: string
  ) => {
    const tempExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    dbService.updateSubscription({
      lastTxzIdSubmitted: txzId,
      paymentPendingPlan: plan,
      lastPaymentMethod: method,
      tempAccessUntil: tempExpiry,
      paymentSubmittedAt: new Date().toISOString(),
    });
    setSettings(dbService.getSettings());
    setBannerNotice(`✓ Transaction ID (${txzId}) recorded. 24-hour instant access unlocked!`);
  };

  const handleExtendSubscription = (plan: 'VOICE' | 'PDF_ANALYTICS' | 'COMBO', days: number) => {
    dbService.extendSubscription(plan, days);
    setSettings(dbService.getSettings());
    setBannerNotice(`✓ Plan "${plan}" extended for ${days} days!`);
  };

  const handleSimulateTrialDay = (day: number) => {
    dbService.simulateTrialDay(day);
    setSettings(dbService.getSettings());
  };

  const trial = useMemo(() => getTrialStatus(settings.subscription), [settings.subscription]);

  // Calculations for Summary
  const { totalToReceive, totalToGive } = useMemo(() => {
    let receive = 0;
    let give = 0;
    customers.forEach((c) => {
      if (c.balance > 0) receive += c.balance;
      else if (c.balance < 0) give += Math.abs(c.balance);
    });
    return { totalToReceive: receive, totalToGive: give };
  }, [customers]);

  const exceededCustomers = useMemo(() => {
    if (settings.enableDebtAlerts === false) return [];
    return customers.filter(
      (c) => c.balance > (c.debtLimit ?? settings.defaultDebtLimit ?? 20000)
    );
  }, [customers, settings.defaultDebtLimit, settings.enableDebtAlerts]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return customers.filter((c) => {
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.nameUrdu.includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (filterTab === 'RECEIVE') return c.balance > 0;
      if (filterTab === 'GIVE') return c.balance < 0;
      if (filterTab === 'EXCEEDED') {
        return c.balance > (c.debtLimit ?? settings.defaultDebtLimit ?? 20000);
      }
      return true;
    });
  }, [customers, searchQuery, filterTab, settings.defaultDebtLimit]);

  const currentBusinessName = settings.businessName || settings.shopName || 'My Ledger';

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 flex flex-col font-sans selection:bg-emerald-500 selection:text-white pb-20">
      {/* 0. Welcome Screen Layout (Matching Flutter Specification) */}
      <AnimatePresence>
        {showWelcomeScreen && (
          <WelcomeScreen
            onOpenApp={() => {
              sessionStorage.setItem('welcome_seen', 'true');
              setShowWelcomeScreen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* 1. First-Launch Onboarding Modal */}
      <OnboardingModal
        isOpen={isDbReady && !settings.onboardingCompleted}
        onComplete={handleOnboardingComplete}
      />

      {/* 2. Flutter Code Inspection Modal */}
      <FlutterCodeModal
        isOpen={isFlutterModalOpen}
        onClose={() => setIsFlutterModalOpen(false)}
      />

      {/* PIN Lock Screen (Optional, only if user explicitly configured PIN) */}
      <AnimatePresence>
        {isLocked && settings.pin && (
          <BiometricLockModal
            correctPin={settings.pin}
            shopName={currentBusinessName}
            onUnlock={() => setIsLocked(false)}
          />
        )}
      </AnimatePresence>

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs px-4 py-2.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Business Name Dropdown / Header */}
          <div className="relative">
            <button
              id="header-business-dropdown-btn"
              type="button"
              onClick={() => {
                playClickSound();
                setIsBusinessDropdownOpen(!isBusinessDropdownOpen);
              }}
              className="flex items-center gap-2.5 text-left p-1.5 -m-1.5 rounded-2xl hover:bg-slate-100/70 transition-colors group"
            >
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/25">
                <Wallet className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                    {currentBusinessName}
                  </h1>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform" />
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span>{t.appName}</span>
                </div>
              </div>
            </button>

            {/* Business Dropdown Menu */}
            {isBusinessDropdownOpen && (
              <div className="absolute left-0 mt-2 w-72 rounded-3xl bg-white border border-slate-200 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {t.businessNameLabel}
                  </span>
                  <button
                    onClick={() => setIsBusinessDropdownOpen(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                </div>

                {isEditingBusinessName ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={businessNameEditInput}
                      onChange={(e) => setBusinessNameEditInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsEditingBusinessName(false)}
                        className="px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveBusinessName}
                        className="px-3 py-1 text-[11px] bg-emerald-600 text-white font-bold rounded-lg flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{currentBusinessName}</div>
                      <div className="text-[10px] text-slate-500">
                        Country: {settings.country || 'PK'} • {trial.isTrialActive ? 'Free Trial' : 'Active'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingBusinessName(true)}
                      className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl"
                      title="Edit Business Name"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Action Icons: Connectivity Status, Language, Currency, Delete Khata, Voice, Settings */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Network Connectivity Indicator & Simulation Toggle */}
            <button
              id="header-connectivity-status-btn"
              type="button"
              onClick={() => {
                const nowOnline = connectivityService.toggleSimulateOffline();
                playClickSound();
                setBannerNotice(
                  nowOnline
                    ? '🟢 Online Mode Active (Wi-Fi / Mobile Data Connected)'
                    : '🟠 Offline Manual Mode Active (Voice & Cloud Sync disabled)'
                );
                setTimeout(() => setBannerNotice(null), 3000);
              }}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full font-medium transition-all border cursor-pointer ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 shadow-2xs'
                  : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 shadow-2xs ring-1 ring-amber-400/50'
              }`}
              title={
                isOnline
                  ? 'Connected to Internet (Wi-Fi/Data) — Tap to simulate Offline Mode'
                  : 'Offline Manual Mode — Tap to restore Online Mode'
              }
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-bold hidden sm:inline">Online</span>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600 sm:hidden" />
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-600" />
                  <span className="text-[11px] font-bold">Offline</span>
                  <WifiOff className="w-3.5 h-3.5 text-amber-700" />
                </>
              )}
            </button>

            <LanguageSelector />
            <CurrencySelector />

            {/* Flutter AppBar Delete Khata Action: IconButton(icon: Icon(Icons.delete_forever, color: Colors.red), onPressed: () => deleteKhataDialog(context, "منتخب کھاتہ")) */}
            <button
              id="header-delete-khata-btn"
              type="button"
              onClick={() => openDeleteKhataDialog()}
              className="p-2 rounded-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all shadow-2xs cursor-pointer active:scale-95"
              title="کھاتہ ڈیلیٹ کریں (Delete Khata)"
            >
              <Trash2 className="w-4 h-4 text-red-600 stroke-[2.2]" />
            </button>

            {/* Advanced Financial Voice Assistant */}
            <button
              id="header-financial-voice-btn"
              type="button"
              onClick={() => handleOpenFinancialVoiceAssistant()}
              className={`p-1.5 sm:px-2.5 sm:py-2 rounded-full border shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                isOnline
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-emerald-600/20'
                  : 'bg-slate-400 hover:bg-slate-500 text-slate-100 border-slate-400 opacity-90'
              }`}
              title={
                isOnline
                  ? 'Voice Khata & Financial Assistant'
                  : 'Voice features require an internet connection. Please connect to the internet or use manual entry.'
              }
            >
              {isOnline ? (
                <Mic className="w-4 h-4 animate-pulse text-emerald-100" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-slate-200" />
              )}
              <span className="text-[10px] font-black hidden sm:inline">Voice Khata</span>
            </button>

            {/* Welcome Screen Launcher */}
            <button
              id="header-welcome-screen-btn"
              type="button"
              onClick={() => {
                playClickSound();
                setShowWelcomeScreen(true);
              }}
              className="p-1.5 sm:px-2.5 sm:py-2 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
              title="View Welcome Screen Layout"
            >
              <span className="text-[10px] font-bold">Welcome</span>
            </button>

            {/* Smart Paste (ChatGPT / Gemini) */}
            <button
              id="header-smart-paste-btn"
              type="button"
              onClick={() => {
                playClickSound();
                setIsSmartPasteModalOpen(true);
              }}
              className="p-1.5 sm:px-2.5 sm:py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
              title="Smart Voice & Paste Entry (ChatGPT/Gemini)"
            >
              <Clipboard className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[10px] font-bold hidden sm:inline">Smart Paste</span>
            </button>

            {/* Flutter Code Modal Launcher */}
            <button
              id="header-flutter-code-btn"
              type="button"
              onClick={() => {
                playClickSound();
                setIsFlutterModalOpen(true);
              }}
              className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-2xs transition-colors flex items-center gap-1"
              title="Inspect Flutter Mobile Source Code"
            >
              <Smartphone className="w-4 h-4" />
              <span className="text-[10px] font-extrabold hidden sm:inline">Flutter Code</span>
            </button>

            {/* Settings */}
            <button
              id="app-settings-btn"
              type="button"
              onClick={() => {
                playClickSound();
                setIsSettingsOpen(true);
              }}
              className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors"
              title={t.settings}
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Subtle Offline Manual Mode Status Banner (Requirement 4) */}
      {!isOnline && (
        <div className="bg-slate-900 border-b border-amber-500/30 text-amber-200 px-4 py-2 text-xs flex items-center justify-between shadow-xs sticky top-[57px] z-20">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-black text-amber-300">
                {isUrdu ? 'آف لائن مینوئل موڈ (Offline Manual Mode)' : 'Offline Manual Mode'}
              </span>
              <span className="text-slate-300 ml-1.5 hidden sm:inline">
                {isUrdu
                  ? '— دستی کھاتہ، لوکل ریکارڈ اور پی ڈی ایف محفوظ ہو رہے ہیں (وائس و کلاؤڈ کے لیے انٹرنیٹ ضروری ہے)'
                  : '— Voice & Cloud Sync disabled. Manual khata entry, SQLite storage, and ledger viewing work uninterrupted.'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              connectivityService.toggleSimulateOffline();
              playClickSound();
            }}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors shrink-0 cursor-pointer"
          >
            {isSimulatedOffline ? 'Switch Online' : 'Reconnect'}
          </button>
        </div>
      )}

      {/* Main Tab Render: Khata, Voice Calc, or Analytics */}
      <main className="flex-1 w-full max-w-4xl mx-auto">
        {/* Banner Notice Alert */}
        <AnimatePresence>
          {bannerNotice && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="m-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold text-center shadow-xs"
            >
              {bannerNotice}
            </motion.div>
          )}
        </AnimatePresence>

        {/* TAB 1: KHATA (Main Ledger Screen) */}
        {activeTab === 'KHATA' && (
          <div className="px-4 pt-3 space-y-4">
            {/* Total Balance (Outstanding Debt [RED] vs Credit & Advance [GREEN]) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Outstanding Debt (قرض باقی / واجب الادا - RED) */}
              <div className="p-4 rounded-3xl bg-rose-50/90 border border-rose-200/90 relative overflow-hidden shadow-xs hover:border-rose-300 transition-all">
                <div className="flex items-center justify-between text-xs text-rose-900 mb-1 font-bold">
                  <span>کل بقایا قرض (Outstanding Debt)</span>
                  <span className="w-7 h-7 rounded-full bg-rose-200/60 flex items-center justify-center text-rose-800">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl sm:text-3xl font-black text-rose-700 tracking-tight font-mono">
                    {totalToReceive.toLocaleString()}
                  </span>
                  <span className="text-xs text-rose-700 font-bold">{t.currencyUnit}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-rose-700 font-urdu">
                  <span className="px-2 py-0.5 rounded-full bg-rose-200/50 text-[10px] font-bold">
                    قرض دیا
                  </span>
                  <span>گاہکوں کے ذمے کل رقم (Debit)</span>
                </div>
              </div>

              {/* Credit & Advance Payments (وصولی و پیشگی رقم - GREEN) */}
              <div className="p-4 rounded-3xl bg-emerald-50/90 border border-emerald-200/90 relative overflow-hidden shadow-xs hover:border-emerald-300 transition-all">
                <div className="flex items-center justify-between text-xs text-emerald-900 mb-1 font-bold">
                  <span>وصولی و ایڈوانس (Credit / Advance)</span>
                  <span className="w-7 h-7 rounded-full bg-emerald-200/60 flex items-center justify-center text-emerald-800">
                    <ArrowDownLeft className="w-4 h-4" />
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight font-mono">
                    {totalToGive.toLocaleString()}
                  </span>
                  <span className="text-xs text-emerald-700 font-bold">{t.currencyUnit}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-700 font-urdu">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200/50 text-[10px] font-bold">
                    وصولی
                  </span>
                  <span>پیشگی رقم / کٹوتی (Credit)</span>
                </div>
              </div>
            </div>

            {/* Quick Action Bar with Search & "+ Add Customer" */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="customer-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-xs"
                />
              </div>

              {/* Prominent "+ Add Customer" Button */}
              <button
                id="add-customer-btn-prominent"
                type="button"
                onClick={() => {
                  playClickSound();
                  setPrefilledAddData({ name: '', nameUrdu: '', balance: 0 });
                  setIsAddCustomerOpen(true);
                }}
                className="px-3 sm:px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{t.addCustomer}</span>
              </button>

              {/* Prominent Smart Paste (ChatGPT / Gemini) Button */}
              <button
                id="smart-paste-btn-prominent"
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsSmartPasteModalOpen(true);
                }}
                className="px-3 sm:px-3.5 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 active:scale-95 text-white text-xs font-bold shadow-md shadow-teal-700/20 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                title="Paste batch list from ChatGPT / Gemini"
              >
                <Clipboard className="w-4 h-4 text-emerald-300 stroke-[2.5]" />
                <span className="hidden sm:inline">Smart Paste</span>
                <span className="sm:hidden font-urdu">پیسٹ</span>
              </button>
            </div>

            {/* Quick Action Banners: Voice Khata & Smart Paste Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Card 1: Advanced Voice Khata Assistant Quick Banner */}
              <div
                onClick={() => handleOpenFinancialVoiceAssistant(selectedCustomer)}
                className="p-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900 text-white border border-emerald-500 rounded-2xl flex items-center justify-between hover:shadow-md transition-all cursor-pointer shadow-xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-white/20 text-white flex items-center justify-center shadow-xs">
                    <Mic className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>Voice Khata (وائس کھاتہ)</span>
                      <span className="text-[9px] bg-emerald-400 text-slate-950 px-1.5 py-0.2 rounded-full font-black">
                        Pre-Select
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-100 line-clamp-1">
                      Speak Credit (وصولی), Debit (ادھار)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-white group-hover:translate-x-0.5 transition-transform">
                  <span className="hidden sm:inline">Speak</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Card 2: Smart Voice & Paste Entry (ChatGPT / Gemini) */}
              <div
                id="banner-smart-paste-launcher"
                onClick={() => {
                  playClickSound();
                  setIsSmartPasteModalOpen(true);
                }}
                className="p-3 bg-gradient-to-r from-teal-700 via-slate-800 to-slate-900 text-white border border-teal-500/50 rounded-2xl flex items-center justify-between hover:shadow-md transition-all cursor-pointer shadow-xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-white/20 text-white flex items-center justify-center shadow-xs">
                    <Clipboard className="w-5 h-5 text-emerald-300" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>Smart Voice & Paste</span>
                      <span className="text-[9px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full font-black">
                        ChatGPT / Gemini
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-100 line-clamp-1">
                      Paste lists with Red &amp; Green Khata cards
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-white group-hover:translate-x-0.5 transition-transform">
                  <span className="hidden sm:inline">Paste</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
              <button
                onClick={() => setFilterTab('ALL')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterTab === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {t.filterAll} ({customers.length})
              </button>
              <button
                onClick={() => setFilterTab('RECEIVE')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterTab === 'RECEIVE'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-slate-200'
                }`}
              >
                {t.filterReceive}
              </button>
              <button
                onClick={() => setFilterTab('GIVE')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterTab === 'GIVE'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'bg-white text-rose-700 hover:bg-rose-50 border border-slate-200'
                }`}
              >
                {t.filterGive}
              </button>
              {exceededCustomers.length > 0 && (
                <button
                  onClick={() => setFilterTab('EXCEEDED')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
                    filterTab === 'EXCEEDED'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Alerts ({exceededCustomers.length})</span>
                </button>
              )}
            </div>

            {/* Customer List Displaying Individual Ledger Accounts */}
            <div className="space-y-2">
              {filteredCustomers.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-2">
                  <Users className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700">{t.noCustomersFound}</h4>
                  <p className="text-xs text-slate-400">{t.noCustomersSubtext}</p>
                </div>
              ) : (
                filteredCustomers.map((customer) => {
                  const isExceeded =
                    customer.balance > (customer.debtLimit ?? settings.defaultDebtLimit ?? 20000);
                  const isOwedToMerchant = customer.balance > 0;
                  const isMerchantOwes = customer.balance < 0;

                  return (
                    <div
                      key={customer.id}
                      onClick={() => {
                        playClickSound();
                        setSelectedCustomer(customer);
                      }}
                      className={`p-4 rounded-2xl bg-white border transition-all cursor-pointer hover:shadow-md flex items-center justify-between ${
                        isExceeded
                          ? 'border-rose-300 bg-rose-50/20'
                          : 'border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-xs ${
                            isOwedToMerchant
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {customer.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">
                              <HighlightText text={customer.name} query={searchQuery} />
                            </h3>
                            {customer.nameUrdu && (
                              <span className="text-xs text-slate-500 font-urdu">
                                ({customer.nameUrdu})
                              </span>
                            )}
                            {isExceeded && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                                {t.exceededLimitBadge}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            {customer.phone && (
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="w-3 h-3" />
                                {customer.phone}
                              </span>
                            )}
                            {customer.address && <span>• {customer.address}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Balance & Actions */}
                      <div className="flex items-center gap-2">
                        {/* Balance & Term Indicator */}
                        <div className="text-right">
                          <div
                            className={`text-base font-black font-mono tracking-tight ${
                              customer.balance > 0
                                ? 'text-rose-600'
                                : customer.balance < 0
                                ? 'text-emerald-600'
                                : 'text-emerald-600 font-bold'
                            }`}
                          >
                            {customer.balance === 0
                              ? '0'
                              : `${Math.abs(customer.balance).toLocaleString()} ${t.currencyUnit}`}
                          </div>
                          <span
                            className={`text-[10px] font-bold block ${
                              customer.balance > 0
                                ? 'text-rose-600'
                                : 'text-emerald-700'
                            }`}
                          >
                            {customer.balance > 0
                              ? 'قرض باقی (Debt)'
                              : customer.balance < 0
                              ? 'پیشگی وصولی (Credit / Advance)'
                              : 'حساب صاف (Cleared)'}
                          </span>
                        </div>

                        {/* Flutter Delete Khata Button on Customer row */}
                        <button
                          id={`customer-delete-btn-${customer.id}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteKhataDialog(customer);
                          }}
                          className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="کھاتہ ڈیلیٹ کریں (Delete Khata)"
                        >
                          <Trash2 className="w-4 h-4 stroke-[2.2]" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ANALYTICS & REPORTS SCREEN WITH MONTHLY LOANS & ADVANCE GRAPH */}
        {activeTab === 'ANALYTICS' && (
          <AnalyticsScreen
            customers={customers}
            transactions={transactions}
            country={settings.country || 'PK'}
            subscription={settings.subscription}
            shopName={currentBusinessName}
            onOpenPdfModal={() => setIsPdfModalOpen(true)}
            onSubmitPaymentProof={handleSubmitPaymentProof}
          />
        )}
      </main>

      {/* Permanent Bottom Navigation Bar (Khata, Analytics, PDF, Settings) */}
      <BottomNavBar
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'PDF') {
            setIsPdfModalOpen(true);
          } else if (tab === 'SETTINGS') {
            setIsSettingsOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
      />

      {/* Golden Mic Floating Action Button */}
      <VoiceFab
        onClick={() => handleOpenFinancialVoiceAssistant(selectedCustomer)}
        isOnline={isOnline}
      />

      {/* Flutter Delete Khata Dialog Option */}
      <DeleteKhataDialog
        isOpen={isDeleteKhataDialogOpen}
        customerName={
          customerToDelete
            ? (customerToDelete.nameUrdu || customerToDelete.name)
            : selectedCustomer
            ? (selectedCustomer.nameUrdu || selectedCustomer.name)
            : 'منتخب کھاتہ'
        }
        onClose={() => {
          setIsDeleteKhataDialogOpen(false);
          setCustomerToDelete(null);
        }}
        onConfirmDelete={handleConfirmDeleteKhata}
      />

      {/* Voice Entry Modal (Multilingual Speech to Text Ledger Parsing) */}
      <VoiceEntryModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        customers={customers}
        onConfirmTransaction={handleConfirmVoiceTransaction}
        onCreateNewCustomer={handleOpenAddCustomerFromVoice}
        onSelectCustomer={(c) => {
          setIsVoiceModalOpen(false);
          setSelectedCustomer(c);
        }}
        groqApiKey={settings.groqApiKey}
        whisperModel={settings.whisperModel}
      />

      {/* Customer Detail & Individual Account Ledger Modal */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          transactions={transactions}
          onClose={() => setSelectedCustomer(null)}
          onAddTransaction={handleManualAddTransaction}
          onUpdateCustomer={handleUpdateCustomer}
          onExportPdf={() => handleOpenPdfWithCheck(selectedCustomer)}
          onDeleteCustomer={openDeleteKhataDialog}
        />
      )}

      {/* Add New Customer Modal */}
      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onAdd={handleAddNewCustomer}
        prefilledName={prefilledAddData.name}
        prefilledUrduName={prefilledAddData.nameUrdu}
        prefilledBalance={prefilledAddData.balance}
        defaultDebtLimit={settings.defaultDebtLimit ?? 20000}
      />

      {/* Settings & Backup Modal */}
      <BackupSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => {
          const updated = dbService.saveSettings(newSettings);
          setSettings(updated);
          if (!updated.biometricEnabled || !updated.pin) {
            setIsLocked(false);
          }
        }}
        onExportEncrypted={handleExportEncrypted}
        onExportRawSQLite={handleExportRawSQLite}
        onImportEncrypted={handleImportEncrypted}
        onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
        onExtendSubscription={handleExtendSubscription}
        onSimulateTrialDay={handleSimulateTrialDay}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        shopName={currentBusinessName}
        subscription={settings.subscription}
        lockedFeature={paymentLockedFeature}
        onRecordTxzSubmission={handleRecordTxzSubmission}
      />

      {/* PDF Ledger Export Modal */}
      <PdfLedgerModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        allCustomers={customers}
        allTransactions={transactions}
        shopName={currentBusinessName}
        customer={selectedCustomer || undefined}
      />

      {/* Analytics Modal */}
      <AnalyticsModal
        isOpen={isAnalyticsModalOpen}
        onClose={() => setIsAnalyticsModalOpen(false)}
        customers={customers}
        transactions={transactions}
        shopName={currentBusinessName}
      />

      {/* Voice Khata Assistant Modal (Customer Debt & Credit Ledger with Dynamic Learning) */}
      <FinancialVoiceModal
        isOpen={isFinancialVoiceModalOpen}
        onClose={() => setIsFinancialVoiceModalOpen(false)}
        customers={customers}
        selectedCustomer={selectedCustomer}
        onConfirmKhataTransaction={handleConfirmFinancialKhataTransaction}
        currencyUnit={t.currencyUnit}
      />

      {/* Smart Voice & Paste Entry Modal (ChatGPT / Gemini with Not-Found Red Cards & Self-Learning) */}
      <SmartPasteModal
        isOpen={isSmartPasteModalOpen}
        onClose={() => setIsSmartPasteModalOpen(false)}
        customers={customers}
        onBatchSaved={() => {
          refreshLocalState();
          setBannerNotice('✓ اسمارٹ پیسٹ لسٹ کے تمام اندراج کامیابی سے کھاتوں میں محفوظ ہو گئے۔');
          setTimeout(() => setBannerNotice(null), 5000);
        }}
        currencyUnit={t.currencyUnit}
      />
    </div>
  );
}
