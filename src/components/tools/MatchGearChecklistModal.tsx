import React, { useState } from 'react';
import { MatchGearItem, FriendPlayer } from '../../types';
import { sfx } from '../../utils/audio';

interface MatchGearChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  friends?: FriendPlayer[];
  onShareWhatsApp: (text: string) => void;
}

const INITIAL_GEAR: MatchGearItem[] = [
  {
    id: 'g-1',
    name: 'الكرة الرسمية (أديداس الحارة)',
    icon: 'sports_soccer',
    category: 'ball',
    assignedTo: 'أحمد النعيمات (أنت)',
    isReady: true,
    statusNote: 'منفوخة 100% ومفحوصة الضغط ⚽',
  },
  {
    id: 'g-2',
    name: 'قمصان التمييز (البيبات / الشالكي)',
    icon: 'styler',
    category: 'bibs',
    assignedTo: 'عمر الدوسري',
    isReady: true,
    statusNote: 'طقمين (7 أزرق و 7 برتقالي)',
  },
  {
    id: 'g-3',
    name: 'كرتون ماء بارد وثلج',
    icon: 'water_drop',
    category: 'water',
    assignedTo: undefined,
    isReady: false,
    statusNote: 'مطلوب متطوع لإحضار كرتون مياه بارد 🧊',
  },
  {
    id: 'g-4',
    name: 'صفارة الحكم وساعة التوقيت',
    icon: 'campaign',
    category: 'referee',
    assignedTo: 'طارق الزعبي',
    isReady: true,
    statusNote: 'صفارة Fox 40 احترافية',
  },
  {
    id: 'g-5',
    name: 'حقيبة إسعافات وبخاخ كدمات',
    icon: 'medical_services',
    category: 'firstaid',
    assignedTo: undefined,
    isReady: false,
    statusNote: 'بخاخ ثلج ولصقات طبية للإصابات',
  },
  {
    id: 'g-6',
    name: 'تأكيد كود حجز الملعب مع الحارس',
    icon: 'pin',
    category: 'other',
    assignedTo: 'معتز الشريف',
    isReady: true,
    statusNote: 'الحجز مؤكد الساعة 10:00 مساءً',
  },
];

export const MatchGearChecklistModal: React.FC<MatchGearChecklistModalProps> = ({
  isOpen,
  onClose,
  friends = [],
  onShareWhatsApp,
}) => {
  const [items, setItems] = useState<MatchGearItem[]>(INITIAL_GEAR);
  const [newItemName, setNewItemName] = useState('');

  if (!isOpen) return null;

  const readyCount = items.filter((i) => i.isReady).length;
  const totalCount = items.length;
  const progressPercent = Math.round((readyCount / totalCount) * 100);

  // Toggle ready status
  const handleToggleReady = (id: string) => {
    sfx.playDing();
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newReady = !item.isReady;
        return {
          ...item,
          isReady: newReady,
          statusNote: newReady
            ? 'تم التأكيد وجاهز للإحضار ✅'
            : 'بانتظار التأكيد أو التكفل ⚠️',
        };
      })
    );
  };

  // Claim responsibility ("أنا بجيبها")
  const handleClaim = (id: string) => {
    sfx.playSuccess();
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          assignedTo: 'أحمد النعيمات (أنت)',
          isReady: true,
          statusNote: 'تكفلت بها وجاهزة معك للملعب ✅',
        };
      })
    );
  };

  // Add custom equipment item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    sfx.playSuccess();
    const newItem: MatchGearItem = {
      id: `g-${Date.now()}`,
      name: newItemName.trim(),
      icon: 'inventory_2',
      category: 'other',
      assignedTo: undefined,
      isReady: false,
      statusNote: 'مطلوب متطوع',
    };
    setItems((prev) => [...prev, newItem]);
    setNewItemName('');
  };

  // WhatsApp Share Builder
  const handleShareChecklist = () => {
    const text = `📋 *شيك لست وتجهيزات مباراة الليلة - نجوم الحارة* ⚽\n` +
      `🏟️ *ملعب جبل الحسين*\n\n` +
      `📊 حالة التجهيزات: ${readyCount}/${totalCount} مكتملة (${progressPercent}%)\n\n` +
      items
        .map((i) => {
          if (i.isReady) {
            return `✅ ${i.name}: ${i.assignedTo || 'جاهز'} (${i.statusNote})`;
          } else {
            return `⚠️ ${i.name}: غير محدد (مين يتكفل فيها؟)`;
          }
        })
        .join('\n\n') +
      `\n\nيا شباب تأكدوا ما ننسى الكرة والماء قبل التحرك للملعب! 🙏⚽`;

    onShareWhatsApp(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-lg bg-[#16181d] border border-[#282a2e] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-[#e2e2e8]">
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-[#1e2024] to-[#16181d] border-b border-[#282a2e] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#00a572]/20 text-[#4edea3] flex items-center justify-center border border-[#00a572]/30">
              <span className="material-symbols-outlined text-[24px]">checklist</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
                  تجهيزات المباراة ومسؤولية الحارة
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#ffc174]/20 text-[#ffc174] text-[10px] font-['Space_Grotesk'] font-bold border border-[#ffc174]/30">
                  مين جايب الكورة؟
                </span>
              </div>
              <p className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad]">
                تأكد من اكتمال الكرة والبيبات والماء لتفادي المفاجآت بالملعب
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#282a2e] hover:bg-[#333539] flex items-center justify-center text-[#d8c3ad] hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Readiness Status Progress Card */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#1e2024] to-[#1a1c20] border border-[#282a2e] shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4edea3] text-[20px]">
                  sports_soccer
                </span>
                <span className="font-['Rubik'] text-[14px] text-white font-bold">
                  {readyCount === totalCount
                    ? 'كل التجهيزات مكتملة والكرة منفوخة! ⚽🔥'
                    : `جاهزية العتاد: ${readyCount} من ${totalCount} عناصر`}
                </span>
              </div>
              <span className="font-['Space_Grotesk'] text-[13px] text-[#4edea3] font-bold">
                {progressPercent}%
              </span>
            </div>

            <div className="w-full h-2.5 bg-[#111317] rounded-full overflow-hidden border border-[#282a2e]">
              <div
                className="h-full bg-gradient-to-r from-[#00a572] to-[#4edea3] rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="mt-2.5 flex items-center justify-between text-[11px] font-['Plus_Jakarta_Sans'] text-[#d8c3ad]">
              <span className="flex items-center gap-1 text-[#4edea3]">
                <span className="w-2 h-2 rounded-full bg-[#4edea3]"></span>
                الكرة الرسمية منفوخة ومؤكدة ⚽
              </span>
              <span>
                {totalCount - readyCount > 0
                  ? `متبقي ${totalCount - readyCount} بحاجة لتكفل`
                  : 'جاهزون للانطلاق 🚀'}
              </span>
            </div>
          </div>

          {/* Quick Add Custom Item */}
          <form onSubmit={handleAddItem} className="flex gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="أضف غرض إضافي (مثلاً: حامل كاميرا للتصوير)"
              className="flex-1 bg-[#1e2024] border border-[#282a2e] rounded-xl px-3 py-2 text-[13px] text-white placeholder-[#8d725a] focus:outline-none focus:border-[#4edea3]"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-[#282a2e] hover:bg-[#333539] text-[#4edea3] font-['Rubik'] text-[12px] font-bold border border-[#333539] cursor-pointer shrink-0 flex items-center gap-1 active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>إضافة</span>
            </button>
          </form>

          {/* Checklist Items List */}
          <div className="space-y-2">
            {items.map((item) => {
              const isAssigned = !!item.assignedTo;
              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                    item.isReady
                      ? 'bg-[#18231e] border-[#00a572]/40 shadow-sm'
                      : 'bg-[#1e2024] border-[#282a2e] hover:border-[#37393e]'
                  }`}
                >
                  {/* Left: Checkmark Toggle */}
                  <button
                    onClick={() => handleToggleReady(item.id)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                      item.isReady
                        ? 'bg-[#00a572] text-[#00311f]'
                        : 'bg-[#282a2e] text-[#8d725a] hover:bg-[#333539]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {item.isReady ? 'check' : 'crop_square'}
                    </span>
                  </button>

                  {/* Middle Content */}
                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-['Rubik'] text-[14px] text-white font-bold">
                        {item.name}
                      </span>
                      {item.isReady ? (
                        <span className="px-1.5 py-0.2 rounded bg-[#00a572]/20 text-[#4edea3] text-[10px] font-bold font-['Space_Grotesk']">
                          جاهز ومؤكد
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded bg-[#93000a]/30 text-[#ffb4ab] text-[10px] font-bold font-['Space_Grotesk'] animate-pulse">
                          مطلوب متطوع!
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-[#d8c3ad] font-['Plus_Jakarta_Sans'] mt-0.5">
                      {item.statusNote}
                    </div>

                    {/* Assigned Person Chip */}
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                      <span className="text-[#8d725a]">المسؤول:</span>
                      {isAssigned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#282a2e] text-[#ffc174] font-bold">
                          <span className="material-symbols-outlined text-[14px]">person</span>
                          <span>{item.assignedTo}</span>
                        </span>
                      ) : (
                        <span className="text-[#ffb4ab] font-bold">لم يتكفل به أحد بعد</span>
                      )}
                    </div>
                  </div>

                  {/* Right: Quick Action (Claim Button) */}
                  {!item.isReady && (
                    <button
                      onClick={() => handleClaim(item.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#f59e0b]/20 hover:bg-[#f59e0b]/30 text-[#ffc174] font-['Rubik'] text-[11px] font-bold border border-[#f59e0b]/30 shrink-0 cursor-pointer active:scale-95 transition-all"
                    >
                      أنا بجيبها 🙋‍♂️
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Action Bar */}
        <div className="p-3 bg-[#1e2024] border-t border-[#282a2e] flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[#282a2e] hover:bg-[#333539] text-[#d8c3ad] font-['Rubik'] text-[13px] font-bold transition-all cursor-pointer"
          >
            إغلاق
          </button>
          <button
            onClick={handleShareChecklist}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#25d366] hover:bg-[#20ba5a] active:scale-95 text-[#003816] font-['Rubik'] text-[13px] font-extrabold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
            <span>تذكير الشباب بقائمة العتاد في واتساب 💬</span>
          </button>
        </div>
      </div>
    </div>
  );
};
