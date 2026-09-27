import React from 'react';
import { sfx } from '../../utils/audio';

interface MatchDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShareWhatsApp: (text: string) => void;
}

export const MatchDetailsModal: React.FC<MatchDetailsModalProps> = ({
  isOpen,
  onClose,
  onShareWhatsApp,
}) => {
  if (!isOpen) return null;

  const teamBlue = [
    { num: 1, name: 'أحمد المالكي (C)', pos: 'مهاجم', rating: '8.4' },
    { num: 4, name: 'موسى الدوايمة', pos: 'دفاع', rating: '8.1' },
    { num: 7, name: 'محمود الشويكي', pos: 'وسط', rating: '7.8' },
    { num: 9, name: 'عمر أبوعلي', pos: 'وسط', rating: '7.9' },
    { num: 10, name: 'يزن شقر', pos: 'جناح', rating: '8.5' },
    { num: 12, name: 'حمزة كيلاني', pos: 'حارس', rating: '8.2' },
  ];

  const teamOrange = [
    { num: 1, name: 'سيف الحارة (C)', pos: 'صانع ألعاب', rating: '8.8' },
    { num: 3, name: 'طارق الزعبي', pos: 'دفاع', rating: '8.0' },
    { num: 8, name: 'ليث أبو رمان', pos: 'وسط', rating: '7.6' },
    { num: 11, name: 'كابتن عمر الدوسري', pos: 'مهاجم', rating: '8.3' },
    { num: 14, name: 'باسم القاضي', pos: 'جناح', rating: '7.5' },
    { num: 22, name: 'نور الدين عورتاني', pos: 'حارس', rating: '7.9' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl bg-[#1e2024] p-4 shadow-2xl border border-[#ffc174]/40 flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#282a2e] pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffc174] text-[22px]">
              sports_soccer
            </span>
            <h2 className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
              تشكيلة وتفاصيل المباراة
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#282a2e] hover:bg-[#333539] flex items-center justify-center text-[#e2e2e8] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Match Meta Card */}
        <div className="bg-[#1a1c20] p-3 rounded-xl border border-[#282a2e] flex flex-col space-y-2 text-center">
          <span className="font-['Space_Grotesk'] text-[11px] text-[#4edea3] font-bold">
            ملعب جبل الحسين • الليلة الساعة 10:00 مساءً
          </span>
          <div className="flex items-center justify-center gap-3">
            <span className="font-['Rubik'] text-[16px] text-[#ffc174] font-black">حي الحسين</span>
            <span className="text-[#d8c3ad] font-bold">VS</span>
            <span className="font-['Rubik'] text-[16px] text-[#4edea3] font-black">نسور العبدلي</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-[12px] font-['Plus_Jakarta_Sans'] text-[#d8c3ad] pt-1">
            <span>الحجم: 6 ضد 6</span>
            <span>•</span>
            <span>المدة: 90 دقيقة</span>
            <span>•</span>
            <span>الحصص: مسجلة HD</span>
          </div>
        </div>

        {/* Squad Rosters */}
        <div className="grid grid-cols-2 gap-2 text-right">
          {/* Team Blue */}
          <div className="bg-[#1a1c20] p-3 rounded-xl border border-[#3b82f6]/30">
            <div className="flex items-center gap-1.5 mb-2 pb-1 border-b border-[#282a2e]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></span>
              <span className="font-['Rubik'] text-[14px] text-[#e2e2e8] font-bold">
                حي الحسين (أزرق)
              </span>
            </div>
            <div className="flex flex-col space-y-1.5">
              {teamBlue.map((p) => (
                <div key={p.num} className="flex items-center justify-between text-[11px]">
                  <span className="text-[#e2e2e8] font-medium truncate">{p.name}</span>
                  <span className="font-['Space_Grotesk'] text-[#ffc174] font-bold">
                    {p.rating}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Team Orange */}
          <div className="bg-[#1a1c20] p-3 rounded-xl border border-[#f59e0b]/30">
            <div className="flex items-center gap-1.5 mb-2 pb-1 border-b border-[#282a2e]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
              <span className="font-['Rubik'] text-[14px] text-[#e2e2e8] font-bold">
                نسور العبدلي (برتقالي)
              </span>
            </div>
            <div className="flex flex-col space-y-1.5">
              {teamOrange.map((p) => (
                <div key={p.num} className="flex items-center justify-between text-[11px]">
                  <span className="text-[#e2e2e8] font-medium truncate">{p.name}</span>
                  <span className="font-['Space_Grotesk'] text-[#4edea3] font-bold">
                    {p.rating}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Share Button */}
        <button
          onClick={() => {
            sfx.playSuccess();
            onShareWhatsApp(
              '⚽ تشكيلة مباراة الليلة: حي الحسين ضد نسور العبدلي! تعال شجع وشوف اللقطات المباشرة على نجوم الحارة.'
            );
          }}
          className="w-full py-3 rounded-xl bg-[#00a572] hover:bg-[#10B981] text-[#00311f] font-['Rubik'] text-[16px] font-bold flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">share</span>
          <span>مشاركة التشكيلة عبر واتساب</span>
        </button>
      </div>
    </div>
  );
};
