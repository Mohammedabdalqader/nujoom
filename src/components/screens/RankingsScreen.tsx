import React, { useState } from 'react';
import { sfx } from '../../utils/audio';

interface RankingsScreenProps {
  onShareWhatsApp: (text: string) => void;
  onOpenPlayerCard?: () => void;
}

export const RankingsScreen: React.FC<RankingsScreenProps> = ({
  onShareWhatsApp,
  onOpenPlayerCard,
}) => {
  const [showEloInfo, setShowEloInfo] = useState(false);
  const [geoScope, setGeoScope] = useState<'mine' | 'city' | 'country'>('city');
  const [ageGroup, setAgeGroup] = useState<'+18' | 'u18' | 'u16'>('+18');
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'season'>('month');
  const [tournamentType, setTournamentType] = useState<'pro' | 'amateur' | 'family'>('pro');
  const [derbyPrediction, setDerbyPrediction] = useState<string | null>(null);

  // Tournament categories configuration
  const tournamentCategories = [
    {
      id: 'pro' as const,
      label: 'محترفين',
      fullLabel: 'بطولات المحترفين',
      icon: 'military_tech',
      badge: 'ELO تنافسي',
      desc: 'دوري النخبة وحكام معتمدين',
    },
    {
      id: 'amateur' as const,
      label: 'هواة',
      fullLabel: 'بطولات الهواة',
      icon: 'sports_soccer',
      badge: 'دوري الشارع',
      desc: 'حماس ومنافسات الحارات الشعبية',
    },
    {
      id: 'family' as const,
      label: 'عائلية',
      fullLabel: 'بطولات عائلية',
      icon: 'diversity_3',
      badge: 'لعب نظيف',
      desc: 'تحديات العائلات والفرجان الودية',
    },
  ];

  const ballersByTournament: Record<
    'pro' | 'amateur' | 'family',
    Array<{
      rank: number;
      name: string;
      tag?: string;
      subTeam?: string;
      trend: 'up' | 'down' | 'equal';
      trendIcon: string;
      avatar: string;
      role: string;
      matches: number;
      keyStat: string;
      keyColor: string;
      points: string;
      confidence: string;
      star?: boolean;
    }>
  > = {
    pro: [
      {
        rank: 1,
        name: 'أحمد النشمي',
        trend: 'equal',
        trendIcon: 'equal',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBamGPqOtVb7h4STVARV0g-41PYD0z9wJPucv2hNZVs8cJDLYzJu370Owz9nAt2n7Giokh3jJG7m1sFSEv81yiCyZNuiyBaWqTJ330txgoMwIGQaCy_-PL-pJTpTGauREl4hJEdrMxb-p9oVwNEE7_sT_vyARv20HCWdKVnzkHeDcOvAIUixT2Hvyi_QZryy4OFPJCK46plbigpoOaNbz_hG2HQ1bX33NCN9BDjHofGfVXHouwPkVc',
        role: 'مهاجم',
        matches: 48,
        keyStat: '67 هدف',
        keyColor: 'text-[#ffc174]',
        points: '2,350',
        confidence: '92%',
        star: true,
      },
      {
        rank: 2,
        name: 'سيف الحارة',
        tag: 'العبدلي',
        trend: 'up',
        trendIcon: 'arrow_drop_up',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBir9R8_CcMjMLEhZ1nL_qUcNECyTBHf_fynAqL8eciHb2jvmXqOSL03C-sVv9m--Pwv93K2ECQ_IZkaIRtfFdiOE80-K2x7NyBGj5gKoV1JvibNcEStam1fZfxV1oXL9GnafXxNw5co-nWw_LfdcR9vQ8t9xygVhiBIyFkZqr_w9AyJ8M_U2ObOBMq992TUVG6_dwU1n2XAcFBFMIBa7ZgG_VI3bZXyA04OlHIMqiojdMhNxFMRik',
        role: 'صانع ألعاب',
        matches: 36,
        keyStat: '42 أسيست',
        keyColor: 'text-[#4edea3]',
        points: '2,120',
        confidence: '88%',
      },
      {
        rank: 3,
        name: 'يزن شقر',
        tag: 'اللويبدة',
        trend: 'down',
        trendIcon: 'arrow_drop_down',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAhZzoi0HGsHsWGmqx_LmUOVzNn_R2xZIEdw4iHh25kSirY0dq5B6v5P1o20ErzCw6BcMf5zuxRjo5WxWgzhy7HC1nTLgZZMYqR8K-l3uJ5uCDm0Q7ZBdE7OllxpmGDiA1zNZU-MfTYgzjWJMw7hNueIM9tW_3Vb8MA7qnGXykXuGrWoS4mKjrajeuJDphwMzFu3SjC2uLMOHxUVh5K_T66prQXkK6XMGvSFb9YECIoCYxmsqkecj8',
        role: 'جناح سريع',
        matches: 41,
        keyStat: '34 هدف',
        keyColor: 'text-[#ffc174]',
        points: '1,980',
        confidence: '85%',
      },
      {
        rank: 4,
        name: 'موسى الدوايمة',
        tag: 'ماركا',
        trend: 'up',
        trendIcon: 'arrow_drop_up',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBfxsaC_jyzL8_Yw0XASx-Zt1VieJLFy6AfDucqeNXzoLAly1f3ZjRjZH765LrJiUEWF3wtfsKIIH_mAy6pm-nxpsMSNn5hMj3IGh8fQir93BWMMdL2Mj3nzCutX7XY1xjnf_ucWM3NFSJGCjb_G0G8ZqAf55A6_4VHDNRqAuZI9UKZ6eZJWc8Z5kyZozv0MBeM7J05Zs8t2LZ1t3UXDavJyJMRdjw6q8zXwxBg2_ub140oJyjpugk',
        role: 'صخرة دفاع',
        matches: 50,
        keyStat: '19 شباك نظيفة',
        keyColor: 'text-[#4edea3]',
        points: '1,760',
        confidence: '81%',
      },
      {
        rank: 5,
        name: 'حمزة كيلاني',
        tag: 'صويلح',
        trend: 'up',
        trendIcon: 'arrow_drop_up',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuD5CKTm2Uh1cbUDwG3CRiNcx0ztVXu60fNA_-zyN51ved-r7_KYJXvpVK63O2x9Tl3Y2lqyhmFRLJjrUdHmIie5Lvv7g0t9t_uev1djU8bY2GzNo8131ZbKMgaGpB3RzQB_VNeychANoi7IKyMa3KBSAyiI8BIgHHipe9tqEVJtiZs4-8N0eIbC_R4ZLUYIcziGELhooO5WzVtxMgCEKibycBup3QWt6QwwoPz5MuzPvTw8fs_NpKI',
        role: 'حارس مرمى',
        matches: 29,
        keyStat: '82% تصديات',
        keyColor: 'text-[#4edea3]',
        points: '1,690',
        confidence: '79%',
      },
    ],
    amateur: [
      {
        rank: 1,
        name: 'عمر الشويكي',
        tag: 'جبل الحسين',
        trend: 'up',
        trendIcon: 'arrow_drop_up',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBgt_dwHn9fut92to4azaDf4-yv8cZTp50ykkpwzaG3ibkKgBQoCjcdmWhHzo32cEalKT42b-tf66UatK-9APujy80fmTt3rEq5emwquxZ5Hwl3y0xI_8ZRG4GGpGtU1fuNiyQEZfrGQtPzbwVpTd-RLuQ0XPPz-4VazQ3085-N0hWaQ4DGEjJ_A6xWfqo82D0ALa4vXeHEH20rskgfKsOXndDIhu7ZR8u1jvdMlcPxXXBbgyixO2s',
        role: 'مهاجم سريع',
        matches: 38,
        keyStat: '45 هدف',
        keyColor: 'text-[#ffc174]',
        points: '1,940',
        confidence: '89%',
        star: true,
      },
      {
        rank: 2,
        name: 'بلال القاسم',
        tag: 'النزهة',
        trend: 'up',
        trendIcon: 'arrow_drop_up',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCuQPDO_Cx_ujF39eKxH38deHFy1A4-rQj-u7bS5IYDsT3ZmYmiBq_7zpUH4PyHQyTDKw-7fGjsy3RIDrgEOxsrJdVJjEU0AdTiGfbheZNSpkm3j4_f7AQvUipusq6kyJxdq3Up4jtgaQJRT0HTbO0zepik4PQ4oBV_mlPNsg_dQey_mmngTK5pXSzyf_mmoi2YMMzCmznQRyhNYBK_BQ162PjKxcyiqiC2nFlf8BXIJOhIHsIVwBM',
        role: 'صانع ألعاب',
        matches: 32,
        keyStat: '28 أسيست',
        keyColor: 'text-[#4edea3]',
        points: '1,880',
        confidence: '86%',
      },
      {
        rank: 3,
        name: 'رائد الصالحي',
        tag: 'الهاشمي',
        trend: 'equal',
        trendIcon: 'equal',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDi0nOD11zpkXLzSXL_2NhPIoWAQcbnPa9Fkl7eG7EkbEantmDVGkoqqmjrq30eMEVxPLBk6iW_ua_jyRL9m9ISzETBRTSBGnL7Wg0ykzOMo9HrdpLw31qZZPBjDWCFVABoeiNs4SFizmKK0RaFOhBJBJY1a4npKikHheLCbUh8MUeJm6qWrpWW5uke3fXPa_ojW8-4vZ6ZmEJAOErvlsEKzbIwdXF-38hf5e2YZQpRB-ZiUFWv0_g',
        role: 'جناح أيسر',
        matches: 35,
        keyStat: '31 هدف',
        keyColor: 'text-[#ffc174]',
        points: '1,810',
        confidence: '84%',
      },
      {
        rank: 4,
        name: 'فارس الجعبري',
        tag: 'طبربور',
        trend: 'up',
        trendIcon: 'arrow_drop_up',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuC0HaJoenRy30BjbXrTWkIGxVai81-iFhBgV6RP25SOmGDikfRepFw3yAVoItOFhAO5dxpUMFkoQyiqEI8iyQ7LIKwB9FvLxVxqed4LGH4Tstst3Osgw7-vnodwLchxhv6fwPVVozMxjbgxdq89g7thM52dljj5sQmugFWpwNOJU2DKYXdYmQRNcdWU9E69Mkt7nq0n0PP5UAAL-0SnMBRourWr-ewXx8XBtpzGe2wUmiXXrhJZQr8',
        role: 'قلب دفاع',
        matches: 27,
        keyStat: '14 شباك نظيفة',
        keyColor: 'text-[#4edea3]',
        points: '1,720',
        confidence: '80%',
      },
      {
        rank: 5,
        name: 'وسام النجار',
        tag: 'ماركا',
        trend: 'down',
        trendIcon: 'arrow_drop_down',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBZFlF9IvQPNYUw-5bRLUgbeoq99r2GmuGFUXOHsKkfZoGTlMvJJxzR03lWboB0NKNb8lWiP7jKcJD4kFNNTSyXWGVEajVCJXPVbnOiH15yKuZoEEq5LNCpf-nEVBRRn0dOmkgxdjfHPek6CoGS89RchpVD4Hl6-LkZNMoFi47Lxax0ymxKO63Kn9F3B4yakmFrsRo5Ic3X5YYVH-HepSAYYm5J8-PgM_AWCUMERWR-CbLGS3ohEXw',
        role: 'حارس مرمى',
        matches: 24,
        keyStat: '78% تصديات',
        keyColor: 'text-[#4edea3]',
        points: '1,650',
        confidence: '77%',
      },
    ],
    family: [
      {
        rank: 1,
        name: 'كابتن أبو العبد وعائلته',
        tag: 'جبل الحسين',
        trend: 'equal',
        trendIcon: 'equal',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAF334KkMX7vv951X1qXNNqdhaR8I6WKCk5PbfWcN5oLefE83Gy2wAq0c-SX7JeNcHYObtOnb8SPalUhpLwW3m9PktwuoikKaYwsDLA2RF_m7lCqz_EvoVtdWab33yBqJSo-S4dFbKC9QXER5qh0Hv2URvb5K8YTMdn4WqKlQ-gTsfL6yz_84fU45yDTE78VgWe2uHmJdXSfXAijGfeOBIzwuSu5uCZMMMwI-2B4zVGmz1MuEBDnHM',
        role: 'كأس الآباء والأبناء',
        matches: 22,
        keyStat: '39 هدف',
        keyColor: 'text-[#ffc174]',
        points: '1,890',
        confidence: '95%',
        star: true,
      },
      {
        rank: 2,
        name: 'فريق عائلة الحسين',
        tag: 'جبل الحسين',
        trend: 'up',
        trendIcon: 'arrow_drop_up',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDIVfkWerdRP4dTqGKhuNfnIrdDrt-1E491M5zte0RhRlYCPZoP_spOGBqeiPqnUmJSvcz30-BUZBjo44sG1Fn8_NRfjbY3DgBNdk0do3TlnPnk-U5Ll_ZzDa-dILOgSBd1A2426U8DCoSaTgKvHiqud0i9vcecYASsr8wANZ1ZDuPvRQgzbDPX4ikjK1DlPzT574sXxsnqRjsUpeqWva1C6Qzjf2mEY1Li55omD5hKZqYzLsvqfg0',
        role: 'روح رياضية 98%',
        matches: 19,
        keyStat: '31 هدف',
        keyColor: 'text-[#4edea3]',
        points: '1,820',
        confidence: '93%',
      },
      {
        rank: 3,
        name: 'فريق شباب العمومة',
        tag: 'النزهة',
        trend: 'up',
        trendIcon: 'arrow_drop_up',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAbbwjt_ifz791XqZqmpBhFqzPZ4O1cmfn_nYWmvFzqqYvQiK7kppf28SZcpwimiDhKWisG73S15JwiF9558NmQ2fPtKBGt4QaADKqv3NP4IonAzGDAscn-fZU6yIpkZZLRjRlcWloZjRw1S3Vj5on5WA3qfo0S0D0FW7eh_iFzmxZEzR5SZzr8xUvMemY7XQx5mWD64lBee1SfXdqBT4xlNcSRPLj-LAYwYHKgwNq4IVYsJVh0U0o',
        role: 'تحدي الأخوة',
        matches: 21,
        keyStat: '26 أسيست',
        keyColor: 'text-[#4edea3]',
        points: '1,750',
        confidence: '90%',
      },
      {
        rank: 4,
        name: 'عائلة الزعبي الكروية',
        tag: 'اللويبدة',
        trend: 'down',
        trendIcon: 'arrow_drop_down',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuB3GdTY_aiB9ZkqL0Sv6dLoERK1pwPGFB8ecFpLSuGjjpH9RQCfwvrvYfnBa8M6BeSCuubVQOQk8SLQD7Gx82re7DDUTAAkrMQL2f4eAfx0u1J_eInvjCRhnKEmV5P_moaD9rGV72RCRWidVlgqTHdk_KuDpqEdX2N3e42G9s_EI6t98v8rR9AGHBdxFIDyhD230HU3SRm51yNZTk1-i3H9zbCO2eDnnRyBSrLvGVtze_dBl3MOUVE',
        role: 'جائزة اللعب النظيف',
        matches: 18,
        keyStat: '11 شباك نظيفة',
        keyColor: 'text-[#4edea3]',
        points: '1,680',
        confidence: '88%',
      },
      {
        rank: 5,
        name: 'ديوان الحارة الودّي',
        tag: 'صويلح',
        trend: 'up',
        trendIcon: 'arrow_drop_up',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAk4m9oEmvPJhVvpDJLR0JryRWdSQ7MmLYuNRSlordxcyK-cNwoDyBTyeoUJBELc84RWPFQeudhRO-XbjPR6nn1IPW8Y30tcW4l8QTjO5kMCK0lotyNfoNlIgM_JlCeqXiZ_01Xeg2JajNsn4dgYJZqasyd9cni1l0FxgzxWZQ85T82Ahzia126VwrneFA5wm-IM8so-UPmgCYf64DQpEFYxrHKcXFSWX3kViTrvK-8TdmfeO57g6A',
        role: 'بطولة أجيال',
        matches: 16,
        keyStat: '75% تصديات',
        keyColor: 'text-[#4edea3]',
        points: '1,610',
        confidence: '85%',
      },
    ],
  };

  const topBallers = ballersByTournament[tournamentType];
  const activeCategoryMeta = tournamentCategories.find((c) => c.id === tournamentType);

  return (
    <div className="flex flex-col w-full pb-32 space-y-4">
      {/* Beta Rating Notification Banner (Bayesian Elo Engine) */}
      <section className="px-3">
        <div className="relative overflow-hidden rounded-xl bg-[#282a2e] p-3.5 shadow-md border border-[#ffc174]/20">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#ffc174]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between gap-2 relative z-10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#333539] flex items-center justify-center text-[#ffc174] shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
                    تصنيف نجوم الحارة
                  </h2>
                  <span className="font-['Space_Grotesk'] text-[11px] px-2 py-0.5 rounded-full bg-[#ffc174] text-[#472a00] font-bold">
                    BETA
                  </span>
                </div>
                <p className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad] mt-0.5 leading-relaxed">
                  نظام Elo الإحصائي المتطور: يُحتسب بناءً على حسم المواجهات، جوائز الـ MVP، ومؤشر الثقة الميداني.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                sfx.playClipBeep();
                setShowEloInfo(!showEloInfo);
              }}
              aria-label="شرح المعادلة"
              className={`transition-colors p-1 cursor-pointer ${
                showEloInfo ? 'text-[#ffc174]' : 'text-[#d8c3ad] hover:text-[#ffc174]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">info</span>
            </button>
          </div>

          {/* Expandable Tooltip / Stat Breakdown Modal Pill */}
          {showEloInfo && (
            <div className="mt-3 pt-3 bg-[#1e2024] rounded-lg p-2.5 text-[#e2e2e8] border border-[#333539] animate-fadeIn">
              <div className="flex items-center justify-between text-[12px] font-['Plus_Jakarta_Sans']">
                <span className="text-[#d8c3ad]">معادلة الاستحقاق Bayesian:</span>
                <span className="font-['Space_Grotesk'] text-[#4edea3] text-[11px] font-bold">
                  99.4% دقة احتساب
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 mt-2 text-center">
                <div className="bg-[#333539] p-1.5 rounded">
                  <span className="block font-['Space_Grotesk'] text-[11px] text-[#d8c3ad]">
                    الفوز والتعادل
                  </span>
                  <span className="font-['Space_Grotesk'] text-[16px] text-[#ffc174] font-bold">
                    +35 إلى -20
                  </span>
                </div>
                <div className="bg-[#333539] p-1.5 rounded">
                  <span className="block font-['Space_Grotesk'] text-[11px] text-[#d8c3ad]">
                    لقب رجل المباراة
                  </span>
                  <span className="font-['Space_Grotesk'] text-[16px] text-[#4edea3] font-bold">
                    +15 بونص
                  </span>
                </div>
                <div className="bg-[#333539] p-1.5 rounded">
                  <span className="block font-['Space_Grotesk'] text-[11px] text-[#d8c3ad]">
                    معدل الحضور
                  </span>
                  <span className="font-['Space_Grotesk'] text-[16px] text-[#e2e2e8] font-bold">
                    معامل الثقة
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Filter Hub: Geographic, Category, & Timeframe */}
      <section className="flex flex-col space-y-2 px-3">
        {/* Tournament Type Filter Bar (محترفين، هواة، عائلية) */}
        <div className="bg-[#1e2024] p-2 rounded-xl border border-[#282a2e] flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center justify-between px-1">
            <span className="font-['Space_Grotesk'] text-[11px] text-[#d8c3ad] font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-[#ffc174]">emoji_events</span>
              <span>نوع البطولة:</span>
            </span>
            <span className="font-['Space_Grotesk'] text-[10px] text-[#4edea3] bg-[#00a572]/20 border border-[#00a572]/30 px-2 py-0.5 rounded-full font-bold">
              {activeCategoryMeta?.badge}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {tournamentCategories.map((cat) => {
              const isSelected = tournamentType === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    sfx.playClipBeep();
                    setTournamentType(cat.id);
                  }}
                  className={`py-2 px-1.5 rounded-lg font-['Rubik'] text-[13px] flex items-center justify-center gap-1.5 transition-all cursor-pointer font-bold ${
                    isSelected
                      ? cat.id === 'pro'
                        ? 'bg-[#f59e0b] text-[#472a00] shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                        : cat.id === 'amateur'
                        ? 'bg-[#00a572] text-[#00311f] shadow-[0_0_12px_rgba(0,165,114,0.35)]'
                        : 'bg-[#3b82f6] text-white shadow-[0_0_12px_rgba(59,130,246,0.35)]'
                      : 'bg-[#1a1c20] text-[#d8c3ad] hover:bg-[#282a2e] hover:text-[#e2e2e8]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div className="px-1 text-[11px] font-['Plus_Jakarta_Sans'] text-[#d8c3ad] flex items-center gap-1">
            <span className="text-[#ffc174]">•</span>
            <span>{activeCategoryMeta?.desc}</span>
          </div>
        </div>

        {/* Geographic Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setGeoScope('mine')}
            className={`px-3.5 py-1.5 rounded-full font-['Rubik'] text-[15px] flex items-center gap-1.5 whitespace-nowrap transition-all duration-200 cursor-pointer ${
              geoScope === 'mine'
                ? 'bg-[#ffc174] text-[#472a00] font-bold shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                : 'bg-[#282a2e] text-[#d8c3ad] hover:bg-[#37393e]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">location_on</span>
            <span>حارتي (جبل الحسين)</span>
          </button>

          <button
            onClick={() => setGeoScope('city')}
            className={`px-3.5 py-1.5 rounded-full font-['Rubik'] text-[15px] flex items-center gap-1.5 whitespace-nowrap transition-all duration-200 cursor-pointer ${
              geoScope === 'city'
                ? 'bg-[#ffc174] text-[#472a00] font-bold shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                : 'bg-[#282a2e] text-[#d8c3ad] hover:bg-[#37393e]'
            }`}
          >
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              apartment
            </span>
            <span>المدينة (عمان)</span>
          </button>

          <button
            onClick={() => setGeoScope('country')}
            className={`px-3.5 py-1.5 rounded-full font-['Rubik'] text-[15px] flex items-center gap-1.5 whitespace-nowrap transition-all duration-200 cursor-pointer ${
              geoScope === 'country'
                ? 'bg-[#ffc174] text-[#472a00] font-bold shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                : 'bg-[#282a2e] text-[#d8c3ad] hover:bg-[#37393e]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">flag</span>
            <span>المملكة (الأردن)</span>
          </button>
        </div>

        {/* Secondary Meta Row: Age Category & Period Toggle */}
        <div className="flex items-center justify-between gap-2">
          {/* Age Pills */}
          <div className="inline-flex p-0.5 rounded-lg bg-[#1a1c20] border border-[#282a2e]">
            {[
              { id: '+18', label: 'الكبار +18' },
              { id: 'u18', label: 'تحت 18' },
              { id: 'u16', label: 'تحت 16' },
            ].map((age) => (
              <button
                key={age.id}
                onClick={() => setAgeGroup(age.id as '+18' | 'u18' | 'u16')}
                className={`px-2.5 py-1 rounded-md font-['Plus_Jakarta_Sans'] text-[12px] transition-colors cursor-pointer ${
                  ageGroup === age.id
                    ? 'bg-[#282a2e] text-[#ffc174] font-semibold'
                    : 'text-[#d8c3ad] hover:text-[#e2e2e8]'
                }`}
              >
                {age.label}
              </button>
            ))}
          </div>

          {/* Timeframe Segmented Switch */}
          <div className="inline-flex p-0.5 rounded-lg bg-[#1a1c20] border border-[#282a2e]">
            {[
              { id: 'week', label: 'الأسبوع' },
              { id: 'month', label: 'الشهر' },
              { id: 'season', label: 'الموسم' },
            ].map((period) => (
              <button
                key={period.id}
                onClick={() => setTimeframe(period.id as 'week' | 'month' | 'season')}
                className={`px-2.5 py-1 rounded-md font-['Plus_Jakarta_Sans'] text-[12px] transition-colors cursor-pointer ${
                  timeframe === period.id
                    ? 'bg-[#37393e] text-[#e2e2e8] font-bold shadow-sm'
                    : 'text-[#d8c3ad] hover:text-[#e2e2e8]'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Neighborhood Podium (Top 3 Neighborhoods of Amman) */}
      <section className="px-3">
        <div className="relative overflow-hidden rounded-2xl bg-[#1a1c20] p-4 shadow-xl border border-[#282a2e]">
          {/* Atmospheric Backdrop Image */}
          <div
            className="absolute inset-0 opacity-20 bg-cover bg-center pointer-events-none"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBJu5jpTjifess_tr3eBc4wF6VFJgZBLvjX5Rg2Rkwbbf3VCGP_f3yqolB-gaL8oI-Nsyp_SrZ_RerfggPy9L2p3BKbswkMVwfJig-kQtLeXaNSWtoNtv2asqN-KAvnM9XI9Cl_LLOba3QrdTvNoKwbua02QymsUQ3lQVss5-NcWJylDnvewLhEB-Vy9NKA1JtvGpNgPiKTDTHL_b4itJz7RUYKHSdHhtWPG3ErRHNlR0Ub7IhA82I')",
            }}
          />

          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-3">
              <div className="flex items-center gap-1.5">
                <span
                  className="material-symbols-outlined text-[#ffc174] text-[22px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  military_tech
                </span>
                <h3 className="font-['Rubik'] text-[22px] text-[#e2e2e8] font-bold">
                  صدارة حارات عمان
                </h3>
              </div>
              <span className="font-['Space_Grotesk'] text-[11px] text-[#d8c3ad] tracking-wider uppercase">
                تحديث مباشر
              </span>
            </div>

            {/* 3-Column Visual Podium */}
            <div className="grid grid-cols-3 gap-2 w-full items-end pt-4 pb-2">
              {/* Rank #2: اللويبدة (Silver) */}
              <div className="flex flex-col items-center">
                <div className="relative mb-2">
                  <div className="w-14 h-14 rounded-full bg-[#333539] p-1 flex items-center justify-center shadow-md">
                    <img
                      className="w-full h-full object-cover rounded-full"
                      alt="اللويبدة"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFjunBFxydtbVo8qx5zpFKMZ-B3Ap9PaexpXb8TOh2Uj0p9QueC3revGK_MgbpQGbr8wDAh5fM38HKivB4-ma7RFSu6qn_xNDGCs7VFaNT92klu0mQCV2fLs05qa-aRBF6-eOK0hdNcyqg6e3TPgjEMRQ_s_D5bmr5tg8rOKeHa5HmOcZ02hoIct4lB-7pN7Fn1v3wCJab8xXZs_h19eNt4NMqkUWXZs2xa-7gA2ofOlSQPvDjLVY"
                    />
                  </div>
                  <div className="absolute -top-2 inset-x-0 flex justify-center">
                    <span
                      className="material-symbols-outlined text-[#d8c3ad] text-[20px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      workspace_premium
                    </span>
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#37393e] text-[#e2e2e8] font-['Space_Grotesk'] text-[11px] flex items-center justify-center font-bold">
                    2
                  </span>
                </div>
                <span className="font-['Rubik'] text-[18px] text-[#e2e2e8] text-center truncate max-w-full font-bold">
                  اللويبدة
                </span>
                <span className="font-['Space_Grotesk'] text-[16px] text-[#d8c3ad] mt-0.5 font-bold">
                  2,310
                </span>
                {/* Pedestal Pillar */}
                <div className="w-full h-20 mt-2 bg-gradient-to-t from-[#333539] to-[#1e2024] rounded-t-lg flex items-center justify-center border-t border-[#37393e]">
                  <span className="font-['Rubik'] text-[28px] text-[#d8c3ad]/40 font-black">
                    2
                  </span>
                </div>
              </div>

              {/* Rank #1: جبل الحسين (Gold Apex) */}
              <div className="flex flex-col items-center -mt-4">
                <div className="relative mb-2">
                  <div className="w-18 h-18 rounded-full bg-gradient-to-br from-[#ffc174] via-[#f59e0b] to-amber-700 p-1 flex items-center justify-center shadow-[0_0_24px_rgba(245,158,11,0.45)]">
                    <img
                      className="w-16 h-16 object-cover rounded-full"
                      alt="جبل الحسين"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBszetUQ7xHSDPEr49NSNBwNeGLeHptpIuBHUYhI1-YNFajPu68tYvbeKkOKBT-cx0yX6sCL-Tapr_WnXzJCi9vh4RnGO97RIkYpID_tIwkuCVCVqQDJwepxbevFuvfkw9KmvZeKM4E24wpYcJFrzhPup3JP6r3tsclfv6_VXdCRtizjzFetzG0QbgOwBfszf_bZC02tnL2SA6WTck07TEk6fZ4fNAwNHSY7MHUFBCR1lqsO0GecCg"
                    />
                  </div>
                  <div className="absolute -top-3 inset-x-0 flex justify-center animate-bounce">
                    <span
                      className="material-symbols-outlined text-[#ffc174] text-[28px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      crown
                    </span>
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#ffc174] text-[#472a00] font-['Space_Grotesk'] text-[11px] flex items-center justify-center font-black shadow-md">
                    1
                  </span>
                </div>
                <span className="font-['Rubik'] text-[22px] text-[#ffc174] font-black text-center truncate max-w-full">
                  جبل الحسين
                </span>
                <span className="font-['Space_Grotesk'] text-[24px] text-[#ffc174] font-black mt-0.5">
                  2,480
                </span>
                <span className="font-['Space_Grotesk'] text-[11px] text-[#4edea3] font-bold flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[12px]">arrow_upward</span> +140 ن
                </span>
                {/* Center Tall Pedestal Pillar */}
                <div className="w-full h-28 mt-2 bg-gradient-to-t from-[#ffc174]/20 via-[#333539] to-[#282a2e] rounded-t-xl flex flex-col items-center justify-center border-t-2 border-[#ffc174]">
                  <span className="material-symbols-outlined text-[#ffc174] text-[28px] mb-1">
                    local_fire_department
                  </span>
                  <span className="font-['Rubik'] text-[32px] text-[#ffc174] font-black leading-none">
                    1
                  </span>
                </div>
              </div>

              {/* Rank #3: العبدلي (Bronze) */}
              <div className="flex flex-col items-center">
                <div className="relative mb-2">
                  <div className="w-14 h-14 rounded-full bg-[#333539] p-1 flex items-center justify-center shadow-md">
                    <img
                      className="w-full h-full object-cover rounded-full"
                      alt="العبدلي"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAh1zzK3XcoqMxdU-Q5HehrDODKpGfLluyI8FZfyFWmDR8LWZlxcVrxSdgOu2VeQ8Epo_LXMXtkOxtT1N0AyObyUpwazvnvd5gl44bzS0Gcp8ASmynqt4TM3GckJm5DYRqIYcUtKGBDfjG6sUNgUCQZ_JC6Uj_xCHt5mNRUPUhmelqWjcUCsFSsSDpW9M60doJJoTygbxtBsrnfuJybPbk5OllChWKqabYZ_DNdoQUfneP57HOqY6U"
                    />
                  </div>
                  <div className="absolute -top-2 inset-x-0 flex justify-center">
                    <span
                      className="material-symbols-outlined text-[#a08e7a] text-[20px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      workspace_premium
                    </span>
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#37393e] text-[#e2e2e8] font-['Space_Grotesk'] text-[11px] flex items-center justify-center font-bold">
                    3
                  </span>
                </div>
                <span className="font-['Rubik'] text-[18px] text-[#e2e2e8] text-center truncate max-w-full font-bold">
                  العبدلي
                </span>
                <span className="font-['Space_Grotesk'] text-[16px] text-[#d8c3ad] mt-0.5 font-bold">
                  1,980
                </span>
                {/* Pedestal Pillar */}
                <div className="w-full h-16 mt-2 bg-gradient-to-t from-[#333539] to-[#1e2024] rounded-t-lg flex items-center justify-center border-t border-[#37393e]">
                  <span className="font-['Rubik'] text-[28px] text-[#d8c3ad]/40 font-black">
                    3
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Player of the Round Spotlight (Hero FIFA Card Preview) */}
      <section className="px-3">
        <div className="relative rounded-2xl bg-[#1e2024] overflow-hidden p-3.5 shadow-lg border border-[#282a2e]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4edea3] animate-pulse"></span>
              <span className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
                هداف الحارة الأسبوعي
              </span>
            </div>
            <span className="font-['Space_Grotesk'] text-[11px] text-[#ffc174] uppercase font-bold tracking-wider">
              بطاقة النجم
            </span>
          </div>

          {/* FIFA Card Strip */}
          <div
            onClick={onOpenPlayerCard}
            className="flex items-center gap-3 bg-[#1a1c20] rounded-xl p-2.5 relative border border-[#ffc174]/30 hover:border-[#ffc174] transition-all cursor-pointer group"
          >
            <div className="relative w-20 h-24 rounded-lg overflow-hidden shrink-0 bg-[#333539] shadow-inner">
              <img
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform"
                alt="أحمد النشمي"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbF9zW18KSRc3LZ2BUjIsfW1pmEGNvi8sE76nmGG-k0x0Uq8mtTyixcG_EfC8HVr8fG3ITZ6FQjds2J7mS8EJ6hLXG-7A2nLHrQTtFWoSJQ6ibHJhN8cZKZX8mi2sTGyVSmtD9rhx3TsqYWpZMbUV9E7R_SeF_kGtEvsxglu16nvbAfFrOmAtRgcMmGGAe_EKZuTOVgwfuJZLEWNViKDEGK3f7TBKZ7FizP3f0_Pf7i6UwiMRv0qQ"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#0c0e12] to-transparent h-8" />
              <span className="absolute top-1 right-1 font-['Space_Grotesk'] text-[9px] bg-[#ffc174] text-[#472a00] font-black px-1 rounded">
                ST
              </span>
            </div>

            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-['Rubik'] text-[22px] text-[#ffc174] font-black truncate">
                  أحمد النشمي
                </span>
                <span className="font-['Space_Grotesk'] text-[24px] text-[#4edea3] font-black">
                  94
                </span>
              </div>
              <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad]">
                @ahmad.10 • جبل الحسين
              </span>

              {/* Tactical Mini Stats Row */}
              <div className="grid grid-cols-4 gap-1 mt-2 text-center">
                <div className="bg-[#282a2e] rounded p-1">
                  <span className="block font-['Space_Grotesk'] text-[10px] text-[#d8c3ad]">
                    السرعة
                  </span>
                  <span className="font-['Space_Grotesk'] text-[13px] text-[#e2e2e8] font-bold">
                    92
                  </span>
                </div>
                <div className="bg-[#282a2e] rounded p-1">
                  <span className="block font-['Space_Grotesk'] text-[10px] text-[#d8c3ad]">
                    التسديد
                  </span>
                  <span className="font-['Space_Grotesk'] text-[13px] text-[#ffc174] font-bold">
                    96
                  </span>
                </div>
                <div className="bg-[#282a2e] rounded p-1">
                  <span className="block font-['Space_Grotesk'] text-[10px] text-[#d8c3ad]">
                    المراوغة
                  </span>
                  <span className="font-['Space_Grotesk'] text-[13px] text-[#e2e2e8] font-bold">
                    89
                  </span>
                </div>
                <div className="bg-[#282a2e] rounded p-1">
                  <span className="block font-['Space_Grotesk'] text-[10px] text-[#d8c3ad]">
                    البدنية
                  </span>
                  <span className="font-['Space_Grotesk'] text-[13px] text-[#4edea3] font-bold">
                    88
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Players Leaderboard List */}
      <section className="flex flex-col space-y-1.5 px-3">
        <div className="flex items-center justify-between pb-1 px-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="material-symbols-outlined text-[#ffc174] text-[20px] shrink-0">
              sports_soccer
            </span>
            <h3 className="font-['Rubik'] text-[17px] text-[#e2e2e8] font-bold truncate">
              متصدرو {activeCategoryMeta?.fullLabel}
            </h3>
            <span className="font-['Space_Grotesk'] text-[10px] bg-[#282a2e] text-[#ffc174] px-2 py-0.5 rounded-full font-bold border border-[#ffc174]/20 shrink-0">
              {activeCategoryMeta?.label}
            </span>
          </div>
          <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad] shrink-0">
            مرتب بنقاط Beta
          </span>
        </div>

        {/* Players List */}
        {topBallers.map((player) => (
          <div
            key={player.rank}
            className="flex items-center justify-between p-2.5 bg-[#1e2024] rounded-xl shadow-sm hover:bg-[#282a2e] transition-colors border border-[#282a2e]/60"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Rank Numeral & Movement */}
              <div className="flex flex-col items-center justify-center w-7 shrink-0">
                <span
                  className={`font-['Rubik'] text-[22px] font-black leading-none ${
                    player.rank === 1
                      ? 'text-[#ffc174]'
                      : player.rank === 2
                      ? 'text-[#e2e2e8]'
                      : player.rank === 3
                      ? 'text-[#a08e7a]'
                      : 'text-[#d8c3ad]'
                  }`}
                >
                  {player.rank}
                </span>
                <span
                  className={`material-symbols-outlined text-[14px] ${
                    player.trend === 'up'
                      ? 'text-[#4edea3]'
                      : player.trend === 'down'
                      ? 'text-[#ffb4ab]'
                      : 'text-[#4edea3]'
                  }`}
                >
                  {player.trendIcon}
                </span>
              </div>

              {/* Avatar & Verified Status */}
              <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 bg-[#333539]">
                <img className="w-full h-full object-cover" alt={player.name} src={player.avatar} />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#4edea3] rounded-full ring-2 ring-[#111317]"></div>
              </div>

              {/* Info Block */}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-['Rubik'] text-[16px] text-[#e2e2e8] font-bold truncate">
                    {player.name}
                  </span>
                  {player.star && (
                    <span
                      className="material-symbols-outlined text-[#ffc174] text-[16px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  )}
                  {player.tag && (
                    <span className="font-['Space_Grotesk'] text-[10px] bg-[#37393e] text-[#e2e2e8] px-1.5 py-0.2 rounded">
                      {player.tag}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad]">
                  <span>{player.role}</span>
                  <span>•</span>
                  <span>{player.matches} مباراة</span>
                  <span>•</span>
                  <span className={`${player.keyColor} font-bold`}>{player.keyStat}</span>
                </div>
              </div>
            </div>

            {/* Rating & Confidence Pill */}
            <div className="flex flex-col items-end shrink-0 pl-1">
              <span className="font-['Space_Grotesk'] text-[24px] text-[#ffc174] font-black">
                {player.points}
              </span>
              <span className="font-['Space_Grotesk'] text-[11px] text-[#4edea3] font-semibold bg-[#4edea3]/10 px-1.5 py-0.5 rounded">
                ثقة {player.confidence}
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* Interactive Community Rivalry Callout */}
      <section className="px-3">
        <div className="p-3.5 rounded-xl bg-[#282a2e] flex items-center justify-between gap-2 shadow-md border border-[#333539]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#333539] flex items-center justify-center text-[#ffc174] shrink-0">
              <span className="material-symbols-outlined text-[24px]">campaign</span>
            </div>
            <div className="flex flex-col">
              <span className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
                ديربي الحارة القادم!
              </span>
              <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad]">
                جبل الحسين ضد اللويبدة - ملعب النزهة
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              sfx.playSuccess();
              const team = prompt('توقع الفائز بالديربي: اكتب 1 لـ "جبل الحسين" أو 2 لـ "اللويبدة":', '1');
              if (team === '1') {
                setDerbyPrediction('جبل الحسين');
                alert('تم تسجيل توقعك: فوز جبل الحسين! ستحصل على +25 XP في حال صحة التوقع.');
              } else if (team === '2') {
                setDerbyPrediction('اللويبدة');
                alert('تم تسجيل توقعك: فوز اللويبدة! ستحصل على +25 XP في حال صحة التوقع.');
              }
            }}
            className="px-3.5 py-1.5 rounded-lg bg-[#ffc174] hover:bg-[#f59e0b] text-[#472a00] font-['Rubik'] text-[15px] font-bold shrink-0 transition-colors shadow-sm cursor-pointer"
          >
            {derbyPrediction ? `توقعك: ${derbyPrediction}` : 'توقع الفائز'}
          </button>
        </div>
      </section>

      {/* Sticky Bottom Floating HUD: 'ترتيبي في حارتي' (User Current Rank) */}
      <aside className="fixed bottom-16 inset-x-0 z-40 px-3 pointer-events-none pb-2">
        <div className="pointer-events-auto max-w-lg mx-auto bg-[#333539]/95 backdrop-blur-xl rounded-2xl p-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-center justify-between border border-[#ffc174]/30">
          {/* User Identification & Neighborhood Level */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-11 h-11 rounded-full overflow-hidden shrink-0 bg-[#ffc174]/20 p-0.5">
              <img
                className="w-full h-full object-cover rounded-full"
                alt="عمر أبوعلي"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAF334KkMX7vv951X1qXNNqdhaR8I6WKCk5PbfWcN5oLefE83Gy2wAq0c-SX7JeNcHYObtOnb8SPalUhpLwW3m9PktwuoikKaYwsDLA2RF_m7lCqz_EvoVtdWab33yBqJSo-S4dFbKC9QXER5qh0Hv2URvb5K8YTMdn4WqKlQ-gTsfL6yz_84fU45yDTE78VgWe2uHmJdXSfXAijGfeOBIzwuSu5uCZMMMwI-2B4zVGmz1MuEBDnHM"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#4edea3] ring-1 ring-[#111317]"></span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-['Space_Grotesk'] text-[11px] text-[#ffc174] font-black uppercase">
                  أنت هنا
                </span>
                <span className="font-['Rubik'] text-[16px] text-[#e2e2e8] font-bold truncate">
                  عمر أبوعلي
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad]">
                <span>
                  المرتبة <strong className="text-[#ffc174] font-bold">#12</strong> في جبل الحسين
                </span>
                <span className="text-[#4edea3] flex items-center text-[12px] font-bold">
                  <span className="material-symbols-outlined text-[14px]">arrow_upward</span> +3 هذا الأسبوع
                </span>
              </div>
            </div>
          </div>

          {/* Action Button & Elo Score */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="flex flex-col items-end pl-2">
              <span className="font-['Space_Grotesk'] text-[16px] text-[#ffc174] font-black">
                1,840
              </span>
              <span className="font-['Space_Grotesk'] text-[10px] text-[#d8c3ad]">
                تقييمك
              </span>
            </div>
            <button
              onClick={() =>
                onShareWhatsApp(
                  '🔥 تقييمي في منصة نجوم الحارة: 1,840 نقطة (المرتبة #12 في جبل الحسين)! شوف ترتيبك بحارتك.'
                )
              }
              className="h-10 px-3 rounded-xl bg-[#ffc174] hover:bg-[#f59e0b] text-[#472a00] font-['Rubik'] text-[15px] font-bold flex items-center gap-1 shadow-md transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
              <span className="hidden sm:inline">مشاركة</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
