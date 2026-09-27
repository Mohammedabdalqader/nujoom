import React, { useState, useEffect } from 'react';
import { TabType, HighlightClip } from '../../types';
import { sfx } from '../../utils/audio';

interface HomeFeedScreenProps {
  onNavigateTab: (tab: TabType) => void;
  onOpenMatchDetails: () => void;
  onOpenMissingOne: () => void;
  onPlayClip: (clip: HighlightClip) => void;
  onShareWhatsApp: (text: string) => void;
  onOpenFriends?: () => void;
  onlineFriendsCount?: number;
  onOpenSquadSplitter?: () => void;
  onOpenGearChecklist?: () => void;
  onOpenCostSplitter?: () => void;
}

export const HomeFeedScreen: React.FC<HomeFeedScreenProps> = ({
  onNavigateTab,
  onOpenMatchDetails,
  onOpenMissingOne,
  onPlayClip,
  onShareWhatsApp,
  onOpenFriends,
  onlineFriendsCount = 3,
  onOpenSquadSplitter,
  onOpenGearChecklist,
  onOpenCostSplitter,
}) => {
  // Live Countdown state
  const [secondsLeft, setSecondsLeft] = useState(8073); // ~ 2h 14m 33s
  const [hasJoinedUrgent, setHasJoinedUrgent] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const featuredClips: HighlightClip[] = [
    {
      id: 'clip-1',
      title: 'هدف صاروخي من منتصف الملعب',
      authorName: 'محمود الشويكي',
      authorHandle: '@shwaiki.10',
      pitchName: 'جبل الحسين',
      duration: '00:28',
      thumbnailUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCfD6uWMY3i8puNqGcpTsU7ut9nIY7_CWzFd7_aE5_349UaIqEv3Cz_68fObYnxfSmFEZXCaaF3M424GdMcMFAtpS1QsTKhMrOw456e2ZSvvl7K1fX7wEk5JCqjj4O6lk2HbwvBK13rO5_nIgW_BDeIszK0Qr9dzzMF45oJGrJt13runqdbvW4gSdrhsqvFIDR4zW708eNTWgQho9UkUKsPrNazOKPdvMhmzglfso00aDiL3Vm7npI',
      tag: 'هدف صاروخي 🚀',
      likes: 248,
      views: '1.8k',
      timeAgo: 'أمس 10:45 م',
      videoType: 'goal',
    },
    {
      id: 'clip-2',
      title: 'تصدي خيالي بأطراف الأصابع فوق العارضة',
      authorName: 'أحمد العدلي',
      authorHandle: '@adli_gk',
      pitchName: 'ملعب الكرسي',
      duration: '00:19',
      thumbnailUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBkizd41Ju0Mgggd85iZbo9MMKfT-gw6isqsYo8D538F6HilE8RIuolEbEInWndDN080A0Bf-dT2CWxNTJ_R2ItdLDcrR9p_ZNmaHe9HzjxF7MVc1IRMiaPrtxgsCIL8PfpmlZxMG2Gwg65tPucBX3R6v1Ow-DGYGXleWx7Pg8PblhMTrEOM_xTBMHqk4PgI4g-Z9Z2abMIRTWClpa1s-l4POW9l5YSfRhZX1GKP0Hs-74Dlxn31vU',
      tag: 'تصدي خيالي 🧤',
      likes: 183,
      views: '1.2k',
      timeAgo: 'منذ ساعتين',
      videoType: 'save',
    },
  ];

  const handleQuickJoin = () => {
    sfx.playSuccess();
    setHasJoinedUrgent(true);
    setTimeout(() => {
      onOpenMissingOne();
    }, 400);
  };

  return (
    <div className="flex flex-col w-full pb-8 space-y-5">
      {/* 1. Player Welcome & Next Match Hero Card */}
      <section className="px-4 flex flex-col space-y-2">
        {/* Greeting & Quick Status */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="font-['Rubik'] text-[22px] text-[#e2e2e8] font-extrabold tracking-tight">
                أهلاً يا كابتن أحمد
              </h1>
              <span className="text-xl animate-bounce">👋</span>
            </div>
            <p className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#4edea3] inline-block animate-pulse"></span>
              <span>جاهز لمباراة الليلة؟ حارتك بانتظارك</span>
            </p>
          </div>

          {/* Quick Ranking Mini Badge */}
          <div
            onClick={() => onNavigateTab('player-profile-and-fifa-card')}
            className="bg-[#282a2e] hover:bg-[#37393e] cursor-pointer px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-sm transition-colors"
          >
            <span
              className="material-symbols-outlined text-[#ffc174] text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              military_tech
            </span>
            <div className="flex flex-col text-left">
              <span className="font-['Space_Grotesk'] text-[11px] text-[#d8c3ad] uppercase font-semibold">
                Beta Rating
              </span>
              <span className="font-['Space_Grotesk'] text-[16px] text-[#ffc174] font-bold leading-none">
                8.3
              </span>
            </div>
          </div>
        </div>

        {/* Countdown & Hero Match Card */}
        <div className="relative overflow-hidden rounded-xl bg-[#1a1c20] shadow-xl border border-[#282a2e]/60">
          {/* Background Pitch Image with Scrim */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity pointer-events-none"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuApGXPLjM7DLCJ_TcCA1vkDFAP1UnG8GbzPhbByQwApRHPjf1HPw0_6gyvatinPqyTb0QkNYvUrnlRSJG5IiWBI6BUWlTo_Ik6JU_LtjXnP-5KLUDRNoePjenoimk28emhjeKWB5swaPobTINwGBjrKq7tXaa-qmGBjAs5niPV8ox96PEGrdO6Q5uXRDroes1832RghKaz6kos5ldVeUWh0lYvr_QQ5toBQSXTvKKXEgjB46xwPxRM')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e12] via-[#1a1c20]/80 to-transparent pointer-events-none" />

          {/* Match Card Content */}
          <div className="relative z-10 p-4 flex flex-col space-y-4">
            {/* Card Top Bar: Pitch Tag & Bib Indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 bg-[#333539]/80 backdrop-blur-md px-2.5 py-1 rounded-full">
                <span className="material-symbols-outlined text-[#4edea3] text-[16px]">stadium</span>
                <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#e2e2e8] font-semibold">
                  ملعب جبل الحسين
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#111317]/80 backdrop-blur-md px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse"></span>
                <span className="font-['Space_Grotesk'] text-[11px] text-[#ffc174] font-bold uppercase tracking-wider">
                  مباراة رسمية
                </span>
              </div>
            </div>

            {/* Match Teams & Versus */}
            <div className="flex items-center justify-between py-1">
              <div className="flex flex-col items-center space-y-1">
                <div className="w-12 h-12 rounded-xl bg-[#37393e] flex items-center justify-center shadow-md border border-[#ffc174]/20">
                  <span className="font-['Space_Grotesk'] text-[16px] text-[#ffc174] font-black">
                    ح.ح
                  </span>
                </div>
                <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#e2e2e8] font-bold">
                  حي الحسين
                </span>
                <span className="font-['Space_Grotesk'] text-[11px] text-[#d8c3ad]">
                  القميص الأزرق
                </span>
              </div>

              {/* Live Tactical Countdown Ring */}
              <div className="flex flex-col items-center">
                <div className="font-['Space_Grotesk'] text-[11px] text-[#f59e0b] uppercase tracking-widest font-bold">
                  يبدأ خلال
                </div>
                <div className="font-['Space_Grotesk'] text-[24px] text-[#e2e2e8] font-extrabold tracking-tight drop-shadow-[0_0_12px_rgba(245,158,11,0.35)]">
                  {timeFormatted}
                </div>
                <div className="flex gap-2 text-[10px] text-[#d8c3ad] mt-0.5 font-['Plus_Jakarta_Sans']">
                  <span>ساعة</span>
                  <span>•</span>
                  <span>دقيقة</span>
                  <span>•</span>
                  <span>ثانية</span>
                </div>
              </div>

              <div className="flex flex-col items-center space-y-1">
                <div className="w-12 h-12 rounded-xl bg-[#37393e] flex items-center justify-center shadow-md border border-[#4edea3]/20">
                  <span className="font-['Space_Grotesk'] text-[16px] text-[#4edea3] font-black">
                    ن.ع
                  </span>
                </div>
                <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#e2e2e8] font-bold">
                  نسور العبدلي
                </span>
                <span className="font-['Space_Grotesk'] text-[11px] text-[#d8c3ad]">
                  القميص البرتقالي
                </span>
              </div>
            </div>

            {/* Action / View Details Button */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  sfx.playSuccess();
                  onOpenMatchDetails();
                }}
                className="flex-1 h-12 bg-[#f59e0b] hover:bg-[#ffc174] text-[#613b00] hover:text-[#472a00] font-['Rubik'] text-[18px] font-bold rounded-lg flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(245,158,11,0.25)] transition-all active:scale-[0.98] cursor-pointer"
              >
                <span>عرض تفاصيل المباراة والتشكيلة</span>
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>

              <button
                onClick={() =>
                  onShareWhatsApp(
                    '⚽ مباراة الليلة في نجوم الحارة: حي الحسين ضد نسور العبدلي على ملعب جبل الحسين الساعة 10:00 م. تعال شجع أو جهز حالك!'
                  )
                }
                aria-label="مشاركة تفاصيل المباراة"
                className="h-12 w-12 bg-[#282a2e] hover:bg-[#37393e] text-[#e2e2e8] rounded-lg flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">share</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MATCH DAY SMART TOOLKIT (قرعة متوازنة • عتاد وكرة منفوخة • قطية الملعب) */}
      <section className="px-4">
        <div className="rounded-2xl bg-gradient-to-r from-[#1c1f24] to-[#14161a] p-3 shadow-lg border border-[#ffc174]/20">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#ffc174] text-[18px]">
                sports_and_outdoors
              </span>
              <h2 className="font-['Rubik'] text-[14px] text-white font-bold">
                أدوات تنظيم مباراة اليوم
              </h2>
            </div>
            <span className="font-['Space_Grotesk'] text-[10px] text-[#ffc174] bg-[#f59e0b]/15 px-2 py-0.5 rounded-full font-bold">
              3 أدوات حارة
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Splitter Card */}
            <button
              onClick={onOpenSquadSplitter}
              className="p-2 rounded-xl bg-[#282a2e] hover:bg-[#333539] border border-[#37393e] hover:border-[#60a5fa]/40 flex flex-col items-center text-center transition-all cursor-pointer active:scale-95 group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#1d4ed8]/20 text-[#60a5fa] flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[18px]">balance</span>
              </div>
              <span className="font-['Rubik'] text-[11px] text-white font-bold leading-tight">
                قرعة التشكيلة
              </span>
              <span className="font-['Plus_Jakarta_Sans'] text-[9px] text-[#ffc174] mt-0.5">
                فرق متوازنة ⚖️
              </span>
            </button>

            {/* Gear Card */}
            <button
              onClick={onOpenGearChecklist}
              className="p-2 rounded-xl bg-[#282a2e] hover:bg-[#333539] border border-[#37393e] hover:border-[#4edea3]/40 flex flex-col items-center text-center transition-all cursor-pointer active:scale-95 group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#00a572]/20 text-[#4edea3] flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[18px]">sports_soccer</span>
              </div>
              <span className="font-['Rubik'] text-[11px] text-white font-bold leading-tight">
                عتاد المباراة
              </span>
              <span className="font-['Plus_Jakarta_Sans'] text-[9px] text-[#4edea3] mt-0.5">
                مين جايب الكورة؟ ⚽
              </span>
            </button>

            {/* Qatya Card */}
            <button
              onClick={onOpenCostSplitter}
              className="p-2 rounded-xl bg-[#282a2e] hover:bg-[#333539] border border-[#37393e] hover:border-[#f59e0b]/40 flex flex-col items-center text-center transition-all cursor-pointer active:scale-95 group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/20 text-[#ffc174] flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[18px]">payments</span>
              </div>
              <span className="font-['Rubik'] text-[11px] text-white font-bold leading-tight">
                قطية الملعب
              </span>
              <span className="font-['Plus_Jakarta_Sans'] text-[9px] text-[#ffc174] mt-0.5">
                حاسبة الحساب 💰
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Quick Action Bento Grid */}
      <section className="px-4">
        <div className="grid grid-cols-2 gap-2">
          {/* Book Pitch Card */}
          <button
            onClick={() => onNavigateTab('pitches-and-booking')}
            className="group relative overflow-hidden bg-[#1a1c20] hover:bg-[#1e2024] p-3.5 rounded-xl shadow-md transition-all flex flex-col justify-between h-32 text-right border border-[#282a2e]/40 cursor-pointer"
          >
            <div className="flex items-start justify-between w-full">
              <div className="w-10 h-10 rounded-lg bg-[#282a2e] flex items-center justify-center text-[#ffc174] group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[24px]">sports_soccer</span>
              </div>
              <span className="font-['Space_Grotesk'] text-[11px] bg-[#37393e] text-[#ffc174] px-2 py-0.5 rounded-full font-bold">
                عمان
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">احجز ملعب</span>
              <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad]">
                أفضل حلبات وملاعب العاصمة
              </span>
            </div>
          </button>

          {/* Missing One (Urgent Action Card) */}
          <button
            onClick={onOpenMissingOne}
            className="group relative overflow-hidden bg-[#1a1c20] hover:bg-[#1e2024] p-3.5 rounded-xl shadow-md transition-all flex flex-col justify-between h-32 text-right border border-[#93000a]/30 cursor-pointer"
          >
            <div className="flex items-start justify-between w-full">
              <div className="w-10 h-10 rounded-lg bg-[#93000a]/50 text-[#ffbcb7] flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[24px]">person_add</span>
              </div>
              <span className="flex items-center gap-1 font-['Space_Grotesk'] text-[11px] bg-[#93000a]/40 text-[#ffbcb7] px-2 py-0.5 rounded-full font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffb4ab] animate-ping"></span>
                <span>3 مطلوبين</span>
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
                  ناقصنا واحد
                </span>
                <span className="text-[#ffbcb7] text-xs font-black">!</span>
              </div>
              <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad] truncate">
                انضم لمباراة فاقدة لاعب
              </span>
            </div>
          </button>

          {/* Record Clip Action */}
          <button
            onClick={() => onNavigateTab('match-day-and-clips')}
            className="group relative overflow-hidden bg-[#1a1c20] hover:bg-[#1e2024] p-3.5 rounded-xl shadow-md transition-all flex flex-col justify-between h-28 text-right border border-[#282a2e]/40 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-[#282a2e] flex items-center justify-center text-[#4edea3] group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[22px]">videocam</span>
            </div>
            <div className="flex flex-col">
              <span className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">سجّل لقطة</span>
              <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad]">
                وثق أجمل أهداف الليلة
              </span>
            </div>
          </button>

          {/* Highlights Hub */}
          <button
            onClick={() => {
              if (featuredClips.length > 0) onPlayClip(featuredClips[0]);
            }}
            className="group relative overflow-hidden bg-[#1a1c20] hover:bg-[#1e2024] p-3.5 rounded-xl shadow-md transition-all flex flex-col justify-between h-28 text-right border border-[#282a2e]/40 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-[#282a2e] flex items-center justify-center text-[#ffb95f] group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[22px]">play_circle</span>
            </div>
            <div className="flex flex-col">
              <span className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">أبرز اللقطات</span>
              <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad]">
                المهارات وصواريخ الحارة
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* 3. Urgent "ناقصنا واحد" Spotlights */}
      <section className="flex flex-col space-y-2">
        <div className="px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffbcb7] text-[20px]">person_alert</span>
            <h2 className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
              ناقصنا واحد الآن
            </h2>
          </div>
          <button
            onClick={onOpenMissingOne}
            className="font-['Space_Grotesk'] text-[11px] text-[#ffc174] font-bold hover:underline cursor-pointer"
          >
            عرض الكل (3)
          </button>
        </div>

        {/* Urgent Match Booking Card */}
        <div className="px-4">
          <div className="bg-[#1a1c20] rounded-xl p-4 shadow-lg flex flex-col space-y-3 relative overflow-hidden border border-[#282a2e]">
            {/* Glowing accent bar */}
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-[#ffbcb7] via-[#f59e0b] to-[#4edea3]" />

            <div className="flex items-start justify-between gap-3 pt-1">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#282a2e] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#4edea3] text-[26px]">groups</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold truncate">
                      ملعب النزهة الدولي
                    </span>
                    <span className="bg-[#37393e] text-[#d8c3ad] font-['Space_Grotesk'] text-[11px] px-1.5 py-0.5 rounded">
                      5 ضد 5
                    </span>
                  </div>
                  <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad]">
                    الليلة • 8:30 مساءً (بعد ساعة ونصف)
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <span className="font-['Space_Grotesk'] text-[16px] text-[#4edea3] font-bold">
                  2.5 JOD
                </span>
                <span className="font-['Space_Grotesk'] text-[11px] text-[#d8c3ad]">
                  حصة اللاعب
                </span>
              </div>
            </div>

            {/* Position Wanted & Team Avatar Stack */}
            <div className="flex items-center justify-between bg-[#1e2024] px-3 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="font-['Space_Grotesk'] text-[11px] text-[#ffbcb7] bg-[#93000a]/40 px-2 py-0.5 rounded font-bold">
                  مطلوب: لاعب وسط هجومي
                </span>
              </div>
              <div className="flex items-center -space-x-2 space-x-reverse">
                <div className="w-7 h-7 rounded-full bg-[#37393e] flex items-center justify-center text-[10px] font-bold text-[#e2e2e8] ring-2 ring-[#1e2024]">
                  ع.م
                </div>
                <div className="w-7 h-7 rounded-full bg-[#333539] flex items-center justify-center text-[10px] font-bold text-[#e2e2e8] ring-2 ring-[#1e2024]">
                  س.ك
                </div>
                <div className="w-7 h-7 rounded-full bg-[#282a2e] flex items-center justify-center text-[10px] font-bold text-[#e2e2e8] ring-2 ring-[#1e2024]">
                  ي.ن
                </div>
                <div className="w-7 h-7 rounded-full bg-[#f59e0b] text-[#613b00] flex items-center justify-center text-[11px] font-black ring-2 ring-[#1e2024]">
                  +1
                </div>
              </div>
            </div>

            {/* Direct Join CTA */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleQuickJoin}
                className="flex-1 h-11 bg-[#4edea3] hover:bg-[#00a572] text-[#003824] hover:text-white font-['Rubik'] text-[18px] rounded-lg flex items-center justify-center gap-2 shadow-[0_2px_12px_rgba(78,222,163,0.2)] active:scale-95 transition-all cursor-pointer font-bold"
              >
                <span className="material-symbols-outlined text-[18px]">sports_handball</span>
                <span>{hasJoinedUrgent ? 'تم تأكيد طلبك!' : 'انضم الآن للتشكيلة'}</span>
              </button>

              <button
                onClick={() =>
                  onShareWhatsApp(
                    'يا شباب ناقصنا لاعب وسط هجومي بملعب النزهة الليلة 8:30 م (2.5 دينار). مين جاهز ينزل معنا؟'
                  )
                }
                aria-label="تواصل عبر واتساب"
                className="h-11 w-11 bg-[#282a2e] hover:bg-[#37393e] text-[#4edea3] flex items-center justify-center rounded-lg transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">chat</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Friends & Squad Live Presence Quick Bar */}
      {onOpenFriends && (
        <section className="px-4">
          <div
            onClick={() => {
              sfx.playClipBeep();
              onOpenFriends();
            }}
            className="group relative overflow-hidden bg-gradient-to-r from-[#1e2024] to-[#1a1c20] hover:to-[#282a2e] p-3.5 rounded-xl border border-[#282a2e] hover:border-[#4edea3]/40 shadow-md transition-all cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00a572]/20 border border-[#00a572]/30 flex items-center justify-center text-[#4edea3] shrink-0 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[22px]">group</span>
              </div>
              <div className="flex flex-col text-right">
                <div className="flex items-center gap-2">
                  <span className="font-['Rubik'] text-[15px] font-bold text-[#e2e2e8]">
                    شلة الحارة والأصدقاء
                  </span>
                  <span className="flex items-center gap-1 font-['Space_Grotesk'] text-[11px] text-[#4edea3] bg-[#00a572]/20 px-2 py-0.5 rounded-full font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
                    <span>{onlineFriendsCount} متصلين للعب</span>
                  </span>
                </div>
                <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad] mt-0.5">
                  أرسل دعوة سريعة أو أضف لاعبين جدد لمباراة اليوم
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[#ffc174] font-['Space_Grotesk'] text-[12px] font-bold shrink-0">
              <span className="hidden sm:inline">إدارة الشلة</span>
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </div>
          </div>
        </section>
      )}

      {/* 4. Trending Street Football Clips Carousel */}
      <section className="flex flex-col space-y-2">
        <div className="px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffc174] text-[22px]">
              local_fire_department
            </span>
            <h2 className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
              لقطات حارتنا المشتعلة 🔥
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('match-day-and-clips')}
            className="font-['Space_Grotesk'] text-[11px] text-[#ffc174] font-bold hover:underline cursor-pointer"
          >
            كل اللقطات
          </button>
        </div>

        {/* Clips Horizontal Scroll */}
        <div className="flex overflow-x-auto no-scrollbar px-4 gap-3 py-1 snap-x">
          {featuredClips.map((clip) => (
            <div
              key={clip.id}
              className="snap-start shrink-0 w-64 rounded-xl bg-[#1a1c20] overflow-hidden shadow-lg flex flex-col border border-[#282a2e]/60"
            >
              <div
                className="relative w-full h-80 bg-cover bg-center cursor-pointer group"
                style={{ backgroundImage: `url('${clip.thumbnailUrl}')` }}
                onClick={() => onPlayClip(clip)}
              >
                {/* Dark scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#111317] via-transparent to-black/40 group-hover:from-[#111317]/90 transition-colors" />

                {/* Top indicators */}
                <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
                  <span className="bg-[#111317]/80 backdrop-blur-md px-2 py-0.5 rounded-full text-[#e2e2e8] font-['Space_Grotesk'] text-[11px]">
                    {clip.duration}
                  </span>
                  <span className="bg-[#ffc174]/90 text-[#2a1700] px-2 py-0.5 rounded-full font-['Space_Grotesk'] text-[11px] font-bold">
                    {clip.tag}
                  </span>
                </div>

                {/* Floating Play Button */}
                <div className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-[#f59e0b]/90 text-[#613b00] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <span
                    className="material-symbols-outlined text-[28px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    play_arrow
                  </span>
                </div>

                {/* Bottom Player & Share Overlay */}
                <div className="absolute bottom-3 inset-x-3 flex items-end justify-between z-10">
                  <div className="flex flex-col">
                    <span className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold leading-tight drop-shadow-md">
                      {clip.authorName}
                    </span>
                    <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad] font-medium">
                      {clip.authorHandle} • {clip.pitchName}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShareWhatsApp(`🔥 شيك على لقطة ${clip.authorName} في نجوم الحارة: "${clip.title}"!`);
                    }}
                    aria-label="مشاركة عبر واتساب"
                    className="w-10 h-10 rounded-full bg-[#00a572] text-[#00311f] flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">share</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-[#1a1c20] flex items-center justify-between">
                <div className="flex items-center gap-3 text-[#d8c3ad] font-['Space_Grotesk'] text-[11px]">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-[#ffbcb7]">favorite</span>
                    <span>{clip.likes}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    <span>{clip.views}</span>
                  </span>
                </div>
                <span className="font-['Space_Grotesk'] text-[11px] text-[#ffc174] font-medium">
                  {clip.timeAgo}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Neighborhood Live Feed & Recent Results */}
      <section className="px-4 flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffc174] text-[20px]">rss_feed</span>
            <h2 className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
              نبض الحارة والنتائج
            </h2>
          </div>
          <span className="font-['Space_Grotesk'] text-[11px] text-[#d8c3ad]">مباشر الآن</span>
        </div>

        {/* Feed Items Stack */}
        <div className="bg-[#1a1c20] rounded-xl p-3 flex flex-col space-y-2 border border-[#282a2e]/60">
          {/* Activity Item 1 */}
          <div className="bg-[#1e2024] p-3 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#282a2e] flex items-center justify-center text-[#ffc174] font-black text-sm shrink-0">
              🏆
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-['Rubik'] text-[15px] text-[#e2e2e8] font-bold truncate">
                  ديربي جبل الحسين والصغير
                </span>
                <span className="font-['Space_Grotesk'] text-[11px] text-[#4edea3] font-bold">
                  انتهت
                </span>
              </div>
              <p className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad] truncate mt-0.5">
                فوز تاريخي لكتيبة الحسين بنتيجة <span className="text-[#ffc174] font-bold">5 - 3</span> بعد شوط ناري.
              </p>
            </div>
          </div>

          {/* Activity Item 2 */}
          <div className="bg-[#1e2024] p-3 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#282a2e] flex items-center justify-center text-[#4edea3] font-black text-sm shrink-0">
              ⚽
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-['Rubik'] text-[15px] text-[#e2e2e8] font-bold truncate">
                  هاتريك يا كابتن!
                </span>
                <span className="font-['Space_Grotesk'] text-[11px] text-[#d8c3ad]">
                  منذ 3 ساعات
                </span>
              </div>
              <p className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad] truncate mt-0.5">
                المهاجم <span className="text-[#e2e2e8] font-semibold">أبو نواس</span> يرفع تقييمه إلى 8.9 بعد ثلاثية في شباك اللويبدة.
              </p>
            </div>
          </div>

          {/* Activity Item 3 */}
          <div className="bg-[#1e2024] p-3 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#282a2e] flex items-center justify-center text-[#ffb95f] font-black text-sm shrink-0">
              ⚡
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-['Rubik'] text-[15px] text-[#e2e2e8] font-bold truncate">
                  تحدي الحارات للأسبوع القادم
                </span>
                <span className="font-['Space_Grotesk'] text-[11px] text-[#ffc174] font-bold">
                  تسجيل مفتوح
                </span>
              </div>
              <p className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad] truncate mt-0.5">
                بطولة قفص ماركا الليلي.. 8 فرق تتنافس على درع الحارة الذهبي.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
