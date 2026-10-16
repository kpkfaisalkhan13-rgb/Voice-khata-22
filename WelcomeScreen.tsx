import React from 'react';
import { motion } from 'motion/react';
import { playClickSound, playSuccessSound } from '../utils/audio';

interface WelcomeScreenProps {
  onOpenApp: () => void;
}

/**
 * WelcomeScreen matching exact Flutter specification:
 * class WelcomeScreen extends StatelessWidget {
 *   Scaffold(
 *     backgroundColor: Colors.white,
 *     body: Center(
 *       child: Column(
 *         Text("Welcome", style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
 *         SizedBox(height: 40),
 *         ElevatedButton(
 *           style: ElevatedButton.styleFrom(
 *             backgroundColor: Colors.amber[700], // Golden Color
 *             padding: EdgeInsets.symmetric(horizontal: 40, vertical: 15),
 *             shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
 *           ),
 *           child: Text("Open the App", style: TextStyle(fontSize: 18, color: Colors.white)),
 *         )
 *       )
 *     )
 *   )
 * }
 */
export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onOpenApp }) => {
  const handleOpen = () => {
    playSuccessSound();
    onOpenApp();
  };

  return (
    <div
      id="welcome-screen"
      className="fixed inset-0 z-50 bg-white flex items-center justify-center p-6 selection:bg-amber-500 selection:text-white"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-sm flex flex-col items-center justify-center text-center"
      >
        {/* Title: "Welcome" (fontSize: 32, fontWeight: FontWeight.bold) */}
        <h1 className="text-[32px] sm:text-[34px] font-bold text-slate-900 tracking-tight leading-none">
          Welcome
        </h1>

        {/* SizedBox(height: 40) */}
        <div className="h-10" />

        {/* ElevatedButton: Golden Color (Colors.amber[700] = #FFA000), padding (horizontal: 40, vertical: 15), circular(30) */}
        <button
          id="open-app-btn"
          type="button"
          onClick={handleOpen}
          className="hover:brightness-95 active:scale-95 text-white font-medium text-[18px] px-[40px] py-[15px] rounded-[30px] shadow-lg shadow-amber-500/30 transition-all duration-150 cursor-pointer inline-flex items-center justify-center select-none"
          style={{
            backgroundColor: '#FFA000', // Flutter Colors.amber[700] Golden Color
          }}
        >
          Open the App
        </button>

        {/* Subtitle feature indicators */}
        <div className="mt-8 flex items-center gap-2 text-xs text-slate-400 font-medium">
          <span>Voice Khata</span>
          <span>•</span>
          <span>Customer Ledger</span>
          <span>•</span>
          <span>Dynamic Learning</span>
          <span>•</span>
          <span>Voice Tasks</span>
        </div>
      </motion.div>
    </div>
  );
};
