import React, { useState } from 'react';
import { sfx } from '../../utils/audio';

interface QrCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckinSuccess: () => void;
}

export const QrCheckinModal: React.FC<QrCheckinModalProps> = ({
  isOpen,
  onClose,
  onCheckinSuccess,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  if (!isOpen) return null;

  const handleSimulateScan = () => {
    setIsScanning(true);
    sfx.playClipBeep();
    setTimeout(() => {
      setIsScanning(false);
      setCheckedIn(true);
      sfx.playSuccess();
      onCheckinSuccess();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-2xl bg-[#1e2024] p-4 shadow-2xl border border-[#4edea3]/40 flex flex-col space-y-4 text-center">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#282a2e] pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4edea3] text-[22px]">
              qr_code_scanner
            </span>
            <h2 className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
              باركود الدخول للملعب
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#282a2e] hover:bg-[#333539] flex items-center justify-center text-[#e2e2e8] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Dynamic QR Code Pass */}
        <div className="relative p-6 rounded-2xl bg-white flex flex-col items-center justify-center shadow-inner mx-auto">
          {/* Simulated QR Pattern */}
          <div className="w-48 h-48 bg-[#111317] p-2 rounded-xl flex items-center justify-center relative overflow-hidden">
            <div className="w-full h-full bg-[#111317] grid grid-cols-6 grid-rows-6 gap-1 p-1">
              {Array.from({ length: 36 }).map((_, i) => (
                <div
                  key={i}
                  className={`rounded-sm ${
                    i % 2 === 0 || i % 7 === 0 || i === 0 || i === 5 || i === 30 || i === 35
                      ? 'bg-white'
                      : 'bg-transparent'
                  }`}
                />
              ))}
            </div>

            {/* Scanning line animation */}
            {isScanning && (
              <div className="absolute inset-x-0 h-1 bg-[#4edea3] shadow-[0_0_12px_#4edea3] animate-bounce" />
            )}

            {/* Center Logo */}
            <div className="absolute w-10 h-10 rounded-full bg-[#111317] border-2 border-[#ffc174] flex items-center justify-center">
              <span className="text-sm">⚽</span>
            </div>
          </div>

          <span className="font-['Space_Grotesk'] text-[12px] text-[#111317] font-bold mt-2">
            NJM-PASS-AHMAD-8701
          </span>
        </div>

        {/* GPS location signal */}
        <div className="p-2.5 rounded-lg bg-[#1a1c20] flex items-center justify-between text-[11px] text-[#d8c3ad] border border-[#282a2e]">
          <span className="flex items-center gap-1 text-[#4edea3]">
            <span className="material-symbols-outlined text-[14px]">location_on</span>
            موقع الملعب: جبل الحسين
          </span>
          <span>المسافة: 120م (داخل النطاق ✅)</span>
        </div>

        {/* Action Button */}
        {checkedIn ? (
          <div className="p-3 rounded-xl bg-[#00a572] text-[#00311f] font-['Rubik'] text-[16px] font-bold flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>تم التحقق وتسجيل حضورك (+50 XP)!</span>
          </div>
        ) : (
          <button
            onClick={handleSimulateScan}
            disabled={isScanning}
            className="w-full py-3 rounded-xl bg-[#00a572] hover:bg-[#10B981] text-[#00311f] font-['Rubik'] text-[16px] font-bold shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            {isScanning ? 'جاري قراءة الرمز والتحقق...' : 'تأكيد الحضور ومسح الباركود'}
          </button>
        )}
      </div>
    </div>
  );
};
