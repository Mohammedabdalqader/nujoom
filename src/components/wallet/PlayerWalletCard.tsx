import React, { useState } from 'react';
import { PlayerWallet, WalletTransaction } from '../../types';
import { sfx } from '../../utils/audio';

interface PlayerWalletCardProps {
  wallet: PlayerWallet;
  onEarnStars: (amount: number, title: string, category: WalletTransaction['category']) => void;
  onNavigateToBooking: () => void;
}

export const PlayerWalletCard: React.FC<PlayerWalletCardProps> = ({
  wallet,
  onEarnStars,
  onNavigateToBooking,
}) => {
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [recentlyEarned, setRecentlyEarned] = useState<number | null>(null);

  const handleEarn = (amount: number, title: string, category: WalletTransaction['category']) => {
    sfx.playSuccess();
    setRecentlyEarned(amount);
    onEarnStars(amount, title, category);
    setTimeout(() => {
      setRecentlyEarned(null);
    }, 2500);
  };

  const cashEquivalent = (wallet.balance / 10).toFixed(2);

  return (
    <div className="flex flex-col gap-3">
      {/* Main Digital Wallet Card */}
      <div className="relative rounded-2xl bg-gradient-to-b from-[#241c12] via-[#1a1c20] to-[#0c0e12] p-4 shadow-[0_12px_32px_rgba(0,0,0,0.6),0_0_24px_rgba(245,158,11,0.2)] border border-[#ffc174]/40 overflow-hidden">
        {/* Ambient gold glow */}
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 w-56 h-36 bg-[#f59e0b]/20 rounded-full blur-[60px] pointer-events-none" />

        {/* Card Top: Brand and Tier */}
        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-[#332b1d]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#ffc174]/20 border border-[#ffc174]/40 flex items-center justify-center text-[#ffc174] shadow-sm">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                account_balance_wallet
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <h3 className="font-['Rubik'] text-[16px] font-bold text-[#e2e2e8]">
                  محفظة نجوم الحارة
                </h3>
                <span className="font-['Space_Grotesk'] text-[10px] bg-[#f59e0b] text-[#472a00] font-black px-1.5 py-0.2 rounded-full">
                  PRO
                </span>
              </div>
              <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad]">
                العملة الرقمية المعتمدة لحجز الملاعب
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="font-['Space_Grotesk'] text-[11px] text-[#ffc174] font-bold bg-[#37393e]/80 border border-[#ffc174]/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span>{wallet.tier}</span>
              <span className="text-xs">⭐⭐⭐</span>
            </span>
          </div>
        </div>

        {/* Card Body: Big Balance Display */}
        <div className="relative z-10 py-4 flex flex-col items-center justify-center text-center">
          <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad] font-medium">
            رصيدك الحالي من عملات نجوم
          </span>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[28px]">⭐</span>
            <span className="font-['Space_Grotesk'] text-[42px] font-black text-[#ffc174] leading-none tracking-tight drop-shadow-[0_2px_12px_rgba(245,158,11,0.4)]">
              {wallet.balance.toLocaleString()}
            </span>
            <span className="font-['Rubik'] text-[16px] text-[#ffddb8] font-bold">
              نجمة
            </span>
          </div>

          {recentlyEarned && (
            <div className="mt-1 px-3 py-0.5 rounded-full bg-[#00a572] text-[#00311f] font-['Space_Grotesk'] text-[12px] font-black animate-bounce">
              +{recentlyEarned} نجمة أضيفت إلى محفظتك! 🎉
            </div>
          )}

          {/* Cash Equivalent & Exchange Rate Note */}
          <div className="mt-2 flex items-center gap-2 bg-[#14161a] border border-[#ffc174]/30 px-3 py-1.5 rounded-xl">
            <span className="material-symbols-outlined text-[#4edea3] text-[16px]">payments</span>
            <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#e2e2e8]">
              تساوي خصماً بقيمة: <strong className="text-[#4edea3] font-['Space_Grotesk'] font-bold">{cashEquivalent} د.أ</strong>
            </span>
            <span className="text-[#534434]">•</span>
            <span className="font-['Space_Grotesk'] text-[10px] text-[#d8c3ad]">
              (10 نجوم = 1 د.أ)
            </span>
          </div>
        </div>

        {/* Quick Wallet CTA Actions */}
        <div className="relative z-10 grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => {
              sfx.playClipBeep();
              onNavigateToBooking();
            }}
            className="py-2.5 px-3 rounded-xl bg-[#00a572] hover:bg-[#10B981] text-[#00311f] font-['Rubik'] text-[14px] font-bold flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(0,165,114,0.3)] transition-all active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">stadium</span>
            <span>احجز ملعبك بالنجوم</span>
          </button>

          <button
            onClick={() => {
              sfx.playClipBeep();
              setShowHistoryModal(true);
            }}
            className="py-2.5 px-3 rounded-xl bg-[#282a2e] hover:bg-[#333539] text-[#e2e2e8] font-['Rubik'] text-[14px] font-bold flex items-center justify-center gap-1.5 border border-[#333539] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] text-[#ffc174]">receipt_long</span>
            <span>سجل المعاملات</span>
          </button>
        </div>
      </div>

      {/* Ways to Earn Stars (Interactive Task Cards) */}
      <div className="rounded-xl bg-[#1e2024] p-3.5 border border-[#282a2e] flex flex-col gap-2.5 shadow-md">
        <div className="flex items-center justify-between pb-1 border-b border-[#282a2e]/60">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#ffc174] text-[20px]">military_tech</span>
            <h4 className="font-['Rubik'] text-[15px] font-bold text-[#e2e2e8]">
              كيف تكسب عملات نجوم إضافية؟
            </h4>
          </div>
          <span className="font-['Space_Grotesk'] text-[11px] text-[#4edea3] font-bold">
            اكسب والعب مجاناً
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Tournament Win */}
          <div className="bg-[#1a1c20] p-2.5 rounded-xl border border-[#ffc174]/20 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-xl">🏆</span>
              <span className="font-['Space_Grotesk'] text-[12px] bg-[#f59e0b]/20 text-[#ffc174] font-black px-1.5 py-0.5 rounded">
                +150 ⭐
              </span>
            </div>
            <div className="mt-2">
              <span className="font-['Rubik'] text-[13px] font-bold text-[#e2e2e8] block">
                الفوز ببطولة الحارة
              </span>
              <span className="font-['Plus_Jakarta_Sans'] text-[10px] text-[#d8c3ad] block mt-0.5">
                تُمنح تلقائياً لأبطال الدوري
              </span>
            </div>
            <button
              onClick={() => handleEarn(150, 'مكافأة الفوز ببطولة قفص ماركا 🏆', 'tournament_win')}
              className="mt-2 py-1 px-2 rounded-lg bg-[#282a2e] hover:bg-[#ffc174] text-[#ffc174] hover:text-[#472a00] font-['Space_Grotesk'] text-[11px] font-bold transition-all cursor-pointer text-center"
            >
              محاكاة الفوز (+150)
            </button>
          </div>

          {/* MVP Award */}
          <div className="bg-[#1a1c20] p-2.5 rounded-xl border border-[#4edea3]/20 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-xl">🥇</span>
              <span className="font-['Space_Grotesk'] text-[12px] bg-[#00a572]/20 text-[#4edea3] font-black px-1.5 py-0.5 rounded">
                +50 ⭐
              </span>
            </div>
            <div className="mt-2">
              <span className="font-['Rubik'] text-[13px] font-bold text-[#e2e2e8] block">
                رجل المباراة (MVP)
              </span>
              <span className="font-['Plus_Jakarta_Sans'] text-[10px] text-[#d8c3ad] block mt-0.5">
                أعلى أصوات بتصويت الحارة
              </span>
            </div>
            <button
              onClick={() => handleEarn(50, 'مكافأة درع رجل المباراة MVP 🥇', 'mvp_award')}
              className="mt-2 py-1 px-2 rounded-lg bg-[#282a2e] hover:bg-[#4edea3] text-[#4edea3] hover:text-[#003824] font-['Space_Grotesk'] text-[11px] font-bold transition-all cursor-pointer text-center"
            >
              استلام درع MVP (+50)
            </button>
          </div>

          {/* Match Play */}
          <div className="bg-[#1a1c20] p-2.5 rounded-xl border border-[#282a2e] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-xl">⚽</span>
              <span className="font-['Space_Grotesk'] text-[12px] bg-[#37393e] text-[#e2e2e8] font-black px-1.5 py-0.5 rounded">
                +25 ⭐
              </span>
            </div>
            <div className="mt-2">
              <span className="font-['Rubik'] text-[13px] font-bold text-[#e2e2e8] block">
                لعب مباراة موثقة
              </span>
              <span className="font-['Plus_Jakarta_Sans'] text-[10px] text-[#d8c3ad] block mt-0.5">
                مسح باركود الملعب عند الحضور
              </span>
            </div>
            <button
              onClick={() => handleEarn(25, 'مكافأة خوض مباراة جبل الحسين ⚽', 'match_play')}
              className="mt-2 py-1 px-2 rounded-lg bg-[#282a2e] hover:bg-[#37393e] text-[#d8c3ad] hover:text-white font-['Space_Grotesk'] text-[11px] font-bold transition-all cursor-pointer text-center"
            >
              تسجيل حضور (+25)
            </button>
          </div>

          {/* Hat-trick or Skill */}
          <div className="bg-[#1a1c20] p-2.5 rounded-xl border border-[#282a2e] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-xl">🎯</span>
              <span className="font-['Space_Grotesk'] text-[12px] bg-[#37393e] text-[#ffc174] font-black px-1.5 py-0.5 rounded">
                +30 ⭐
              </span>
            </div>
            <div className="mt-2">
              <span className="font-['Rubik'] text-[13px] font-bold text-[#e2e2e8] block">
                تسجيل هاتريك ناري
              </span>
              <span className="font-['Plus_Jakarta_Sans'] text-[10px] text-[#d8c3ad] block mt-0.5">
                توثيق 3 أهداف بنفس اللقاء
              </span>
            </div>
            <button
              onClick={() => handleEarn(30, 'مكافأة تسجيل هاتريك تاريخي 🎯', 'match_play')}
              className="mt-2 py-1 px-2 rounded-lg bg-[#282a2e] hover:bg-[#ffc174] text-[#ffc174] hover:text-[#472a00] font-['Space_Grotesk'] text-[11px] font-bold transition-all cursor-pointer text-center"
            >
              توثيق هاتريك (+30)
            </button>
          </div>
        </div>
      </div>

      {/* Transaction History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-sm rounded-2xl bg-[#1e2024] p-4 shadow-2xl border border-[#ffc174]/40 flex flex-col space-y-3 max-h-[85vh] overflow-hidden text-right">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#282a2e] pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffc174] text-[22px]">
                  receipt_long
                </span>
                <h3 className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
                  سجل معاملات محفظة نجوم
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-[#282a2e] hover:bg-[#333539] flex items-center justify-center text-[#e2e2e8] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Balance banner */}
            <div className="bg-[#1a1c20] p-3 rounded-xl border border-[#282a2e] flex items-center justify-between shrink-0">
              <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad]">
                الرصيد المتاح حالياً:
              </span>
              <span className="font-['Space_Grotesk'] text-[18px] text-[#ffc174] font-black">
                {wallet.balance} ⭐
              </span>
            </div>

            {/* Transactions List */}
            <div className="flex flex-col space-y-2 overflow-y-auto no-scrollbar py-1 flex-1">
              {wallet.transactions.map((tx) => {
                const isEarn = tx.type === 'earn';
                return (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-xl bg-[#1a1c20] border border-[#282a2e] flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm ${
                          isEarn
                            ? 'bg-[#00a572]/20 text-[#4edea3]'
                            : 'bg-[#f59e0b]/20 text-[#ffc174]'
                        }`}
                      >
                        {isEarn ? '⭐' : '🏟️'}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-['Rubik'] text-[13px] text-[#e2e2e8] font-bold truncate">
                          {tx.title}
                        </span>
                        <span className="font-['Space_Grotesk'] text-[10px] text-[#d8c3ad]">
                          {tx.date}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span
                        className={`font-['Space_Grotesk'] text-[14px] font-black ${
                          isEarn ? 'text-[#4edea3]' : 'text-[#ffb4ab]'
                        }`}
                      >
                        {isEarn ? `+${tx.amount}` : `-${tx.amount}`} ⭐
                      </span>
                      <span className="font-['Plus_Jakarta_Sans'] text-[10px] text-[#d8c3ad]">
                        {isEarn ? 'مكتسبة' : 'حجز ملعب'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowHistoryModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#282a2e] hover:bg-[#333539] text-[#e2e2e8] font-['Rubik'] text-[14px] font-bold cursor-pointer shrink-0 mt-2"
            >
              إغلاق السجل
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
