import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { playClickSound } from '../utils/audio';

interface DeleteKhataDialogProps {
  isOpen: boolean;
  customerName: string;
  onClose: () => void;
  onConfirmDelete: () => void;
}

/**
 * Flutter deleteKhataDialog equivalent:
 * 
 * void deleteKhataDialog(BuildContext context, String customerName) {
 *   showDialog(
 *     context: context,
 *     builder: (BuildContext context) {
 *       return AlertDialog(
 *         title: Text("کھاتہ ڈیلیٹ کریں"),
 *         content: Text("کیا آپ $customerName کا تمام ریکارڈ ڈیلیٹ کرنا چاہتے ہیں؟"),
 *         actions: [
 *           TextButton(
 *             child: Text("منسوخ کریں"),
 *             onPressed: () => Navigator.of(context).pop(),
 *           ),
 *           ElevatedButton(
 *             style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
 *             child: Text("ڈیلیٹ کریں", style: TextStyle(color: Colors.white)),
 *             onPressed: () {
 *               // Delete Logic Here
 *               Navigator.of(context).pop();
 *             },
 *           ),
 *         ],
 *       );
 *     },
 *   );
 * }
 */
export const DeleteKhataDialog: React.FC<DeleteKhataDialogProps> = ({
  isOpen,
  customerName,
  onClose,
  onConfirmDelete,
}) => {
  if (!isOpen) return null;

  const handleCancel = () => {
    playClickSound();
    onClose();
  };

  const handleConfirm = () => {
    playClickSound();
    onConfirmDelete();
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none"
        onClick={handleCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-right dir-rtl font-urdu space-y-4"
          role="alertdialog"
          aria-modal="true"
        >
          {/* Header / Title */}
          <div className="flex items-center gap-3 justify-end text-rose-600">
            <h3 className="text-xl font-black text-slate-900 font-urdu leading-tight">
              کھاتہ ڈیلیٹ کریں
            </h3>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <Trash2 className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>

          {/* Content / Question */}
          <p className="text-base text-slate-600 leading-relaxed font-urdu">
            کیا آپ <span className="font-bold text-slate-900">{customerName}</span> کا تمام ریکارڈ ڈیلیٹ کرنا چاہتے ہیں؟
          </p>

          <p className="text-xs text-rose-500 font-sans text-left">
            * Warning: All transactions and balance records for this account will be permanently removed.
          </p>

          {/* Actions: TextButton (منسوخ کریں) & ElevatedButton (ڈیلیٹ کریں) */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            {/* TextButton: منسوخ کریں */}
            <button
              id="dialog-cancel-delete-btn"
              type="button"
              onClick={handleCancel}
              className="px-4 py-2.5 rounded-2xl text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              منسوخ کریں
            </button>

            {/* ElevatedButton with backgroundColor: Colors.red */}
            <button
              id="dialog-confirm-delete-btn"
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2.5 rounded-2xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 shadow-md shadow-red-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              style={{ backgroundColor: '#DC2626' }}
            >
              <Trash2 className="w-4 h-4 stroke-[2.2]" />
              <span>ڈیلیٹ کریں</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
