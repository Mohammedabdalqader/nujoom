import React, { useState, useEffect } from 'react';
import { HighlightClip } from '../../types';
import { sfx } from '../../utils/audio';

interface MatchDayScreenProps {
  onPlayClip: (clip: HighlightClip) => void;
  onOpenQrModal: () => void;
  onOpenSquadSplitter?: () => void;
  onOpenGearChecklist?: () => void;
  onOpenCostSplitter?: () => void;
}

export const MatchDayScreen: React.FC<MatchDayScreenProps> = ({
  onPlayClip,
  onOpenQrModal,
  onOpenSquadSplitter,
  onOpenGearChecklist,
  onOpenCostSplitter,
}) => {
  // Live Match Clock (starting around 36:31 and ticking upwards)
  const [matchSeconds, setMatchSeconds] = useState(36 * 60 + 31);
  const [clipToastMessage, setClipToastMessage] = useState<string | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [votedCandidateId, setVotedCandidateId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState([
    {
      id: 'c1',
      rank: 1,
      name: 'أحمد النعيمات',
      stat: '1 هدف • 8.6',
      percent: 58,
      avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAbbwjt_ifz791XqZqmpBhFqzPZ4O1cmfn_nYWmvFzqqYvQiK7kppf28SZcpwimiDhKWisG73S15JwiF9558NmQ2fPtKBGt4QaADKqv3NP4IonAzGDAscn-fZU6yIpkZZLRjRlcWloZjRw1S3Vj5on5WA3qfo0S0D0FW7eh_iFzmxZEzR5SZzr8xUvMemY7XQx5mWD64lBee1SfXdqBT4xlNcSRPLj-LAYwYHKgwNq4IVYsJVh0U0o',
    },
    {
      id: 'c2',
      rank: 2,
      name: 'محمود خالد',
      stat: '1 أسيست • 8.1',
      percent: 27,
      avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDIVfkWerdRP4dTqGKhuNfnIrdDrt-1E491M5zte0RhRlYCPZoP_spOGBqeiPqnUmJSvcz30-BUZBjo44sG1Fn8_NRfjbY3DgBNdk0do3TlnPnk-U5Ll_ZzDa-dILOgSBd1A2426U8DCoSaTgKvHiqud0i9vcecYASsr8wANZ1ZDuPvRQgzbDPX4ikjK1DlPzT574sXxsnqRjsUpeqWva1C6Qzjf2mEY1Li55omD5hKZqYzLsvqfg0',
    },
    {
      id: 'c3',
      rank: 3,
      name: 'نور العورتاني',
      stat: '4 تصديات • 7.9',
      percent: 15,
      avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBZFlF9IvQPNYUw-5bRLUgbeoq99r2GmuGFUXOHsKkfZoGTlMvJJxzR03lWboB0NKNb8lWiP7jKcJD4kFNNTSyXWGVEajVCJXPVbnOiH15yKuZoEEq5LNCpf-nEVBRRn0dOmkgxdjfHPek6CoGS89RchpVD4Hl6-LkZNMoFi47Lxax0ymxKO63Kn9F3B4yakmFrsRo5Ic3X5YYVH-HepSAYYm5J8-PgM_AWCUMERWR-CbLGS3ohEXw',
    },
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setMatchSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const m = Math.floor(matchSeconds / 60);
  const s = matchSeconds % 60;
  const matchTimeFormatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  const triggerClip = (message: string) => {
    sfx.playClipBeep();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    setClipToastMessage(message);
    setTimeout(() => {
      setClipToastMessage(null);
    }, 3500);
  };

  const handleVote = (id: string) => {
    sfx.playSuccess();
    setVotedCandidateId(id);
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, percent: c.percent + 2 } : { ...c, percent: Math.max(1, c.percent - 1) }
      )
    );
  };

  const sampleMatchClip: HighlightClip = {
    id: 'live-clip-34',
    title: 'هدف خرافي من منتصف الملعب - أحمد النعيمات',
    authorName: 'أحمد النعيمات',
    authorHandle: '@nuaimat.9',
    pitchName: 'ملعب جبل الحسين',
    duration: '00:28',
    thumbnailUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD8rBPkB-ajF0ldqHYZw7Sg6FbmKAlOwUdNz3etNzCXQk1trhgrloAiuxtVpcNgcBmYq6d3hLfgR__vi_8dOTpbCpjttdlvVwjdvEs9Da_wOff9WAD-pTiU1df5L8k0bE2v3oJMXj4altl6Hra2IF_91L4JElOgUXCc-tdGhyb_RVpsHEncVG9C9DEBfZ10yzzqAaWM_hbqiHM5YDpsSquF4Q9MFnhVTaNJlPxlYLqgE_wA0-YttNs',
    tag: 'هدف موثق ⚽',
    likes: 124,
    views: '842',
    timeAgo: 'الدقيقة 34',
    videoType: 'goal',
  };

  return (
    <div className="flex flex-col w-full text-[#e2e2e8] select-none pb-12">
      {/* Live Floodlit Ambient Glow (Top Match Horizon) */}
      <div className="relative w-full overflow-hidden px-4 pt-2 pb-4">
        <div className="absolute -top-12 inset-x-10 h-32 bg-[#f59e0b]/20 blur-[50px] pointer-events-none rounded-full" />
        <div className="absolute top-4 left-6 w-24 h-24 bg-[#00a572]/15 blur-[40px] pointer-events-none rounded-full" />

        {/* Live Match Meta Bar */}
        <div className="relative z-10 flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffb4ab] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#93000a]"></span>
            </span>
            <span className="font-['Space_Grotesk'] text-[11px] text-[#ffb4ab] uppercase font-bold tracking-wider">
              مباشر • LIVE
            </span>
            <span className="text-[#534434] font-['Space_Grotesk'] text-[11px]">|</span>
            <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad] truncate">
              ملعب جبل الحسين، عمان
            </span>
          </div>

          {/* Live Match Clock HUD */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#282a2e] shadow-inner shrink-0 border border-[#333539]">
            <span className="material-symbols-outlined text-[#ffc174] text-[16px] animate-pulse">
              timer
            </span>
            <span className="font-['Space_Grotesk'] text-[16px] text-[#ffc174] tracking-wide font-bold">
              {matchTimeFormatted}
            </span>
          </div>
        </div>

        {/* Match Arena & Live Scoreboard HUD */}
        <div className="relative z-10 rounded-xl bg-[#1a1c20] shadow-xl p-4 overflow-hidden border border-[#282a2e]">
          {/* Pitch Texture Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#37393e]/10 via-transparent to-[#0c0e12]/80 pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between gap-2">
            {/* Team Blue */}
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-[#1d4ed8]/30 flex items-center justify-center shadow-lg relative mb-1.5 border border-[#3b82f6]/30">
                <span className="material-symbols-outlined text-[#60a5fa] text-[28px]">
                  shield
                </span>
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#2563eb] text-[9px] font-['Space_Grotesk'] text-white font-bold">
                  A
                </span>
              </div>
              <h3 className="font-['Rubik'] text-[18px] text-[#e2e2e8] truncate text-center w-full font-bold">
                الفريق الأزرق
              </h3>
              <span className="font-['Space_Grotesk'] text-[11px] text-[#4edea3]">
                حارة الحسين
              </span>
            </div>

            {/* Big Scoreline Display */}
            <div className="flex flex-col items-center px-4 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-['Space_Grotesk'] text-[38px] text-[#ffc174] font-black leading-none drop-shadow-[0_0_12px_rgba(255,193,116,0.35)]">
                  2
                </span>
                <span className="font-['Rubik'] text-[22px] text-[#534434] font-bold leading-none">
                  :
                </span>
                <span className="font-['Space_Grotesk'] text-[38px] text-[#e2e2e8] font-black leading-none">
                  1
                </span>
              </div>
              <div className="mt-2 px-2 py-0.5 rounded-full bg-[#1e2024] text-[#d8c3ad] font-['Space_Grotesk'] text-[11px]">
                الشوط الثاني • 7 ضد 7
              </div>
            </div>

            {/* Team Orange */}
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-[#f59e0b]/20 flex items-center justify-center shadow-lg relative mb-1.5 border border-[#f59e0b]/30">
                <span className="material-symbols-outlined text-[#ffc174] text-[28px]">
                  shield
                </span>
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#f59e0b] text-[9px] font-['Space_Grotesk'] text-[#613b00] font-bold">
                  B
                </span>
              </div>
              <h3 className="font-['Rubik'] text-[18px] text-[#e2e2e8] truncate text-center w-full font-bold">
                الفريق البرتقالي
              </h3>
              <span className="font-['Space_Grotesk'] text-[11px] text-[#d8c3ad]">
                حارة الصغير
              </span>
            </div>
          </div>

          {/* Quick Pitch State Footer */}
          <div className="relative z-10 mt-4 pt-1 flex items-center justify-between text-[12px] font-['Plus_Jakarta_Sans'] text-[#d8c3ad] border-t border-[#282a2e]/60">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#4edea3] text-[16px]">
                sports_soccer
              </span>
              <span>حكم الحارة: كابتن مروان الشيخ</span>
            </div>
            <div className="flex items-center gap-1 text-[#ffc174]">
              <span className="material-symbols-outlined text-[16px]">videocam</span>
              <span className="font-['Space_Grotesk'] text-[11px]">كاميرا الذكاء الاصطناعي شتغالة</span>
            </div>
          </div>
        </div>
      </div>

      {/* MATCH DAY TACTICAL TOOLKIT (3 Essential Neighborhood Match Tools) */}
      <div className="px-4 mb-4">
        <div className="rounded-2xl bg-gradient-to-br from-[#1e2024] to-[#14161a] p-3.5 shadow-xl border border-[#ffc174]/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#f59e0b]/5 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/20 text-[#ffc174] flex items-center justify-center border border-[#f59e0b]/30">
                <span className="material-symbols-outlined text-[20px]">
                  sports
                </span>
              </div>
              <div>
                <h3 className="font-['Rubik'] text-[15px] text-white font-bold leading-tight">
                  أدوات يوم المباراة الذكية
                </h3>
                <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad]">
                  تنظيم متكامل للقرعة، العتاد، وحساب الملعب
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#f59e0b]/20 text-[#ffc174] text-[10px] font-['Space_Grotesk'] font-bold border border-[#f59e0b]/30">
              3 أدوات سريعة
            </span>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-2">
            {/* Tool 1: Fair Squad Splitter & Coin Toss */}
            <button
              onClick={() => {
                sfx.playClipBeep();
                onOpenSquadSplitter?.();
              }}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#282a2e] hover:bg-[#333539] border border-[#37393e] hover:border-[#ffc174]/40 active:scale-95 transition-all text-center cursor-pointer group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-[#1d4ed8]/20 text-[#60a5fa] flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[22px]">balance</span>
              </div>
              <span className="font-['Rubik'] text-[12px] text-white font-bold leading-tight">
                قرعة التشكيلة
              </span>
              <span className="font-['Plus_Jakarta_Sans'] text-[10px] text-[#ffc174] mt-0.5">
                متوازنة + عملة 🪙
              </span>
            </button>

            {/* Tool 2: Gear Checklist ("مين جايب الكورة؟") */}
            <button
              onClick={() => {
                sfx.playClipBeep();
                onOpenGearChecklist?.();
              }}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#282a2e] hover:bg-[#333539] border border-[#37393e] hover:border-[#4edea3]/40 active:scale-95 transition-all text-center cursor-pointer group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-[#00a572]/20 text-[#4edea3] flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[22px]">sports_soccer</span>
              </div>
              <span className="font-['Rubik'] text-[12px] text-white font-bold leading-tight">
                عتاد المباراة
              </span>
              <span className="font-['Plus_Jakarta_Sans'] text-[10px] text-[#4edea3] mt-0.5">
                الكورة منفوخة ⚽
              </span>
            </button>

            {/* Tool 3: Pitch Qatya Splitter */}
            <button
              onClick={() => {
                sfx.playClipBeep();
                onOpenCostSplitter?.();
              }}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#282a2e] hover:bg-[#333539] border border-[#37393e] hover:border-[#f59e0b]/40 active:scale-95 transition-all text-center cursor-pointer group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/20 text-[#ffc174] flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[22px]">payments</span>
              </div>
              <span className="font-['Rubik'] text-[12px] text-white font-bold leading-tight">
                قطية الملعب
              </span>
              <span className="font-['Plus_Jakarta_Sans'] text-[10px] text-[#ffc174] mt-0.5">
                2.85 د.أ / لاعب 💰
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* QR Check-in & Pitch Access Barometer */}
      <div className="px-4 mb-4">
        <div className="rounded-xl bg-[#1e2024] p-4 shadow-md relative overflow-hidden border border-[#282a2e]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#00a572]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex items-start justify-between gap-2">
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="material-symbols-outlined text-[#4edea3] text-[20px]">
                  qr_code_scanner
                </span>
                <span className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
                  تسجيل حضور المباراة
                </span>
              </div>
              <p className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad] mb-3 leading-relaxed">
                امسح باركود الملعب لتسجيل الدخول واحتساب نقاط التقييم الرسمية (XP).
              </p>

              {/* Check-in Roster Stack */}
              <div className="flex items-center gap-2">
                <div className="flex items-center -space-x-2 -space-x-reverse">
                  <img
                    className="w-8 h-8 rounded-full object-cover shadow-sm bg-[#282a2e] ring-2 ring-[#1e2024]"
                    alt="Player 1"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBgt_dwHn9fut92to4azaDf4-yv8cZTp50ykkpwzaG3ibkKgBQoCjcdmWhHzo32cEalKT42b-tf66UatK-9APujy80fmTt3rEq5emwquxZ5Hwl3y0xI_8ZRG4GGpGtU1fuNiyQEZfrGQtPzbwVpTd-RLuQ0XPPz-4VazQ3085-N0hWaQ4DGEjJ_A6xWfqo82D0ALa4vXeHEH20rskgfKsOXndDIhu7ZR8u1jvdMlcPxXXBbgyixO2s"
                  />
                  <img
                    className="w-8 h-8 rounded-full object-cover shadow-sm bg-[#282a2e] ring-2 ring-[#1e2024]"
                    alt="Player 2"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCuQPDO_Cx_ujF39eKxH38deHFy1A4-rQj-u7bS5IYDsT3ZmYmiBq_7zpUH4PyHQyTDKw-7fGjsy3RIDrgEOxsrJdVJjEU0AdTiGfbheZNSpkm3j4_f7AQvUipusq6kyJxdq3Up4jtgaQJRT0HTbO0zepik4PQ4oBV_mlPNsg_dQey_mmngTK5pXSzyf_mmoi2YMMzCmznQRyhNYBK_BQ162PjKxcyiqiC2nFlf8BXIJOhIHsIVwBM"
                  />
                  <img
                    className="w-8 h-8 rounded-full object-cover shadow-sm bg-[#282a2e] ring-2 ring-[#1e2024]"
                    alt="Player 3"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDi0nOD11zpkXLzSXL_2NhPIoWAQcbnPa9Fkl7eG7EkbEantmDVGkoqqmjrq30eMEVxPLBk6iW_ua_jyRL9m9ISzETBRTSBGnL7Wg0ykzOMo9HrdpLw31qZZPBjDWCFVABoeiNs4SFizmKK0RaFOhBJBJY1a4npKikHheLCbUh8MUeJm6qWrpWW5uke3fXPa_ojW8-4vZ6ZmEJAOErvlsEKzbIwdXF-38hf5e2YZQpRB-ZiUFWv0_g"
                  />
                  <img
                    className="w-8 h-8 rounded-full object-cover shadow-sm bg-[#282a2e] ring-2 ring-[#1e2024]"
                    alt="Player 4"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC0HaJoenRy30BjbXrTWkIGxVai81-iFhBgV6RP25SOmGDikfRepFw3yAVoItOFhAO5dxpUMFkoQyiqEI8iyQ7LIKwB9FvLxVxqed4LGH4Tstst3Osgw7-vnodwLchxhv6fwPVVozMxjbgxdq89g7thM52dljj5sQmugFWpwNOJU2DKYXdYmQRNcdWU9E69Mkt7nq0n0PP5UAAL-0SnMBRourWr-ewXx8XBtpzGe2wUmiXXrhJZQr8"
                  />
                  <div className="w-8 h-8 rounded-full bg-[#00a572] text-[#00311f] flex items-center justify-center font-['Space_Grotesk'] text-[11px] font-bold shadow-md ring-2 ring-[#1e2024]">
                    +6
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="font-['Space_Grotesk'] text-[16px] text-[#4edea3] font-bold leading-none">
                    10 / 12 لاعب
                  </span>
                  <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad]">
                    باقي 2 على اكتمال النصاب
                  </span>
                </div>
              </div>
            </div>

            {/* QR Tactical Interactive Trigger Button */}
            <button
              onClick={() => {
                sfx.playClipBeep();
                onOpenQrModal();
              }}
              className="shrink-0 flex flex-col items-center justify-center p-3 rounded-lg bg-[#282a2e] text-[#e2e2e8] hover:bg-[#37393e] active:scale-95 transition-all shadow-md group cursor-pointer border border-[#333539]"
            >
              <div className="p-2 rounded bg-[#111317] mb-1 group-hover:bg-[#ffc174]/20 transition-colors">
                <span className="material-symbols-outlined text-[#ffc174] text-[28px]">
                  qr_code_2
                </span>
              </div>
              <span className="font-['Space_Grotesk'] text-[11px] text-[#ffc174] font-bold">
                كود الملعب
              </span>
            </button>
          </div>

          {/* Quick Checkin Alert */}
          {isCheckedIn && (
            <div className="mt-3 p-2.5 rounded-lg bg-[#00a572] text-[#00311f] flex items-center justify-between animate-fadeIn font-bold">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span className="font-['Plus_Jakarta_Sans'] text-[12px]">
                  تم تسجيل دخولك بنجاح! (+50 XP)
                </span>
              </div>
              <button onClick={() => setIsCheckedIn(false)} className="text-[#00311f]/80 cursor-pointer">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* THE CRITICAL MOBILE CLIP TRIGGER CONTROLLER (§6.6) */}
      <div className="px-4 mb-6">
        <div className="relative rounded-2xl bg-gradient-to-b from-[#282a2e] to-[#1e2024] p-4 shadow-2xl overflow-hidden flex flex-col items-center text-center border border-[#ffb4ab]/20">
          {/* Pitch Halogen Ambient Flare */}
          <div className="absolute -top-16 inset-x-0 h-40 bg-gradient-to-b from-[#93000a]/25 via-[#f59e0b]/15 to-transparent blur-2xl pointer-events-none" />

          {/* Header Label */}
          <div className="relative z-10 flex items-center justify-between w-full mb-4">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#ffb4ab] text-[20px] animate-pulse">
                emergency_recording
              </span>
              <span className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
                كنترول اللقطات المباشرة
              </span>
            </div>
            <span className="font-['Space_Grotesk'] text-[11px] text-[#ffc174] bg-[#f59e0b]/20 px-2 py-0.5 rounded-full font-bold">
              حفظ فوري 720p
            </span>
          </div>

          {/* HUGE TACTILE HERO CLIP BUTTON */}
          <div className="relative my-2 flex items-center justify-center">
            {/* Concentric Pulsing Radiance Rings */}
            <div className="absolute w-36 h-36 rounded-full bg-[#93000a]/30 animate-ping pointer-events-none" />
            <div className="absolute w-44 h-44 rounded-full bg-[#f59e0b]/10 pointer-events-none blur-md" />

            <button
              onClick={() => triggerClip('تم قص وحفظ آخر 30 ثانية بجودة 720p فوراً!')}
              className="relative z-10 w-32 h-32 rounded-full bg-gradient-to-tr from-[#991b1b] via-[#dc2626] to-[#f97316] text-white shadow-[0_0_35px_rgba(239,68,68,0.55)] flex flex-col items-center justify-center p-2 active:scale-90 transition-transform duration-150 group cursor-pointer focus:outline-none"
            >
              <div className="w-24 h-24 rounded-full bg-[#111317]/20 backdrop-blur-sm flex flex-col items-center justify-center p-1">
                <span className="material-symbols-outlined text-white text-[38px] drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform">
                  slow_motion_video
                </span>
                <span className="font-['Rubik'] text-[20px] text-white font-extrabold leading-tight mt-0.5 tracking-tight">
                  سجّل اللقطة!
                </span>
              </div>
            </button>
          </div>

          {/* Subtitle Description */}
          <div className="relative z-10 mt-4 flex flex-col items-center">
            <p className="font-['Rubik'] text-[18px] text-[#ffc174] font-bold">
              يحفظ آخر 30 ثانية فوراً
            </p>
            <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad] max-w-xs mt-0.5">
              شفت حركة مجنونة، كوبري، أو هدف؟ اكبس الزر وبتنزل بملفك فوراً!
            </span>
          </div>

          {/* Rapid Reaction Category Chips */}
          <div className="relative z-10 grid grid-cols-2 gap-2 w-full mt-4 pt-1">
            <button
              onClick={() => triggerClip('تم حفظ لقطة "هدف عالمي!" وتعيين وسم الهدف ⚽')}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-[#b45309]/20 hover:bg-[#b45309]/30 active:scale-95 transition-all text-[#ffc174] font-bold shadow-md cursor-pointer border border-[#b45309]/40"
            >
              <span className="material-symbols-outlined text-[20px] text-[#ffc174]">
                sports_soccer
              </span>
              <span className="font-['Rubik'] text-[14px]">⚽ هدف عالمي!</span>
            </button>

            <button
              onClick={() => triggerClip('تم حفظ لقطة المهارة وتثبيتها في موجز الحارة 🔥')}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-[#333539] hover:bg-[#37393e] active:scale-95 transition-all text-[#4edea3] font-bold shadow-md cursor-pointer border border-[#4edea3]/30"
            >
              <span className="material-symbols-outlined text-[20px] text-[#4edea3]">flare</span>
              <span className="font-['Rubik'] text-[14px]">🔥 مهارة أو كوبري</span>
            </button>
          </div>

          {/* Live Recorded Toast Alert */}
          {clipToastMessage && (
            <div className="absolute inset-x-4 bottom-4 z-30 p-3 rounded-xl bg-[#93000a] text-[#ffdad6] shadow-2xl flex items-center justify-between animate-bounce border border-[#ffb4ab]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px]">check_circle</span>
                <span className="font-['Plus_Jakarta_Sans'] text-[14px] font-bold">
                  {clipToastMessage}
                </span>
              </div>
              <span className="font-['Space_Grotesk'] text-[11px] uppercase bg-[#111317]/40 px-2 py-0.5 rounded font-bold">
                تمت
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Realtime Live Match Timeline */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffc174] text-[20px]">reorder</span>
            <h3 className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
              مجريات المباراة المباشرة
            </h3>
          </div>
          <span className="font-['Space_Grotesk'] text-[11px] text-[#d8c3ad] bg-[#1e2024] px-2 py-0.5 rounded-full border border-[#282a2e]">
            تحديث لحظي
          </span>
        </div>

        {/* Timeline Event Cards Stack */}
        <div className="flex flex-col gap-2">
          {/* Event 1: Recent Goal with Clip Available */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#1e2024] shadow-sm relative overflow-hidden border border-[#282a2e]">
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#ffc174]" />
            <div className="w-10 h-10 rounded-lg bg-[#f59e0b]/20 text-[#ffc174] flex items-center justify-center font-['Space_Grotesk'] text-[16px] font-bold shrink-0">
              34'
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-['Rubik'] text-[14px] text-[#ffc174] flex items-center gap-1 truncate font-bold">
                  <span>⚽ هدف خرافي من منتصف الملعب</span>
                </span>
                <span className="font-['Space_Grotesk'] text-[11px] text-[#4edea3] bg-[#282a2e] px-1.5 py-0.5 rounded">
                  الفريق الأزرق
                </span>
              </div>
              <p className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#e2e2e8] mt-0.5 font-bold">
                أحمد النعيمات (صناعة: يوسف أبو هاشم)
              </p>
              {/* Interactive Video Preview Pill */}
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => onPlayClip(sampleMatchClip)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#333539] hover:bg-[#37393e] cursor-pointer active:scale-95 transition-all text-[#e2e2e8] font-['Plus_Jakarta_Sans'] text-[12px] shadow"
                >
                  <span className="material-symbols-outlined text-[#ffc174] text-[16px]">
                    play_circle
                  </span>
                  <span>مشاهدة اللقطة (0:28 ث)</span>
                </button>
                <div className="flex items-center gap-1 text-[#d8c3ad] text-[11px] font-['Space_Grotesk']">
                  <span className="material-symbols-outlined text-[14px] text-[#ffb4ab]">
                    local_fire_department
                  </span>
                  <span>124 تفاعل</span>
                </div>
              </div>
            </div>
          </div>

          {/* Event 2: Save */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#1a1c20] shadow-sm relative overflow-hidden border border-[#282a2e]/60">
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#4edea3]" />
            <div className="w-10 h-10 rounded-lg bg-[#00a572]/20 text-[#4edea3] flex items-center justify-center font-['Space_Grotesk'] text-[16px] font-bold shrink-0">
              28'
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-['Rubik'] text-[14px] text-[#4edea3] flex items-center gap-1 truncate font-bold">
                  <span>🧤 تصدي إعجازي من الحارس</span>
                </span>
                <span className="font-['Space_Grotesk'] text-[11px] text-[#d8c3ad] bg-[#282a2e] px-1.5 py-0.5 rounded">
                  حارس البرتقالي
                </span>
              </div>
              <p className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#e2e2e8] mt-0.5">
                الحارس نور الدين عوررتاني ينقذ انفراد محقق
              </p>
            </div>
          </div>

          {/* Event 3: Substitution */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#1a1c20] shadow-sm relative overflow-hidden border border-[#282a2e]/60">
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#534434]" />
            <div className="w-10 h-10 rounded-lg bg-[#1e2024] text-[#d8c3ad] flex items-center justify-center font-['Space_Grotesk'] text-[16px] font-bold shrink-0">
              15'
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-['Rubik'] text-[14px] text-[#e2e2e8] flex items-center gap-1 truncate font-bold">
                  <span>🔄 تبديل تكتيكي</span>
                </span>
                <span className="font-['Space_Grotesk'] text-[11px] text-[#d8c3ad] bg-[#1e2024] px-1.5 py-0.5 rounded">
                  الفريق الأزرق
                </span>
              </div>
              <p className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad] mt-0.5">
                دخول عمر الشويكي / خروج ليث أبو رمان
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Post-Match MVP Voting Preview Card (§6.7) */}
      <div className="px-4 mb-2">
        <div className="relative rounded-2xl bg-[#282a2e] p-4 shadow-xl overflow-hidden border border-[#ffc174]/20">
          {/* MVP Ambient Gold Star Radiance */}
          <div className="absolute -top-10 -left-10 w-36 h-36 bg-[#f59e0b]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#f59e0b]/25 text-[#ffc174] flex items-center justify-center shadow">
                <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
              </div>
              <div>
                <h3 className="font-['Rubik'] text-[18px] text-[#ffc174] font-bold">
                  تصويت نجم الحارة (MVP Vote)
                </h3>
                <p className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad]">
                  يفتح التصويت النهائي مع صافرة النهاية
                </p>
              </div>
            </div>
            <span className="font-['Space_Grotesk'] text-[11px] px-2.5 py-1 rounded-full bg-[#f59e0b] text-[#472a00] font-bold shadow-sm">
              متبقي 13 د
            </span>
          </div>

          {/* Candidate Ballers Preview */}
          <div className="relative z-10 grid grid-cols-3 gap-2 my-3">
            {candidates.map((cand) => {
              const isVoted = votedCandidateId === cand.id;
              return (
                <button
                  key={cand.id}
                  onClick={() => handleVote(cand.id)}
                  className={`flex flex-col items-center p-2 rounded-xl transition-all text-center shadow-sm cursor-pointer border ${
                    isVoted
                      ? 'bg-[#37393e] border-[#ffc174] ring-2 ring-[#ffc174]/40 scale-105'
                      : 'bg-[#1e2024] hover:bg-[#333539] border-[#333539]'
                  }`}
                >
                  <div className="relative mb-1">
                    <img
                      className="w-14 h-14 rounded-full object-cover shadow-md bg-[#333539]"
                      alt={cand.name}
                      src={cand.avatarUrl}
                    />
                    <span className="absolute -top-1 -right-1 bg-[#ffc174] text-[#472a00] font-['Space_Grotesk'] text-[11px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {cand.rank}
                    </span>
                  </div>
                  <span className="font-['Rubik'] text-[12px] text-[#e2e2e8] font-bold truncate w-full">
                    {cand.name}
                  </span>
                  <span className="font-['Space_Grotesk'] text-[11px] text-[#ffc174] mt-0.5">
                    {cand.stat}
                  </span>
                  <div className="w-full bg-[#111317] rounded-full h-1.5 mt-1.5 overflow-hidden">
                    <div
                      className="bg-[#ffc174] h-full rounded-full transition-all duration-500"
                      style={{ width: `${cand.percent}%` }}
                    />
                  </div>
                  <span className="font-['Space_Grotesk'] text-[10px] text-[#d8c3ad] mt-0.5">
                    {cand.percent}% أصوات
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action Button for Post-Match Voting Alert */}
          <button
            onClick={() => {
              sfx.playSuccess();
              alert('تم تفعيل التنبيه! سنرسل لك إشعاراً فور إطلاق صافرة نهاية المباراة لبدء التصويت.');
            }}
            className="w-full py-2.5 mt-1 rounded-xl bg-[#1e2024] hover:bg-[#37393e] text-[#e2e2e8] flex items-center justify-center gap-2 font-['Rubik'] text-[14px] active:scale-95 transition-all shadow-md cursor-pointer border border-[#333539]"
          >
            <span className="material-symbols-outlined text-[#ffc174] text-[18px]">
              how_to_vote
            </span>
            <span>تنبيهي عند فتح صندوق التصويت</span>
          </button>
        </div>
      </div>

      {/* Neighborhood Camaraderie Community Footer Banner */}
      <div className="px-4 mt-4">
        <div className="p-4 rounded-xl bg-[#0c0e12] text-center flex flex-col items-center justify-center relative overflow-hidden shadow-inner border border-[#282a2e]/40">
          <div className="flex items-center gap-1.5 text-[#ffc174] mb-1">
            <span className="material-symbols-outlined text-[18px]">crown</span>
            <span className="font-['Rubik'] text-[12px] font-bold">
              حارتنا تجمعنا • نجوم الحارة
            </span>
          </div>
          <p className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad] leading-relaxed max-w-xs">
            المباراة مصورة بالكامل عبر كاميرات الملعب المعتمدة. كل الأهداف والمهارات تضاف تلقائياً إلى بطاقات اللاعبين بعد المراجعة.
          </p>
        </div>
      </div>
    </div>
  );
};
