import React from 'react';
import { Mic, WifiOff } from 'lucide-react';
import { motion } from 'motion/react';
import { playVoiceStartSound, playErrorAlert } from '../utils/audio';

interface VoiceFabProps {
  onClick: () => void;
  isRecording?: boolean;
  isOnline?: boolean;
}

/**
 * Flutter Golden Mic Button Implementation:
 * 
 * floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
 * floatingActionButton: Padding(
 *   padding: const EdgeInsets.only(bottom: 25.0), // Push button upwards
 *   child: GestureDetector(
 *     onTap: () {
 *       // Check Network Connectivity First
 *       if (!isOnline) {
 *         ScaffoldMessenger.of(context).showSnackBar(
 *           SnackBar(
 *             content: Text("Voice features require an internet connection. Please connect to the internet or use manual entry."),
 *             backgroundColor: Colors.redAccent,
 *           ),
 *         );
 *         return;
 *       }
 *       // Trigger Voice Recording Logic
 *     },
 *     child: Container(
 *       width: 70,
 *       height: 70,
 *       decoration: BoxDecoration(
 *         shape: BoxShape.circle,
 *         gradient: isOnline
 *           ? LinearGradient(colors: [Colors.amber[300]!, Colors.amber[800]!])
 *           : LinearGradient(colors: [Colors.grey[400]!, Colors.blueGrey[600]!]),
 *       ),
 *       child: Icon(isOnline ? Icons.mic : Icons.mic_off, color: Colors.white, size: 36),
 *     ),
 *   ),
 * )
 */
export const GoldenMicButton: React.FC<{
  onTap: () => void;
  isRecording?: boolean;
  isOnline?: boolean;
  className?: string;
  size?: number;
}> = ({ onTap, isRecording = false, isOnline = true, className = '', size = 70 }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOnline) {
      playErrorAlert();
    } else {
      playVoiceStartSound();
    }
    onTap();
  };

  // When offline: visually indicate inactive state with desaturated gradient and offline indicator badge
  const backgroundStyle = !isOnline
    ? 'linear-gradient(135deg, #94A3B8 0%, #64748B 50%, #475569 100%)'
    : isRecording
    ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #991B1B 100%)'
    : 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 50%, #B45309 100%)';

  const shadowStyle = !isOnline
    ? '0 4px 15px -2px rgba(100, 116, 139, 0.4)'
    : isRecording
    ? '0 0 20px 4px rgba(239, 68, 68, 0.55), 0 8px 25px -4px rgba(185, 28, 28, 0.5)'
    : '0 0 15px 2px rgba(245, 158, 11, 0.5), 0 6px 20px -2px rgba(180, 83, 9, 0.4)';

  return (
    <motion.div
      onClick={handleClick}
      whileHover={{ scale: isOnline ? 1.07 : 1.02 }}
      whileTap={{ scale: 0.94 }}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: backgroundStyle,
        boxShadow: shadowStyle,
      }}
      className={`rounded-full flex items-center justify-center cursor-pointer select-none transition-all relative shrink-0 ${
        !isOnline ? 'opacity-85' : ''
      } ${className}`}
      role="button"
      tabIndex={0}
      aria-label={isOnline ? 'Golden Voice Assistant Mic' : 'Voice Assistant Disabled (Offline)'}
      title={
        isOnline
          ? 'Tap to trigger voice recording'
          : 'Voice features require an internet connection. Please connect to the internet or use manual entry.'
      }
    >
      {/* Outer ambient glow ripple if recording */}
      {isRecording && isOnline && (
        <span className="absolute inset-0 rounded-full animate-ping bg-rose-500/40 pointer-events-none" />
      )}

      {/* Offline Badge Pill */}
      {!isOnline && (
        <span className="absolute -top-1 -right-1 bg-red-600 text-white p-1 rounded-full shadow-md flex items-center justify-center border-2 border-white ring-1 ring-red-400">
          <WifiOff className="w-3 h-3 stroke-[2.5]" />
        </span>
      )}

      {/* Mic Icon */}
      <Mic
        className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)] transition-opacity"
        style={{
          width: '36px',
          height: '36px',
          opacity: isOnline ? 1 : 0.75,
        }}
      />
    </motion.div>
  );
};

export const VoiceFab: React.FC<VoiceFabProps> = ({ onClick, isRecording = false, isOnline = true }) => {
  return (
    /* FloatingActionButtonLocation.centerFloat with Padding(bottom: 25.0) */
    <div className="fixed bottom-[25px] left-1/2 -translate-x-1/2 z-40 flex flex-col items-center justify-center select-none pointer-events-auto">
      {/* Golden Mic Button (70x70 with 36px mic icon) */}
      <GoldenMicButton onTap={onClick} isRecording={isRecording} isOnline={isOnline} size={70} />
    </div>
  );
};
