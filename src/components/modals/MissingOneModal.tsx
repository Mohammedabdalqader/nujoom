import React, { useState } from 'react';
import { sfx } from '../../utils/audio';

interface MissingOneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShareWhatsApp: (text: string) => void;
}

export const MissingOneModal: React.FC<MissingOneModalProps> = ({
  isOpen,
  onClose,
  onShareWhatsApp,
}) => {
  const [joined, setJoined] = useState(false);

  if (!isOpen) return null;

  const handleJoin = () => {
    sfx.playSuccess();
    setJoined(true);
    setTimeout(() => {
      alert('تم إضافتك للتشكيلة! تم إرسال رسالة للكابتن برقمك وموعد التجمع.');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-2xl bg-[#1e2024] p-4 shadow-2xl border border-[#ffb4ab]/40 flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#282a2e] pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffb4ab] text-[22px]">
              person_add
            </span>
            <h2 className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
              ناقصنا واحد (طلب عاجل)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#282a2e] hover:bg-[#333539] flex items-center justify-center text-[#e2e2e8] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Urgent Match Card Details */}
        <div className="bg-[#1a1c20] p-3 rounded-xl border border-[#93000a]/40 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-['Rubik'] text-[16px] text-[#e2e2e8] font-bold">
              ملعب حديقة النزهة
            </span>
            <span className="font-['Space_Grotesk'] text-[12px] bg-[#93000a]/30 text-[#ffb4ab] px-2 py-0.5 rounded-full font-bold">
              يبدأ بعد 40 دقيقة
            </span>
          </div>

          <div className="flex items-center justify-between text-[12px] text-[#d8c3ad] font-['Plus_Jakarta_Sans']">
            <span>المركز المطلوب: لاعب وسط هجومي / صانع ألعاب</span>
          </div>

          <div className="flex items-center justify-between text-[12px] text-[#d8c3ad] font-['Plus_Jakarta_Sans']">
            <span>الحصة الفردية:</span>
            <span className="font-['Space_Grotesk'] text-[15px] text-[#4edea3] font-bold">
              2.5 دينار أردني
            </span>
          </div>

          <div className="p-2 rounded-lg bg-[#282a2e] text-[11px] text-[#d8c3ad] leading-relaxed">
            الكابتن مؤمن: "الماتش قوي وتنافسي، الحجز مدفوع وجاهزين بس ناقصنا شب رنان بالوسط!"
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={handleJoin}
            disabled={joined}
            className="w-full py-3 rounded-xl bg-[#4edea3] hover:bg-[#00a572] text-[#003824] hover:text-white font-['Rubik'] text-[16px] font-bold shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            {joined ? 'تم الانضمام بنجاح! ⚽' : 'أنا جاهز! انضمام فوري للتشكيلة'}
          </button>

          <button
            onClick={() => {
              sfx.playClipBeep();
              onShareWhatsApp(
                'شباب ناقصنا لاعب بملعب حديقة النزهة بعد 40 دقيقة، الحصة 2.5 دينار! مين بنزل معنا؟'
              );
            }}
            className="w-full py-2.5 rounded-xl bg-[#282a2e] hover:bg-[#333539] text-[#e2e2e8] font-['Rubik'] text-[14px] flex items-center justify-center gap-2 cursor-pointer border border-[#333539]"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
            <span>مشاركة الطلب مع أصحابك</span>
          </button>
        </div>
      </div>
    </div>
  );
};
