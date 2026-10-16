import React from 'react';
import { BookOpen, BarChart3, FileText, Settings as SettingsIcon } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { playClickSound } from '../utils/audio';

export type AppTab = 'KHATA' | 'ANALYTICS' | 'PDF' | 'SETTINGS';

interface BottomNavBarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onMicClick?: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const { isUrdu } = useLanguage();

  const handleSelectTab = (tab: AppTab) => {
    playClickSound();
    onTabChange(tab);
  };

  return (
    <nav
      id="bottom-navigation-bar"
      aria-label="Khata Navigation"
      className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
    >
      <div className="max-w-md sm:max-w-lg mx-auto px-3 h-16 flex items-center justify-between relative">
        {/* Tab 1: Khata Ledger (کھاتہ اور سپلائی) */}
        <button
          id="nav-tab-khata"
          type="button"
          onClick={() => handleSelectTab('KHATA')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-all group ${
            activeTab === 'KHATA' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-transform ${
              activeTab === 'KHATA' ? 'bg-emerald-50 scale-110' : 'group-hover:scale-105'
            }`}
          >
            <BookOpen className={`w-5 h-5 ${activeTab === 'KHATA' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          </div>
          <span
            className={`text-[10px] sm:text-[11px] mt-0.5 tracking-tight font-urdu ${
              activeTab === 'KHATA' ? 'font-bold text-emerald-800' : 'font-medium'
            }`}
          >
            {isUrdu ? 'کھاتہ لیجر' : 'Khata Ledger'}
          </span>
        </button>

        {/* Tab 2: Analytics & Reports (تجزیہ) */}
        <button
          id="nav-tab-analytics"
          type="button"
          onClick={() => handleSelectTab('ANALYTICS')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-all group ${
            activeTab === 'ANALYTICS' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-transform ${
              activeTab === 'ANALYTICS' ? 'bg-emerald-50 scale-110' : 'group-hover:scale-105'
            }`}
          >
            <BarChart3 className={`w-5 h-5 ${activeTab === 'ANALYTICS' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          </div>
          <span
            className={`text-[10px] sm:text-[11px] mt-0.5 tracking-tight font-urdu ${
              activeTab === 'ANALYTICS' ? 'font-bold text-emerald-800' : 'font-medium'
            }`}
          >
            {isUrdu ? 'تجزیہ و رپورٹس' : 'Analytics'}
          </span>
        </button>

        {/* Center Gap for Golden Mic Floating Button */}
        <div className="w-16 shrink-0 flex items-center justify-center pointer-events-none" />

        {/* Tab 3: PDF Statements (پی ڈی ایف) */}
        <button
          id="nav-tab-pdf"
          type="button"
          onClick={() => handleSelectTab('PDF')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-all group ${
            activeTab === 'PDF' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-transform ${
              activeTab === 'PDF' ? 'bg-emerald-50 scale-110' : 'group-hover:scale-105'
            }`}
          >
            <FileText className={`w-5 h-5 ${activeTab === 'PDF' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          </div>
          <span
            className={`text-[10px] sm:text-[11px] mt-0.5 tracking-tight font-urdu ${
              activeTab === 'PDF' ? 'font-bold text-emerald-800' : 'font-medium'
            }`}
          >
            {isUrdu ? 'پی ڈی ایف' : 'PDF Ledger'}
          </span>
        </button>

        {/* Tab 4: Settings (ترتیبات) */}
        <button
          id="nav-tab-settings"
          type="button"
          onClick={() => handleSelectTab('SETTINGS')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-all group ${
            activeTab === 'SETTINGS' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-transform ${
              activeTab === 'SETTINGS' ? 'bg-emerald-50 scale-110' : 'group-hover:scale-105'
            }`}
          >
            <SettingsIcon className={`w-5 h-5 ${activeTab === 'SETTINGS' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          </div>
          <span
            className={`text-[10px] sm:text-[11px] mt-0.5 tracking-tight font-urdu ${
              activeTab === 'SETTINGS' ? 'font-bold text-emerald-800' : 'font-medium'
            }`}
          >
            {isUrdu ? 'ترتیبات' : 'Settings'}
          </span>
        </button>
      </div>
    </nav>
  );
};
