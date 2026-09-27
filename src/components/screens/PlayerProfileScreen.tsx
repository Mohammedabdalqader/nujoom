import React, { useState, useRef } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { HighlightClip, PlayerWallet, WalletTransaction, FriendPlayer } from '../../types';
import { sfx } from '../../utils/audio';
import { useTheme } from '../../context/ThemeContext';
import { PlayerWalletCard } from '../wallet/PlayerWalletCard';

interface PlayerProfileScreenProps {
  onPlayClip: (clip: HighlightClip) => void;
  onShareWhatsApp: (text: string) => void;
  wallet: PlayerWallet;
  onEarnStars: (amount: number, title: string, category: WalletTransaction['category']) => void;
  onNavigateToBooking: () => void;
  friends?: FriendPlayer[];
  onOpenFriends?: () => void;
  onInviteFriend?: (friend: FriendPlayer) => void;
}

interface ProgressDataPoint {
  month: string;
  monthEn: string;
  xp: number;
  elo: number;
  goals: number;
  assists: number;
  matches: number;
}

const progressionData: ProgressDataPoint[] = [
  { month: 'نيسان', monthEn: 'Apr', xp: 1150, elo: 7.1, goals: 7, assists: 3, matches: 6 },
  { month: 'أيار', monthEn: 'May', xp: 1480, elo: 7.4, goals: 9, assists: 4, matches: 8 },
  { month: 'حزيران', monthEn: 'Jun', xp: 1820, elo: 7.8, goals: 12, assists: 5, matches: 9 },
  { month: 'تموز', monthEn: 'Jul', xp: 2150, elo: 8.0, goals: 14, assists: 4, matches: 10 },
  { month: 'آب', monthEn: 'Aug', xp: 2490, elo: 8.2, goals: 11, assists: 3, matches: 7 },
  { month: 'أيلول', monthEn: 'Sep', xp: 2840, elo: 8.4, goals: 14, assists: 5, matches: 8 },
];

export const PlayerProfileScreen: React.FC<PlayerProfileScreenProps> = ({
  onPlayClip,
  onShareWhatsApp,
  wallet,
  onEarnStars,
  onNavigateToBooking,
  friends = [],
  onOpenFriends,
  onInviteFriend,
}) => {
  const { theme, setTheme } = useTheme();
  const cardRef = useRef<HTMLDivElement>(null);
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});
  const [copiedCode, setCopiedCode] = useState(false);
  const [chartView, setChartView] = useState<'xp' | 'goals' | 'combined'>('xp');

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotX = (y / rect.height) * -12;
    const rotY = (x / rect.width) * 12;

    setTiltStyle({
      transform: `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.02, 1.02, 1.02)`,
      transition: 'transform 0.08s ease-out',
    });
  };

  const handlePointerLeave = () => {
    setTiltStyle({
      transform: 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.4s ease-out',
    });
  };

  const handleShareCard = () => {
    sfx.playSuccess();
    const message =
      '🔥 شيك على بطاقة أحمد المالكي (87 ST) في منصة نجوم الحارة!\n⭐ التقييم: 8.4 | المركز: مهاجم\n📍 حارة: عمان - جبل الحسين\nتحدانا بمباراتك الجاية وحمّل تطبيق نجوم الحارة.';
    onShareWhatsApp(message);
  };

  const handleCopyCode = () => {
    sfx.playClipBeep();
    navigator.clipboard?.writeText('NJM-8701');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const highlight1: HighlightClip = {
    id: 'hl-1',
    title: 'هدف مقصية خيالي في الدقيقة الأخيرة',
    authorName: 'أحمد المالكي',
    authorHandle: '@malki.87',
    pitchName: 'ملعب الكرسي',
    duration: '00:24',
    thumbnailUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD8rBPkB-ajF0ldqHYZw7Sg6FbmKAlOwUdNz3etNzCXQk1trhgrloAiuxtVpcNgcBmYq6d3hLfgR__vi_8dOTpbCpjttdlvVwjdvEs9Da_wOff9WAD-pTiU1df5L8k0bE2v3oJMXj4altl6Hra2IF_91L4JElOgUXCc-tdGhyb_RVpsHEncVG9C9DEBfZ10yzzqAaWM_hbqiHM5YDpsSquF4Q9MFnhVTaNJlPxlYLqgE_wA0-YttNs',
    tag: 'هدف موثق ⚽',
    likes: 842,
    views: '3.2k',
    opponent: 'ضد نمور الجبل',
    timeAgo: 'الأسبوع الماضي',
    videoType: 'goal',
  };

  const highlight2: HighlightClip = {
    id: 'hl-2',
    title: 'تمريرة حاسمة بالمقاس ضد حارة النزهة',
    authorName: 'أحمد المالكي',
    authorHandle: '@malki.87',
    pitchName: 'ملعب جبل الحسين',
    duration: '00:18',
    thumbnailUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBkzJEgXAgGIhBB1LL5L7HombUSdo1PhFVnc50GLrXlj9FNLsXU4-ORr4CF78ZW0vc9isA5847jm39BIbMJvHYvb2oxMEfpNxusSZkKp9bZUEUkahs1a2uPmuZu93Zqu20S_qQRr58DZLqWij60fgrh8rGkjadueLAs8bepVXOPrSi1V3F1XPHWoGw9STccHzqHak1TZLdP8tPu1zjRzhJu3t7wN6Bb-R4hD-WpOAAzEJo4lOImcCE',
    tag: 'تمريرة حاسمة 👟',
    likes: 419,
    views: '1.8k',
    opponent: 'صناعة هدف الفوز',
    timeAgo: 'قبل 4 أيام',
    videoType: 'skill',
  };

  return (
    <div className="flex flex-col w-full pb-10">
      {/* Ambient Floodlight Glow Layers */}
      <div className="fixed top-20 right-[-10%] w-72 h-72 rounded-full bg-[#ffc174]/10 blur-[100px] pointer-events-none -z-10" />
      <div className="fixed top-80 left-[-15%] w-80 h-80 rounded-full bg-[#00a572]/10 blur-[110px] pointer-events-none -z-10" />

      {/* Profile Quick Header & Badges */}
      <section className="px-4 pt-2 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#282a2e] text-[#4edea3] font-['Space_Grotesk'] text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse"></span>
              حساب موثق • عمان (عام)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1e2024] text-[#d8c3ad] font-['Space_Grotesk'] text-[11px]">
              <span className="material-symbols-outlined text-[14px] text-[#ffc174]">verified</span>
              لاعب معتمد
            </span>
          </div>

          <button
            onClick={() => {
              sfx.playClipBeep();
              alert('إعدادات الملف الشخصي وتخصيص بطاقة FIFA قريباً في التحديث القادم!');
            }}
            aria-label="تعديل الملف"
            className="w-9 h-9 rounded-full bg-[#282a2e] text-[#e2e2e8] flex items-center justify-center hover:bg-[#37393e] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
          </button>
        </div>
      </section>

      {/* Section 1: The Iconic FIFA-Grade Onyx & Gold Street Card */}
      <section className="px-4 pt-3 flex flex-col items-center">
        {/* FIFA Card Container with Tactile Glass Depth */}
        <div
          ref={cardRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          style={tiltStyle}
          className="fifa-card relative w-full max-w-[340px] rounded-xl overflow-hidden bg-gradient-to-b from-[#2a2215] via-[#1a1c20] to-[#0c0e12] p-[2px] shadow-[0_16px_36px_rgba(0,0,0,0.6),0_0_28px_rgba(245,158,11,0.22)] select-none cursor-grab active:cursor-grabbing border border-[#ffc174]/40"
        >
          {/* Card Inner Shell */}
          <div className="relative w-full rounded-[10px] bg-gradient-to-b from-[#1c1812] via-[#14161a] to-[#0c0e12] overflow-hidden p-4 flex flex-col">
            {/* Background Pattern & Atmospheric Pitch Flare */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffc174_1px,transparent_1px)] [background-size:14px_14px] pointer-events-none" />
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-32 bg-[#ffc174]/20 blur-[50px] pointer-events-none" />

            {/* Card Header: Rating, Position, Crown Logo & National Identity */}
            <div className="relative z-10 flex items-start justify-between">
              <div className="flex flex-col items-center">
                <span className="font-['Rubik'] text-[28px] font-black text-[#ffc174] leading-none tracking-tighter drop-shadow-[0_2px_8px_rgba(245,158,11,0.4)]">
                  87
                </span>
                <span className="font-['Space_Grotesk'] text-[11px] text-[#ffddb8] font-bold tracking-widest mt-0.5">
                  ST
                </span>
                <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad] font-medium">
                  مهاجم
                </span>
                <span className="text-[18px] mt-1.5 leading-none" title="الأردن">
                  🇯🇴
                </span>
              </div>

              {/* Crest Brand Emblem */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-lg bg-[#282a2e]/70 p-1 flex items-center justify-center shadow-inner border border-[#ffc174]/30">
                  <img
                    alt="Nujoom Al-Hara Crown Logo"
                    className="w-full h-full object-contain"
                    src="https://lh3.googleusercontent.com/aida/AEtjO1VpeodpkjizIawK_q88bViNa5306ZtEWQHSF83S7Wt_ZDnpKF_cKsMI2wsrcXfr-ZZbT2mwrUBYTpftjIkbCdAS9oDJvt8-0A_7bEgw3graXIB8cEd6Xja5f5CpiEY5IH5UOyGos51cIdO5z3beNGYzOc7_rn9rcerIoJ_3x3nTZJdtrkRCD2m7VdS5JTzinGjL5W_mPk0EUXotszkIHbNbHoGfayJyEoENerpBIdkiFe8lSJHcvCtt"
                  />
                </div>
                <span className="font-['Space_Grotesk'] text-[9px] uppercase tracking-widest text-[#ffc174]/80 font-bold">
                  STREET MVP
                </span>
              </div>
            </div>

            {/* Player Cutout Hero Area */}
            <div className="relative z-10 -mt-2 flex flex-col items-center">
              <div className="relative w-36 h-36 rounded-full p-1 bg-gradient-to-b from-[#ffc174] via-[#f59e0b]/40 to-transparent shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
                <img
                  alt="أحمد المالكي"
                  className="w-full h-full object-cover rounded-full"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3GdTY_aiB9ZkqL0Sv6dLoERK1pwPGFB8ecFpLSuGjjpH9RQCfwvrvYfnBa8M6BeSCuubVQOQk8SLQD7Gx82re7DDUTAAkrMQL2f4eAfx0u1J_eInvjCRhnKEmV5P_moaD9rGV72RCRWidVlgqTHdk_KuDpqEdX2N3e42G9s_EI6t98v8rR9AGHBdxFIDyhD230HU3SRm51yNZTk1-i3H9zbCO2eDnnRyBSrLvGVtze_dBl3MOUVE"
                />
                <span
                  className="absolute bottom-0 right-2 w-7 h-7 rounded-full bg-[#f59e0b] text-[#613b00] flex items-center justify-center shadow-lg border border-[#111317]"
                  title="هيكل الشارع الذهبي"
                >
                  <span className="material-symbols-outlined text-[16px]">military_tech</span>
                </span>
              </div>

              {/* Name & Neighborhood Tag */}
              <div className="mt-2.5 text-center flex flex-col items-center">
                <div className="flex items-center gap-1.5">
                  <span className="font-['Rubik'] text-[22px] text-[#e2e2e8] font-extrabold tracking-tight">
                    أحمد المالكي
                  </span>
                  <span
                    className="material-symbols-outlined text-[#4edea3] text-[18px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-['Space_Grotesk'] text-[11px] text-[#ffc174] font-bold tracking-wider uppercase">
                    NUJOOM AL-HARA
                  </span>
                  <span className="w-1 h-1 rounded-full bg-[#a08e7a]"></span>
                  <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad]">
                    عمان • جبل الحسين
                  </span>
                </div>
              </div>
            </div>

            {/* Gold Horizontal Tactical Divider */}
            <div className="relative z-10 w-full my-3 h-[1px] bg-gradient-to-r from-transparent via-[#ffc174]/50 to-transparent" />

            {/* FIFA 6 Core Attributes Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-1 relative z-10">
              {/* Col Right (RTL: Pac, Sho, Pas) */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between bg-[#1e2024]/60 px-2.5 py-1.5 rounded-lg border border-[#282a2e]/40">
                  <span className="font-['Space_Grotesk'] text-[16px] text-[#ffc174] font-bold">
                    87
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-['Space_Grotesk'] text-[11px] text-[#e2e2e8] font-bold tracking-wider">
                      PAC
                    </span>
                    <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad] font-medium">
                      (السرعة)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-[#1e2024]/60 px-2.5 py-1.5 rounded-lg border border-[#282a2e]/40">
                  <span className="font-['Space_Grotesk'] text-[16px] text-[#ffc174] font-bold">
                    85
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-['Space_Grotesk'] text-[11px] text-[#e2e2e8] font-bold tracking-wider">
                      SHO
                    </span>
                    <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad] font-medium">
                      (التسديد)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-[#1e2024]/60 px-2.5 py-1.5 rounded-lg border border-[#282a2e]/40">
                  <span className="font-['Space_Grotesk'] text-[16px] text-[#ffc174] font-bold">
                    78
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-['Space_Grotesk'] text-[11px] text-[#e2e2e8] font-bold tracking-wider">
                      PAS
                    </span>
                    <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad] font-medium">
                      (التمرير)
                    </span>
                  </div>
                </div>
              </div>

              {/* Col Left (RTL: Dri, Def, Phy) */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between bg-[#1e2024]/60 px-2.5 py-1.5 rounded-lg border border-[#282a2e]/40">
                  <span className="font-['Space_Grotesk'] text-[16px] text-[#ffc174] font-bold">
                    86
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-['Space_Grotesk'] text-[11px] text-[#e2e2e8] font-bold tracking-wider">
                      DRI
                    </span>
                    <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad] font-medium">
                      (المراوغة)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-[#1e2024]/60 px-2.5 py-1.5 rounded-lg border border-[#282a2e]/40">
                  <span className="font-['Space_Grotesk'] text-[16px] text-[#d8c3ad] font-bold">
                    42
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-['Space_Grotesk'] text-[11px] text-[#e2e2e8] font-bold tracking-wider">
                      DEF
                    </span>
                    <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad] font-medium">
                      (الدفاع)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-[#1e2024]/60 px-2.5 py-1.5 rounded-lg border border-[#282a2e]/40">
                  <span className="font-['Space_Grotesk'] text-[16px] text-[#ffc174] font-bold">
                    81
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-['Space_Grotesk'] text-[11px] text-[#e2e2e8] font-bold tracking-wider">
                      PHY
                    </span>
                    <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad] font-medium">
                      (القوة)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footnote Stencil */}
            <div className="relative z-10 mt-3 pt-2 text-center flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[#ffc174] text-[14px]">bolt</span>
              <span className="font-['Space_Grotesk'] text-[10px] text-[#ffc174]/70 tracking-wider">
                STREET CARD #10 • EDITION 2024
              </span>
              <span className="material-symbols-outlined text-[#ffc174] text-[14px]">bolt</span>
            </div>
          </div>
        </div>

        {/* Action: WhatsApp Share & Quick Invite Button */}
        <div className="w-full max-w-[340px] mt-4 flex flex-col gap-2">
          <button
            onClick={handleShareCard}
            className="w-full py-3 px-4 rounded-xl bg-[#00a572] hover:bg-[#10B981] text-[#00311f] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 font-['Rubik'] text-[18px] font-bold shadow-[0_6px_20px_rgba(0,165,114,0.35)] cursor-pointer"
          >
            <svg className="w-6 h-6 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            <span>مشاركة بطاقة اللاعب عبر واتساب</span>
          </button>

          <div className="flex items-center justify-between px-1 text-[#d8c3ad] font-['Plus_Jakarta_Sans'] text-[12px]">
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1 hover:text-[#ffc174] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-[#ffc174]">
                qr_code_2
              </span>
              <span>كود البطاقة: NJM-8701</span>
              {copiedCode && <span className="text-[#4edea3] text-[10px]">(تم النسخ!)</span>}
            </button>

            <button
              onClick={() => {
                sfx.playSuccess();
                alert('جاري تنزيل بطاقة FIFA الذهبية بجودة HD 4K...');
              }}
              className="text-[#ffc174] hover:underline font-['Space_Grotesk'] text-[11px] font-bold cursor-pointer"
            >
              تنزيل بجودة عالية
            </button>
          </div>
        </div>
      </section>

      {/* App Theme & Lighting Mode Switcher (Dark / Light Mode) */}
      <section className="px-4 pt-4">
        <div className="rounded-xl bg-[#1e2024] p-3.5 border border-[#282a2e] shadow-md flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ffc174] text-[20px]">
                palette
              </span>
              <div>
                <h3 className="font-['Rubik'] text-[14px] text-white font-bold leading-tight">
                  مظهر وإضاءة التطبيق
                </h3>
                <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad]">
                  اختر بين الوضع الليلي للملاعب أو النهاري المشرق
                </span>
              </div>
            </div>
            <span className="font-['Space_Grotesk'] text-[11px] font-bold text-[#ffc174] bg-[#f59e0b]/15 px-2 py-0.5 rounded-full border border-[#f59e0b]/30">
              {theme === 'dark' ? 'الوضع الليلي 🌙' : 'الوضع النهاري ☀️'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Dark Mode Option */}
            <button
              onClick={() => {
                sfx.playClipBeep();
                setTheme('dark');
              }}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-[#111317] border-[#ffc174] text-[#ffc174] shadow-md ring-1 ring-[#ffc174]/40 font-bold'
                  : 'bg-[#282a2e] border-transparent text-[#d8c3ad] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">dark_mode</span>
              <span className="font-['Rubik'] text-[13px]">ليلي (كشافات الملعب)</span>
            </button>

            {/* Light Mode Option */}
            <button
              onClick={() => {
                sfx.playClipBeep();
                setTheme('light');
              }}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-white border-[#f59e0b] text-[#b45309] shadow-md ring-1 ring-[#f59e0b]/40 font-bold'
                  : 'bg-[#282a2e] border-transparent text-[#d8c3ad] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">light_mode</span>
              <span className="font-['Rubik'] text-[13px]">نهاري (مشرق ونقي)</span>
            </button>
          </div>
        </div>
      </section>

      {/* Section 2: Official Career & Form Statistics */}
      <section className="px-4 pt-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#ffc174] text-[22px]">analytics</span>
            <h2 className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
              إحصائيات المسيرة والهيبة
            </h2>
          </div>
          <span className="font-['Space_Grotesk'] text-[11px] px-2 py-0.5 rounded bg-[#282a2e] text-[#ffc174] font-bold">
            موسم 2024
          </span>
        </div>

        {/* Rating & Confidence Hero Bento Card */}
        <div className="rounded-xl bg-[#1e2024] p-3.5 flex items-center justify-between shadow-md border border-[#282a2e]">
          <div className="flex items-center gap-3.5">
            <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-tr from-[#0c0e12] to-[#282a2e] shadow-inner border border-[#ffc174]/20">
              <span className="font-['Space_Grotesk'] text-[24px] text-[#ffc174] font-black leading-none">
                8.4
              </span>
              <span className="font-['Space_Grotesk'] text-[9px] text-[#d8c3ad] uppercase tracking-wider mt-1">
                ELO RATING
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
                  تقييم الحارة (Beta)
                </span>
                <span className="w-2 h-2 rounded-full bg-[#4edea3]"></span>
              </div>
              <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad] mt-0.5">
                مؤشر ثقة عالي (92%) بناءً على 48 مباراة
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-[#4edea3]">
              <span className="material-symbols-outlined text-[18px]">trending_up</span>
              <span className="font-['Space_Grotesk'] text-[16px] font-bold">+0.6</span>
            </div>
            <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad]">
              آخر 30 يوم
            </span>
          </div>
        </div>

        {/* 4 Key Verified Career Counters */}
        <div className="grid grid-cols-2 gap-2">
          {/* Matches */}
          <div className="rounded-xl bg-[#1e2024] p-3.5 flex flex-col justify-between border border-[#282a2e]">
            <div className="flex items-center justify-between text-[#d8c3ad]">
              <span className="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">
                المباريات الملعوبة
              </span>
              <span className="material-symbols-outlined text-[20px] text-[#ffc174]">
                sports_soccer
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-['Space_Grotesk'] text-[24px] text-[#e2e2e8] font-bold">48</span>
              <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad]">مباراة</span>
            </div>
          </div>

          {/* Goals */}
          <div className="rounded-xl bg-[#1e2024] p-3.5 flex flex-col justify-between border border-[#282a2e]">
            <div className="flex items-center justify-between text-[#d8c3ad]">
              <span className="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">
                الأهداف المسجلة
              </span>
              <span className="material-symbols-outlined text-[20px] text-[#f59e0b]">
                sports_score
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-['Space_Grotesk'] text-[24px] text-[#ffc174] font-bold">67</span>
              <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad]">هدف</span>
            </div>
          </div>

          {/* Assists */}
          <div className="rounded-xl bg-[#1e2024] p-3.5 flex flex-col justify-between border border-[#282a2e]">
            <div className="flex items-center justify-between text-[#d8c3ad]">
              <span className="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">
                صناعة الأهداف
              </span>
              <span className="material-symbols-outlined text-[20px] text-[#4edea3]">
                handshake
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-['Space_Grotesk'] text-[24px] text-[#4edea3] font-bold">24</span>
              <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad]">أسيست</span>
            </div>
          </div>

          {/* MVP Trophies */}
          <div className="rounded-xl bg-[#1e2024] p-3.5 flex flex-col justify-between border border-[#282a2e]">
            <div className="flex items-center justify-between text-[#d8c3ad]">
              <span className="font-['Plus_Jakarta_Sans'] text-[12px] font-medium">
                رجل المباراة (MVP)
              </span>
              <span
                className="material-symbols-outlined text-[20px] text-[#ffc174]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                military_tech
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-['Space_Grotesk'] text-[24px] text-[#ffc174] font-bold">12</span>
              <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad]">درع ذهبي</span>
            </div>
          </div>
        </div>

        {/* Recent Form Visualizer: Last 5 Matches */}
        <div className="rounded-xl bg-[#1e2024] p-3.5 flex flex-col gap-2 border border-[#282a2e]">
          <div className="flex items-center justify-between">
            <span className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
              آخر 5 مباريات (Form)
            </span>
            <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#4edea3] font-bold">
              4 فوز • 1 تعادل • 0 خسارة
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            {/* Match 1: Win */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-lg bg-[#00a572] text-[#00311f] font-['Rubik'] text-[18px] flex items-center justify-center font-black shadow-md">
                W
              </div>
              <span className="font-['Space_Grotesk'] text-[10px] text-[#d8c3ad]">4-2</span>
            </div>

            {/* Match 2: Win */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-lg bg-[#00a572] text-[#00311f] font-['Rubik'] text-[18px] flex items-center justify-center font-black shadow-md">
                W
              </div>
              <span className="font-['Space_Grotesk'] text-[10px] text-[#d8c3ad]">6-5</span>
            </div>

            {/* Match 3: Draw */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-lg bg-[#333539] text-[#e2e2e8] font-['Rubik'] text-[18px] flex items-center justify-center font-black shadow-sm">
                D
              </div>
              <span className="font-['Space_Grotesk'] text-[10px] text-[#d8c3ad]">3-3</span>
            </div>

            {/* Match 4: Loss */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-lg bg-[#93000a] text-[#ffdad6] font-['Rubik'] text-[18px] flex items-center justify-center font-black shadow-sm">
                L
              </div>
              <span className="font-['Space_Grotesk'] text-[10px] text-[#d8c3ad]">1-2</span>
            </div>

            {/* Match 5: Win (Recent MVP) */}
            <div className="flex flex-col items-center gap-1 relative">
              <span
                className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#f59e0b] text-[#613b00] flex items-center justify-center text-[10px] shadow"
                title="نجم المباراة"
              >
                ★
              </span>
              <div className="w-10 h-10 rounded-lg bg-[#00a572] text-[#00311f] font-['Rubik'] text-[18px] flex items-center justify-center font-black shadow-[0_0_12px_rgba(0,165,114,0.4)]">
                W
              </div>
              <span className="font-['Space_Grotesk'] text-[10px] text-[#ffc174] font-bold">
                5-3
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2.5: Player Level (XP) & Goals Progression Charts (Recharts) */}
      <section className="px-4 pt-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#4edea3] text-[22px]">
              monitoring
            </span>
            <h2 className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
              تطور المستوى والأهداف عبر الزمن
            </h2>
          </div>
          <span className="font-['Space_Grotesk'] text-[11px] px-2 py-0.5 rounded bg-[#282a2e] text-[#4edea3] font-bold">
            مؤشر تصاعدي 📈
          </span>
        </div>

        {/* Chart View Switcher */}
        <div className="flex items-center justify-between bg-[#1e2024] p-1 rounded-xl border border-[#282a2e]">
          <button
            onClick={() => {
              sfx.playClipBeep();
              setChartView('xp');
            }}
            className={`flex-1 py-1.5 px-2 rounded-lg font-['Rubik'] text-[13px] font-bold transition-all cursor-pointer ${
              chartView === 'xp'
                ? 'bg-[#00a572] text-[#00311f] shadow-md'
                : 'text-[#d8c3ad] hover:text-[#e2e2e8]'
            }`}
          >
            تطور نقاط الـ XP
          </button>
          <button
            onClick={() => {
              sfx.playClipBeep();
              setChartView('goals');
            }}
            className={`flex-1 py-1.5 px-2 rounded-lg font-['Rubik'] text-[13px] font-bold transition-all cursor-pointer ${
              chartView === 'goals'
                ? 'bg-[#f59e0b] text-[#472a00] shadow-md'
                : 'text-[#d8c3ad] hover:text-[#e2e2e8]'
            }`}
          >
            الأهداف المسجلة
          </button>
          <button
            onClick={() => {
              sfx.playClipBeep();
              setChartView('combined');
            }}
            className={`flex-1 py-1.5 px-2 rounded-lg font-['Rubik'] text-[13px] font-bold transition-all cursor-pointer ${
              chartView === 'combined'
                ? 'bg-[#37393e] text-[#ffc174] shadow-md'
                : 'text-[#d8c3ad] hover:text-[#e2e2e8]'
            }`}
          >
            عرض شامل
          </button>
        </div>

        {/* Key Metrics Quick Ticker */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#1e2024] p-2.5 rounded-xl border border-[#282a2e] text-center">
            <span className="block font-['Space_Grotesk'] text-[10px] text-[#d8c3ad]">نقاط XP الحالية</span>
            <span className="font-['Space_Grotesk'] text-[18px] text-[#4edea3] font-black">2,840</span>
            <span className="block font-['Plus_Jakarta_Sans'] text-[10px] text-[#4edea3] font-bold">+350 هذا الشهر</span>
          </div>
          <div className="bg-[#1e2024] p-2.5 rounded-xl border border-[#282a2e] text-center">
            <span className="block font-['Space_Grotesk'] text-[10px] text-[#d8c3ad]">معدل الأهداف</span>
            <span className="font-['Space_Grotesk'] text-[18px] text-[#ffc174] font-black">1.40</span>
            <span className="block font-['Plus_Jakarta_Sans'] text-[10px] text-[#d8c3ad]">هدف / مباراة</span>
          </div>
          <div className="bg-[#1e2024] p-2.5 rounded-xl border border-[#282a2e] text-center">
            <span className="block font-['Space_Grotesk'] text-[10px] text-[#d8c3ad]">أعلى شهر تهديفاً</span>
            <span className="font-['Space_Grotesk'] text-[18px] text-[#e2e2e8] font-black">14</span>
            <span className="block font-['Plus_Jakarta_Sans'] text-[10px] text-[#ffc174]">أيلول (الحالي)</span>
          </div>
        </div>

        {/* Main Chart Card */}
        <div className="bg-[#1e2024] p-4 rounded-xl border border-[#282a2e] shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 text-right">
            <div>
              <h3 className="font-['Rubik'] text-[15px] font-bold text-[#e2e2e8]">
                {chartView === 'xp'
                  ? 'منحنى تصاعد مستوى اللاعب ونقاط الخبرة (XP)'
                  : chartView === 'goals'
                  ? 'سجل التهديف الشهري وصناعة الفرص'
                  : 'مؤشر الأداء الشامل (XP والأهداف)'}
              </h3>
              <p className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad]">
                بيانات موثقة من حكام وكاميرات الملاعب عبر 6 أشهر
              </p>
            </div>
            <div className="flex items-center gap-2">
              {chartView === 'xp' && (
                <div className="flex items-center gap-1.5 text-[11px] font-['Space_Grotesk']">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4edea3]"></span>
                  <span className="text-[#4edea3]">XP</span>
                </div>
              )}
              {chartView === 'goals' && (
                <div className="flex items-center gap-2 text-[11px] font-['Space_Grotesk']">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#ffc174]"></span>
                    <span className="text-[#ffc174]">أهداف</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#4edea3]"></span>
                    <span className="text-[#4edea3]">أسيست</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chart Rendering */}
          <div className="w-full h-56 pt-2" dir="ltr">
            {chartView === 'xp' && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={progressionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4edea3" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#4edea3" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#282a2e" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#d8c3ad"
                    tick={{ fill: '#d8c3ad', fontSize: 11, fontFamily: 'Rubik' }}
                    axisLine={{ stroke: '#333539' }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#d8c3ad"
                    tick={{ fill: '#d8c3ad', fontSize: 10, fontFamily: 'Space Grotesk' }}
                    axisLine={{ stroke: '#333539' }}
                    tickLine={false}
                    domain={['dataMin - 200', 'dataMax + 200']}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#1e2024]/95 backdrop-blur-md p-3 rounded-xl border border-[#4edea3]/40 shadow-2xl text-right">
                            <div className="flex items-center justify-between gap-3 mb-1 pb-1 border-b border-[#282a2e]">
                              <span className="font-['Rubik'] text-[13px] font-bold text-[#e2e2e8]">
                                شهر {label}
                              </span>
                              <span className="font-['Space_Grotesk'] text-[10px] text-[#4edea3] bg-[#00a572]/20 px-1.5 py-0.5 rounded font-bold">
                                تقييم ELO: {payload[0]?.payload?.elo}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1 text-[11px] font-['Space_Grotesk']">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[#d8c3ad] font-['Plus_Jakarta_Sans']">نقاط XP:</span>
                                <span className="font-bold text-[14px] text-[#4edea3]">
                                  {Number(payload[0]?.value).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-[#d8c3ad]">
                                <span className="font-['Plus_Jakarta_Sans']">المباريات الملعوبة:</span>
                                <span className="font-bold text-white">
                                  {payload[0]?.payload?.matches} مباراة
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="xp"
                    name="نقاط XP"
                    stroke="#4edea3"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#xpGradient)"
                    dot={{ fill: '#111317', stroke: '#4edea3', strokeWidth: 2, r: 4 }}
                    activeDot={{ fill: '#ffc174', stroke: '#fff', strokeWidth: 2, r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {chartView === 'goals' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#282a2e" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#d8c3ad"
                    tick={{ fill: '#d8c3ad', fontSize: 11, fontFamily: 'Rubik' }}
                    axisLine={{ stroke: '#333539' }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#d8c3ad"
                    tick={{ fill: '#d8c3ad', fontSize: 10, fontFamily: 'Space Grotesk' }}
                    axisLine={{ stroke: '#333539' }}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#1e2024]/95 backdrop-blur-md p-3 rounded-xl border border-[#ffc174]/40 shadow-2xl text-right">
                            <div className="flex items-center justify-between gap-3 mb-1 pb-1 border-b border-[#282a2e]">
                              <span className="font-['Rubik'] text-[13px] font-bold text-[#e2e2e8]">
                                شهر {label}
                              </span>
                              <span className="font-['Space_Grotesk'] text-[10px] text-[#ffc174] bg-[#282a2e] px-1.5 py-0.5 rounded font-bold">
                                {payload[0]?.payload?.matches} مباريات
                              </span>
                            </div>
                            <div className="flex flex-col gap-1 text-[11px] font-['Space_Grotesk']">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[#d8c3ad] font-['Plus_Jakarta_Sans']">الأهداف:</span>
                                <span className="font-bold text-[14px] text-[#ffc174]">
                                  ⚽ {payload[0]?.value} هدف
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[#d8c3ad] font-['Plus_Jakarta_Sans']">التمريرات الحاسمة:</span>
                                <span className="font-bold text-[14px] text-[#4edea3]">
                                  👟 {payload[1]?.value} أسيست
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="goals"
                    name="الأهداف"
                    fill="#ffc174"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="assists"
                    name="صناعة الأهداف"
                    fill="#4edea3"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}

            {chartView === 'combined' && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={progressionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="goalAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffc174" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ffc174" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#282a2e" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#d8c3ad"
                    tick={{ fill: '#d8c3ad', fontSize: 11, fontFamily: 'Rubik' }}
                    axisLine={{ stroke: '#333539' }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#d8c3ad"
                    tick={{ fill: '#d8c3ad', fontSize: 10, fontFamily: 'Space Grotesk' }}
                    axisLine={{ stroke: '#333539' }}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#1e2024]/95 backdrop-blur-md p-3 rounded-xl border border-[#ffc174]/40 shadow-2xl text-right">
                            <span className="font-['Rubik'] text-[13px] font-bold text-[#e2e2e8] block mb-1">
                              شهر {label} 2024
                            </span>
                            <div className="flex flex-col gap-1 text-[11px] font-['Space_Grotesk']">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[#d8c3ad]">نقاط XP:</span>
                                <span className="font-bold text-[#4edea3]">
                                  {payload[0]?.payload?.xp}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[#d8c3ad]">الأهداف:</span>
                                <span className="font-bold text-[#ffc174]">
                                  {payload[0]?.payload?.goals} هدف
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[#d8c3ad]">تقييم الحارة:</span>
                                <span className="font-bold text-white">
                                  {payload[0]?.payload?.elo} ELO
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="goals"
                    name="الأهداف"
                    stroke="#ffc174"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#goalAreaGrad)"
                    dot={{ fill: '#111317', stroke: '#ffc174', strokeWidth: 2, r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Analysis Note Footer */}
          <div className="mt-3 pt-2.5 border-t border-[#282a2e] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4edea3] text-[18px]">insights</span>
            <p className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad] leading-relaxed">
              <strong className="text-[#4edea3] font-bold">أداء تصاعدي ممتاز:</strong> زيادة في معدل الحسم التهديفي بنسبة +45% ومؤشر ثقة قارب 92% خلال مباريات جبل الحسين الأخيرة.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2.8: Nujoom Digital Virtual Wallet (محفظة نجوم الحارة) */}
      <section className="px-4 pt-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#ffc174] text-[22px]">
              account_balance_wallet
            </span>
            <h2 className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
              المحفظة الرقمية ورصيد النجوم
            </h2>
          </div>
          <span className="font-['Space_Grotesk'] text-[11px] px-2 py-0.5 rounded bg-[#282a2e] text-[#ffc174] font-bold">
            رصيد فوري ⭐
          </span>
        </div>

        <PlayerWalletCard
          wallet={wallet}
          onEarnStars={onEarnStars}
          onNavigateToBooking={onNavigateToBooking}
        />
      </section>

      {/* Section 2.9: Neighborhood Friends & Squad (شلة الحارة والأصدقاء) */}
      <section className="px-4 pt-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#4edea3] text-[22px]">group</span>
            <h2 className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
              شلة الحارة وقائمة الأصدقاء
            </h2>
          </div>
          {onOpenFriends && (
            <button
              onClick={() => {
                sfx.playClipBeep();
                onOpenFriends();
              }}
              className="font-['Space_Grotesk'] text-[11px] text-[#ffc174] hover:underline font-bold cursor-pointer flex items-center gap-1"
            >
              <span>إدارة الشلة ({friends.length})</span>
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            </button>
          )}
        </div>

        {/* Friends Preview Strip */}
        <div className="rounded-xl bg-[#1e2024] p-3.5 border border-[#282a2e] flex flex-col gap-3 shadow-md">
          <div className="flex items-center justify-between text-[12px] font-['Plus_Jakarta_Sans'] pb-2 border-b border-[#282a2e]/60">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[#4edea3] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse"></span>
                <span>{friends.filter((f) => f.status === 'online').length} متصل الآن</span>
              </span>
              <span className="flex items-center gap-1 text-[#ffc174] font-bold">
                <span>⚽</span>
                <span>{friends.filter((f) => f.status === 'in_match').length} في مباراة</span>
              </span>
            </div>
            <span className="font-['Space_Grotesk'] text-[11px] text-[#d8c3ad]">
              دعوة بنقرة واحدة
            </span>
          </div>

          {/* Quick Friends Horizontal Cards */}
          <div className="grid grid-cols-2 gap-2">
            {friends.slice(0, 4).map((f) => {
              const isOnline = f.status === 'online';
              const isInMatch = f.status === 'in_match';

              return (
                <div
                  key={f.id}
                  className="bg-[#1a1c20] p-2.5 rounded-xl border border-[#282a2e] flex flex-col justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 bg-[#282a2e]">
                      <img src={f.avatarUrl} alt={f.name} className="w-full h-full object-cover" />
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-1 ring-[#111317] ${
                          isOnline ? 'bg-[#4edea3]' : isInMatch ? 'bg-[#f59e0b]' : 'bg-[#a08e7a]'
                        }`}
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-['Rubik'] text-[12px] font-bold text-[#e2e2e8] truncate">
                        {f.name}
                      </span>
                      <span className="font-['Space_Grotesk'] text-[10px] text-[#d8c3ad]">
                        {f.position} • {f.rating}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-1.5 border-t border-[#282a2e]/60 flex items-center justify-between">
                    <span className="font-['Space_Grotesk'] text-[9px] text-[#ffc174] font-bold">
                      {f.cardCode}
                    </span>
                    <button
                      onClick={() => {
                        sfx.playSuccess();
                        if (onInviteFriend) onInviteFriend(f);
                      }}
                      className="px-2 py-0.5 rounded-md bg-[#00a572] hover:bg-[#10B981] text-[#00311f] font-['Rubik'] text-[10px] font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-[12px]">send</span>
                      <span>دعوة</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {onOpenFriends && (
            <button
              onClick={() => {
                sfx.playClipBeep();
                onOpenFriends();
              }}
              className="w-full py-2 rounded-lg bg-[#282a2e] hover:bg-[#333539] text-[#e2e2e8] font-['Rubik'] text-[13px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#333539]"
            >
              <span className="material-symbols-outlined text-[16px] text-[#ffc174]">person_add</span>
              <span>فتح شاشة الأصدقاء وإضافة لاعبين جدد</span>
            </button>
          )}
        </div>
      </section>

      {/* Section 3: Highlights Reel Grid (أبرز أهدافي ولقطاتي) */}
      <section className="px-4 pt-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#ffc174] text-[22px]">
              video_library
            </span>
            <h2 className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
              أبرز أهدافي ولقطاتي
            </h2>
            <span className="font-['Space_Grotesk'] text-[11px] px-2 py-0.5 rounded-full bg-[#282a2e] text-[#d8c3ad]">
              14 لقطة
            </span>
          </div>
          <button
            onClick={() => onPlayClip(highlight1)}
            className="font-['Space_Grotesk'] text-[11px] text-[#ffc174] hover:underline font-bold cursor-pointer"
          >
            عرض الكل
          </button>
        </div>

        {/* Highlights Reel List / Cards */}
        <div className="grid grid-cols-1 gap-2">
          {/* Highlight Card 1 */}
          <div
            onClick={() => onPlayClip(highlight1)}
            className="group relative rounded-xl bg-[#1e2024] overflow-hidden p-3 flex gap-3.5 items-center cursor-pointer hover:bg-[#282a2e] transition-colors border border-[#282a2e]"
          >
            <div
              className="relative w-28 h-20 rounded-lg bg-cover bg-center shrink-0 overflow-hidden shadow"
              style={{ backgroundImage: `url('${highlight1.thumbnailUrl}')` }}
            >
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                <span className="w-8 h-8 rounded-full bg-[#f59e0b] text-[#613b00] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    play_arrow
                  </span>
                </span>
              </div>
              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-[#0c0e12]/80 font-['Space_Grotesk'] text-[9px] text-[#e2e2e8]">
                {highlight1.duration}
              </span>
            </div>

            <div className="flex flex-col justify-between flex-1 min-w-0">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-['Space_Grotesk'] text-[10px] px-1.5 py-0.5 rounded bg-[#ffc174]/20 text-[#ffc174] font-bold">
                    {highlight1.tag}
                  </span>
                  <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad]">
                    {highlight1.pitchName}
                  </span>
                </div>
                <h3 className="font-['Rubik'] text-[15px] text-[#e2e2e8] font-bold truncate mt-1">
                  {highlight1.title}
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[#d8c3ad] font-['Plus_Jakarta_Sans'] text-[12px] mt-1">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-[#ffc174]">
                    visibility
                  </span>
                  {highlight1.views}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-[#ffbcb7]">
                    favorite
                  </span>
                  {highlight1.likes}
                </span>
                <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#4edea3] font-medium">
                  {highlight1.opponent}
                </span>
              </div>
            </div>
          </div>

          {/* Highlight Card 2 */}
          <div
            onClick={() => onPlayClip(highlight2)}
            className="group relative rounded-xl bg-[#1e2024] overflow-hidden p-3 flex gap-3.5 items-center cursor-pointer hover:bg-[#282a2e] transition-colors border border-[#282a2e]"
          >
            <div
              className="relative w-28 h-20 rounded-lg bg-cover bg-center shrink-0 overflow-hidden shadow"
              style={{ backgroundImage: `url('${highlight2.thumbnailUrl}')` }}
            >
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                <span className="w-8 h-8 rounded-full bg-[#333539] text-[#e2e2e8] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    play_arrow
                  </span>
                </span>
              </div>
              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-[#0c0e12]/80 font-['Space_Grotesk'] text-[9px] text-[#e2e2e8]">
                {highlight2.duration}
              </span>
            </div>

            <div className="flex flex-col justify-between flex-1 min-w-0">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-['Space_Grotesk'] text-[10px] px-1.5 py-0.5 rounded bg-[#4edea3]/20 text-[#4edea3] font-bold">
                    {highlight2.tag}
                  </span>
                  <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad]">
                    {highlight2.pitchName}
                  </span>
                </div>
                <h3 className="font-['Rubik'] text-[15px] text-[#e2e2e8] font-bold truncate mt-1">
                  {highlight2.title}
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[#d8c3ad] font-['Plus_Jakarta_Sans'] text-[12px] mt-1">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-[#ffc174]">
                    visibility
                  </span>
                  {highlight2.views}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-[#ffbcb7]">
                    favorite
                  </span>
                  {highlight2.likes}
                </span>
                <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#4edea3] font-medium">
                  {highlight2.opponent}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Prompt to record or clip next game */}
        <div className="rounded-xl bg-gradient-to-r from-[#282a2e] to-[#1e2024] p-3.5 flex items-center justify-between border border-[#ffc174]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#ffc174]/20 text-[#ffc174] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">videocam</span>
            </div>
            <div className="flex flex-col">
              <span className="font-['Rubik'] text-[16px] text-[#e2e2e8] font-bold">
                عندك لقطة مجنونة؟
              </span>
              <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad]">
                اطلب توثيقها من كابتن الملعب بنهاية الماتش
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              sfx.playClipBeep();
              alert('يمكنك رفع مقطع من جهازك أو طلب قصه مباشرة عبر زر "سجّل اللقطة!" في تبويب المباراة.');
            }}
            className="px-3 py-2 rounded-lg bg-[#37393e] hover:bg-[#333539] text-[#e2e2e8] font-['Space_Grotesk'] text-[11px] shrink-0 font-bold cursor-pointer"
          >
            رفع مقطع
          </button>
        </div>
      </section>

      {/* Section 4: Neighborhood Respect & Peer Endorsements */}
      <section className="px-4 pt-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#ffc174] text-[22px]">thumb_up</span>
            <h2 className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
              شهادات الهيبة الكروية
            </h2>
          </div>
          <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad]">
            32 توصية من الكباتن
          </span>
        </div>

        {/* Endorsements Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-[#1e2024] p-3 flex flex-col gap-1.5 border border-[#282a2e]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#37393e] flex items-center justify-center font-bold text-[#ffc174] text-xs">
                ك.ع
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-['Plus_Jakarta_Sans'] text-[12px] font-bold text-[#e2e2e8] truncate">
                  كابتن عمر الدوسري
                </span>
                <span className="font-['Space_Grotesk'] text-[9px] text-[#d8c3ad]">
                  ملعب النخيل
                </span>
              </div>
            </div>
            <p className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad] line-clamp-2 mt-1">
              "مهاجم حاسم، إنهاء الفرص عنده 9 من 10 وما يضيع داخل الصندوق."
            </p>
          </div>

          <div className="rounded-xl bg-[#1e2024] p-3 flex flex-col gap-1.5 border border-[#282a2e]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#37393e] flex items-center justify-center font-bold text-[#4edea3] text-xs">
                ط.ز
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-['Plus_Jakarta_Sans'] text-[12px] font-bold text-[#e2e2e8] truncate">
                  طارق الزعبي
                </span>
                <span className="font-['Space_Grotesk'] text-[9px] text-[#d8c3ad]">
                  كابتن حارة اللويبدة
                </span>
              </div>
            </div>
            <p className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad] line-clamp-2 mt-1">
              "لاعب تكتيكي من الدرجة الأولى وروحه الرياضية عالية حتى بالدقائق المشتعلة."
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
