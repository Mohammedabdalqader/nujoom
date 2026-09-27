import React, { useState } from 'react';
import { QatyaPlayer, FriendPlayer } from '../../types';
import { sfx } from '../../utils/audio';

interface MatchCostSplitterModalProps {
  isOpen: boolean;
  onClose: () => void;
  friends?: FriendPlayer[];
  onShareWhatsApp: (text: string) => void;
}

const INITIAL_PLAYERS: QatyaPlayer[] = [
  { id: 'qp-1', name: 'أحمد النعيمات (أنت)', hasPaid: true, paymentMethod: 'cash', paidAt: 'دفع نقداً' },
  { id: 'qp-2', name: 'عمر الدوسري', hasPaid: true, paymentMethod: 'cliq', paidAt: 'عبر كليك' },
  { id: 'qp-3', name: 'طارق الزعبي', hasPaid: true, paymentMethod: 'stars', paidAt: 'بمحفظة نجوم' },
  { id: 'qp-4', name: 'سيف العبدلي', hasPaid: true, paymentMethod: 'cliq', paidAt: 'عبر كليك' },
  { id: 'qp-5', name: 'حمزة الكيلاني', hasPaid: false },
  { id: 'qp-6', name: 'معتز الشريف', hasPaid: true, paymentMethod: 'cash', paidAt: 'دفع نقداً' },
  { id: 'qp-7', name: 'يوسف أبو هاشم', hasPaid: false },
  { id: 'qp-8', name: 'نور العورتاني', hasPaid: false },
  { id: 'qp-9', name: 'ليث أبو رمان', hasPaid: true, paymentMethod: 'cliq', paidAt: 'عبر كليك' },
  { id: 'qp-10', name: 'عمر الشويكي', hasPaid: false },
  { id: 'qp-11', name: 'زيد الرفاعي', hasPaid: true, paymentMethod: 'cash', paidAt: 'دفع نقداً' },
  { id: 'qp-12', name: 'خالد المجالي', hasPaid: false },
  { id: 'qp-13', name: 'وسام قاسم', hasPaid: true, paymentMethod: 'cliq', paidAt: 'عبر كليك' },
  { id: 'qp-14', name: 'فيصل حداد', hasPaid: false },
];

export const MatchCostSplitterModal: React.FC<MatchCostSplitterModalProps> = ({
  isOpen,
  onClose,
  onShareWhatsApp,
}) => {
  const [pitchCost, setPitchCost] = useState<number>(35); // 35 JOD
  const [extrasCost, setExtrasCost] = useState<number>(5); // 5 JOD for water/drinks
  const [cliqAlias, setCliqAlias] = useState<string>('NUJOOM-CAPTAIN');
  const [players, setPlayers] = useState<QatyaPlayer[]>(INITIAL_PLAYERS);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [copiedCliq, setCopiedCliq] = useState(false);

  if (!isOpen) return null;

  const totalCost = pitchCost + extrasCost;
  const playerCount = players.length;
  const costPerPlayer = playerCount > 0 ? (totalCost / playerCount).toFixed(2) : '0.00';

  const paidPlayersCount = players.filter((p) => p.hasPaid).length;
  const collectedAmount = (paidPlayersCount * Number(costPerPlayer)).toFixed(2);
  const remainingAmount = Math.max(0, totalCost - Number(collectedAmount)).toFixed(2);
  const collectionPercent = totalCost > 0 ? Math.min(100, Math.round((Number(collectedAmount) / totalCost) * 100)) : 0;

  // Toggle payment status
  const handleTogglePaid = (id: string) => {
    sfx.playDing();
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const newPaid = !p.hasPaid;
        return {
          ...p,
          hasPaid: newPaid,
          paymentMethod: newPaid ? 'cliq' : undefined,
          paidAt: newPaid ? 'تم الدفع الآن' : undefined,
        };
      })
    );
  };

  // Change payment method
  const handleChangeMethod = (id: string, method: 'cash' | 'cliq' | 'stars') => {
    sfx.playSuccess();
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, hasPaid: true, paymentMethod: method } : p))
    );
  };

  // Add custom player to splitting roster
  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    sfx.playSuccess();
    const newP: QatyaPlayer = {
      id: `qp-${Date.now()}`,
      name: newPlayerName.trim(),
      hasPaid: false,
    };
    setPlayers((prev) => [...prev, newP]);
    setNewPlayerName('');
  };

  // Copy CliQ Alias
  const handleCopyCliq = () => {
    try {
      navigator.clipboard?.writeText(cliqAlias);
      setCopiedCliq(true);
      sfx.playSuccess();
      setTimeout(() => setCopiedCliq(false), 2500);
    } catch {
      // fallback
    }
  };

  // WhatsApp Share Builder
  const handleShareQatya = () => {
    const text = `⚽ *قطية مباراة اليوم - ملعب جبل الحسين* 💰\n` +
      `🏟️ إيجار الملعب: ${pitchCost} دينار\n` +
      `🧊 مياه وعصائر: ${extrasCost} دينار\n` +
      `💵 *إجمالي الحساب:* ${totalCost} دينار\n` +
      `👥 عدد اللاعبين: ${playerCount} لاعب\n\n` +
      `🎯 *حصة كل لاعب (القطية): ${costPerPlayer} دينار*\n\n` +
      `📲 يرجى الدفع نقداً للكابتن أو عبر كليك (CliQ):\n` +
      `👉 معرّف كليك: *${cliqAlias}*\n\n` +
      `📊 سدد حتى الآن: ${paidPlayersCount} من ${playerCount} لاعبين.\n` +
      `يعطيكم ألف عافية يا شباب وسددوا القطية قبل ما نبدأ! 🙏⚽`;

    onShareWhatsApp(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-lg bg-[#16181d] border border-[#282a2e] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-[#e2e2e8]">
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-[#1e2024] to-[#16181d] border-b border-[#282a2e] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/20 text-[#ffc174] flex items-center justify-center border border-[#f59e0b]/30">
              <span className="material-symbols-outlined text-[24px]">payments</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
                  حاسبة قطية الملعب والتقسيم الذكي
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#00a572]/20 text-[#4edea3] text-[10px] font-['Space_Grotesk'] font-bold border border-[#00a572]/30">
                  قطية الحارة
                </span>
              </div>
              <p className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad]">
                قسّم حساب الملعب والمياه على الحاضرين وتابع من دفع ومن متبقي عليه
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
          {/* Main Calculation Hero Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#1e2024] to-[#14161a] border border-[#ffc174]/20 shadow-xl">
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Pitch Cost input */}
              <div className="flex flex-col text-right">
                <label className="text-[11px] font-['Plus_Jakarta_Sans'] text-[#d8c3ad] mb-1">
                  إيجار الملعب (د.أ)
                </label>
                <div className="flex items-center gap-1.5 bg-[#111317] border border-[#282a2e] rounded-xl px-2.5 py-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#4edea3]">stadium</span>
                  <input
                    type="number"
                    min={0}
                    value={pitchCost}
                    onChange={(e) => setPitchCost(Number(e.target.value) || 0)}
                    className="w-full bg-transparent text-white font-['Space_Grotesk'] text-[16px] font-bold focus:outline-none"
                  />
                </div>
              </div>

              {/* Extras Cost input */}
              <div className="flex flex-col text-right">
                <label className="text-[11px] font-['Plus_Jakarta_Sans'] text-[#d8c3ad] mb-1">
                  مياه ومصاريف (د.أ)
                </label>
                <div className="flex items-center gap-1.5 bg-[#111317] border border-[#282a2e] rounded-xl px-2.5 py-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#60a5fa]">water_drop</span>
                  <input
                    type="number"
                    min={0}
                    value={extrasCost}
                    onChange={(e) => setExtrasCost(Number(e.target.value) || 0)}
                    className="w-full bg-transparent text-white font-['Space_Grotesk'] text-[16px] font-bold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Big Highlight: Cost Per Player */}
            <div className="p-3 rounded-xl bg-[#282a2e]/60 border border-[#333539] flex items-center justify-between">
              <div className="flex flex-col text-right">
                <span className="text-[11px] font-['Plus_Jakarta_Sans'] text-[#ffc174] font-bold">
                  حصة كل لاعب (القطية) 🎯
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-['Space_Grotesk'] text-[32px] text-[#ffc174] font-extrabold leading-none drop-shadow-[0_0_12px_rgba(255,193,116,0.3)]">
                    {costPerPlayer}
                  </span>
                  <span className="font-['Rubik'] text-[13px] text-[#d8c3ad]">دينار أردني</span>
                </div>
              </div>

              <div className="flex flex-col items-end text-left">
                <span className="text-[11px] text-[#d8c3ad]">إجمالي الحساب:</span>
                <span className="font-['Space_Grotesk'] text-[16px] text-white font-bold">
                  {totalCost.toFixed(2)} د.أ
                </span>
                <span className="text-[10px] text-[#8d725a]">على {playerCount} لاعبين</span>
              </div>
            </div>

            {/* Collection Progress */}
            <div className="mt-3 pt-3 border-t border-[#282a2e]">
              <div className="flex items-center justify-between text-[11px] font-['Plus_Jakarta_Sans'] mb-1.5">
                <span className="text-[#4edea3] font-bold">
                  المحصل: {collectedAmount} د.أ ({paidPlayersCount}/{playerCount} دفعوا)
                </span>
                <span className="text-[#ffb4ab]">
                  متبقي: {remainingAmount} د.أ
                </span>
              </div>
              <div className="w-full h-2 bg-[#111317] rounded-full overflow-hidden border border-[#282a2e]">
                <div
                  className="h-full bg-gradient-to-r from-[#f59e0b] to-[#00a572] rounded-full transition-all duration-300"
                  style={{ width: `${collectionPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick CliQ Alias Bar */}
          <div className="p-3 rounded-xl bg-[#1e2024] border border-[#282a2e] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[#00a572] text-[20px]">
                qr_code
              </span>
              <div className="min-w-0 text-right">
                <div className="text-[10px] text-[#d8c3ad]">معرف كليك (CliQ) للاستلام:</div>
                <div className="font-['Space_Grotesk'] text-[13px] text-white font-bold truncate">
                  {cliqAlias}
                </div>
              </div>
            </div>
            <button
              onClick={handleCopyCliq}
              className="px-2.5 py-1.5 rounded-lg bg-[#282a2e] hover:bg-[#333539] text-[#ffc174] font-['Rubik'] text-[11px] font-bold border border-[#333539] flex items-center gap-1 cursor-pointer transition-colors active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-[15px]">
                {copiedCliq ? 'done' : 'content_copy'}
              </span>
              <span>{copiedCliq ? 'تم النسخ' : 'نسخ كليك'}</span>
            </button>
          </div>

          {/* Add custom player */}
          <form onSubmit={handleAddPlayer} className="flex gap-2">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="أضف لاعب حاضر بالملعب (مثلاً: يزن الصغير)"
              className="flex-1 bg-[#1e2024] border border-[#282a2e] rounded-xl px-3 py-2 text-[13px] text-white placeholder-[#8d725a] focus:outline-none focus:border-[#ffc174]"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-[#282a2e] hover:bg-[#333539] text-[#ffc174] font-['Rubik'] text-[12px] font-bold border border-[#333539] cursor-pointer shrink-0 flex items-center gap-1 active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>إضافة</span>
            </button>
          </form>

          {/* Players Roster Status Checklist */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-['Rubik'] text-[#d8c3ad] px-1">
              <span>كشف اللاعبين والتحصيل</span>
              <span>انقر للتعديل السريع</span>
            </div>

            {players.map((player) => (
              <div
                key={player.id}
                className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                  player.hasPaid
                    ? 'bg-[#18231e] border-[#00a572]/30'
                    : 'bg-[#231a1a] border-[#93000a]/30'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => handleTogglePaid(player.id)}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                      player.hasPaid
                        ? 'bg-[#00a572] text-[#00311f]'
                        : 'bg-[#93000a]/50 text-[#ffb4ab]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {player.hasPaid ? 'check' : 'close'}
                    </span>
                  </button>
                  <div className="min-w-0 text-right">
                    <span className="font-['Rubik'] text-[13px] text-white font-bold block truncate">
                      {player.name}
                    </span>
                    <span className="text-[10px] text-[#d8c3ad] font-['Plus_Jakarta_Sans']">
                      {player.hasPaid
                        ? `${player.paymentMethod === 'cliq' ? '📲 كليك' : player.paymentMethod === 'stars' ? '⭐ نجوم' : '💵 كاش'}`
                        : '⚠️ لم يدفع بعد'}
                    </span>
                  </div>
                </div>

                {/* Right: Payment Method Chooser or Quick Tag */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-['Space_Grotesk'] text-[12px] text-[#ffc174] font-bold ml-1">
                    {costPerPlayer} د.أ
                  </span>
                  {player.hasPaid ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleChangeMethod(player.id, 'cash')}
                        title="الدفع كاش"
                        className={`px-1.5 py-0.5 rounded text-[10px] font-['Space_Grotesk'] cursor-pointer ${
                          player.paymentMethod === 'cash' ? 'bg-[#ffc174] text-[#472a00] font-bold' : 'bg-[#282a2e] text-[#d8c3ad]'
                        }`}
                      >
                        كاش
                      </button>
                      <button
                        onClick={() => handleChangeMethod(player.id, 'cliq')}
                        title="الدفع عبر كليك"
                        className={`px-1.5 py-0.5 rounded text-[10px] font-['Space_Grotesk'] cursor-pointer ${
                          player.paymentMethod === 'cliq' ? 'bg-[#00a572] text-white font-bold' : 'bg-[#282a2e] text-[#d8c3ad]'
                        }`}
                      >
                        كليك
                      </button>
                      <button
                        onClick={() => handleChangeMethod(player.id, 'stars')}
                        title="الدفع بنجوم المحفظة"
                        className={`px-1.5 py-0.5 rounded text-[10px] font-['Space_Grotesk'] cursor-pointer ${
                          player.paymentMethod === 'stars' ? 'bg-[#f59e0b] text-[#472a00] font-bold' : 'bg-[#282a2e] text-[#d8c3ad]'
                        }`}
                      >
                        ⭐
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleTogglePaid(player.id)}
                      className="px-2 py-1 rounded bg-[#00a572]/20 hover:bg-[#00a572]/30 text-[#4edea3] text-[11px] font-bold font-['Rubik'] border border-[#00a572]/30 cursor-pointer"
                    >
                      تسديد الآن
                    </button>
                  )}
                </div>
              </div>
            ))}
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
            onClick={handleShareQatya}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#25d366] hover:bg-[#20ba5a] active:scale-95 text-[#003816] font-['Rubik'] text-[13px] font-extrabold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
            <span>إرسال تفاصيل القطية لقروب الواتساب 💬</span>
          </button>
        </div>
      </div>
    </div>
  );
};
