import React, { useState } from 'react';
import { SquadSplitPlayer, FriendPlayer } from '../../types';
import { sfx } from '../../utils/audio';

interface FairSquadSplitterModalProps {
  isOpen: boolean;
  onClose: () => void;
  friends?: FriendPlayer[];
  onShareWhatsApp: (text: string) => void;
}

const INITIAL_ROSTER: SquadSplitPlayer[] = [
  {
    id: 'p-1',
    name: 'أحمد النعيمات (أنت)',
    rating: 8.6,
    position: 'مهاجم صريح',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAbbwjt_ifz791XqZqmpBhFqzPZ4O1cmfn_nYWmvFzqqYvQiK7kppf28SZcpwimiDhKWisG73S15JwiF9558NmQ2fPtKBGt4QaADKqv3NP4IonAzGDAscn-fZU6yIpkZZLRjRlcWloZjRw1S3Vj5on5WA3qfo0S0D0FW7eh_iFzmxZEzR5SZzr8xUvMemY7XQx5mWD64lBee1SfXdqBT4xlNcSRPLj-LAYwYHKgwNq4IVYsJVh0U0o',
    team: 'blue',
  },
  {
    id: 'p-2',
    name: 'عمر الدوسري',
    rating: 8.5,
    position: 'صانع ألعاب',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBir9R8_CcMjMLEhZ1nL_qUcNECyTBHf_fynAqL8eciHb2jvmXqOSL03C-sVv9m--Pwv93K2ECQ_IZkaIRtfFdiOE80-K2x7NyBGj5gKoV1JvibNcEStam1fZfxV1oXL9GnafXxNw5co-nWw_LfdcR9vQ8t9xygVhiBIyFkZqr_w9AyJ8M_U2ObOBMq992TUVG6_dwU1n2XAcFBFMIBa7ZgG_VI3bZXyA04OlHIMqiojdMhNxFMRik',
    team: 'orange',
  },
  {
    id: 'p-3',
    name: 'طارق الزعبي',
    rating: 8.2,
    position: 'صخرة دفاع',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3GdTY_aiB9ZkqL0Sv6dLoERK1pwPGFB8ecFpLSuGjjpH9RQCfwvrvYfnBa8M6BeSCuubVQOQk8SLQD7Gx82re7DDUTAAkrMQL2f4eAfx0u1J_eInvjCRhnKEmV5P_moaD9rGV72RCRWidVlgqTHdk_KuDpqEdX2N3e42G9s_EI6t98v8rR9AGHBdxFIDyhD230HU3SRm51yNZTk1-i3H9zbCO2eDnnRyBSrLvGVtze_dBl3MOUVE',
    team: 'blue',
  },
  {
    id: 'p-4',
    name: 'سيف العبدلي',
    rating: 8.4,
    position: 'جناح نفاثة',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBamGPqOtVb7h4STVARV0g-41PYD0z9wJPucv2hNZVs8cJDLYzJu370Owz9nAt2n7Giokh3jJG7m1sFSEv81yiCyZNuiyBaWqTJ330txgoMwIGQaCy_-PL-pJTpTGauREl4hJEdrMxb-p9oVwNEE7_sT_vyARv20HCWdKVnzkHeDcOvAIUixT2Hvyi_QZryy4OFPJCK46plbigpoOaNbz_hG2HQ1bX33NCN9BDjHofGfVXHouwPkVc',
    team: 'orange',
  },
  {
    id: 'p-5',
    name: 'حمزة الكيلاني',
    rating: 8.1,
    position: 'حارس أخطبوط',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDIVfkWerdRP4dTqGKhuNfnIrdDrt-1E491M5zte0RhRlYCPZoP_spOGBqeiPqnUmJSvcz30-BUZBjo44sG1Fn8_NRfjbY3DgBNdk0do3TlnPnk-U5Ll_ZzDa-dILOgSBd1A2426U8DCoSaTgKvHiqud0i9vcecYASsr8wANZ1ZDuPvRQgzbDPX4ikjK1DlPzT574sXxsnqRjsUpeqWva1C6Qzjf2mEY1Li55omD5hKZqYzLsvqfg0',
    team: 'blue',
  },
  {
    id: 'p-6',
    name: 'معتز الشريف',
    rating: 8.3,
    position: 'محور دفاعي',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5CKTm2Uh1cbUDwG3CRiNcx0ztVXu60fNA_-zyN51ved-r7_KYJXvpVK63O2x9Tl3Y2lqyhmFRLJjrUdHmIie5Lvv7g0t9t_uev1djU8bY2GzNo8131ZbKMgaGpB3RzQB_VNeychANoi7IKyMa3KBSAyiI8BIgHHipe9tqEVJtiZs4-8N0eIbC_R4ZLUYIcziGELhooO5WzVtxMgCEKibycBup3QWt6QwwoPz5MuzPvTw8fs_NpKI',
    team: 'orange',
  },
  {
    id: 'p-7',
    name: 'يوسف أبو هاشم',
    rating: 8.0,
    position: 'ظهير أيمن',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgt_dwHn9fut92to4azaDf4-yv8cZTp50ykkpwzaG3ibkKgBQoCjcdmWhHzo32cEalKT42b-tf66UatK-9APujy80fmTt3rEq5emwquxZ5Hwl3y0xI_8ZRG4GGpGtU1fuNiyQEZfrGQtPzbwVpTd-RLuQ0XPPz-4VazQ3085-N0hWaQ4DGEjJ_A6xWfqo82D0ALa4vXeHEH20rskgfKsOXndDIhu7ZR8u1jvdMlcPxXXBbgyixO2s',
    team: 'blue',
  },
  {
    id: 'p-8',
    name: 'نور العورتاني',
    rating: 7.9,
    position: 'حارس مرمى',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZFlF9IvQPNYUw-5bRLUgbeoq99r2GmuGFUXOHsKkfZoGTlMvJJxzR03lWboB0NKNb8lWiP7jKcJD4kFNNTSyXWGVEajVCJXPVbnOiH15yKuZoEEq5LNCpf-nEVBRRn0dOmkgxdjfHPek6CoGS89RchpVD4Hl6-LkZNMoFi47Lxax0ymxKO63Kn9F3B4yakmFrsRo5Ic3X5YYVH-HepSAYYm5J8-PgM_AWCUMERWR-CbLGS3ohEXw',
    team: 'orange',
  },
  {
    id: 'p-9',
    name: 'ليث أبو رمان',
    rating: 7.8,
    position: 'وسط مهاجم',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCuQPDO_Cx_ujF39eKxH38deHFy1A4-rQj-u7bS5IYDsT3ZmYmiBq_7zpUH4PyHQyTDKw-7fGjsy3RIDrgEOxsrJdVJjEU0AdTiGfbheZNSpkm3j4_f7AQvUipusq6kyJxdq3Up4jtgaQJRT0HTbO0zepik4PQ4oBV_mlPNsg_dQey_mmngTK5pXSzyf_mmoi2YMMzCmznQRyhNYBK_BQ162PjKxcyiqiC2nFlf8BXIJOhIHsIVwBM',
    team: 'blue',
  },
  {
    id: 'p-10',
    name: 'عمر الشويكي',
    rating: 7.7,
    position: 'مدافع قشاش',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDi0nOD11zpkXLzSXL_2NhPIoWAQcbnPa9Fkl7eG7EkbEantmDVGkoqqmjrq30eMEVxPLBk6iW_ua_jyRL9m9ISzETBRTSBGnL7Wg0ykzOMo9HrdpLw31qZZPBjDWCFVABoeiNs4SFizmKK0RaFOhBJBJY1a4npKikHheLCbUh8MUeJm6qWrpWW5uke3fXPa_ojW8-4vZ6ZmEJAOErvlsEKzbIwdXF-38hf5e2YZQpRB-ZiUFWv0_g',
    team: 'orange',
  },
];

export const FairSquadSplitterModal: React.FC<FairSquadSplitterModalProps> = ({
  isOpen,
  onClose,
  onShareWhatsApp,
}) => {
  const [players, setPlayers] = useState<SquadSplitPlayer[]>(INITIAL_ROSTER);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isFlippingCoin, setIsFlippingCoin] = useState(false);
  const [coinResult, setCoinResult] = useState<'blue' | 'orange' | null>(null);
  const [coinSideChoice, setCoinSideChoice] = useState<'ball' | 'pitch'>('ball');

  if (!isOpen) return null;

  const bluePlayers = players.filter((p) => p.team === 'blue');
  const orangePlayers = players.filter((p) => p.team === 'orange');
  const benchPlayers = players.filter((p) => p.team === 'bench');

  const calcAverage = (list: SquadSplitPlayer[]) => {
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, p) => acc + p.rating, 0);
    return Number((sum / list.length).toFixed(1));
  };

  const blueAvg = calcAverage(bluePlayers);
  const orangeAvg = calcAverage(orangePlayers);
  const ratingDiff = Math.abs(blueAvg - orangeAvg).toFixed(1);

  // Smart Balanced Split Algorithm (Greedy alternating by rating)
  const handleSmartSplit = () => {
    sfx.playWhistle();
    // Sort players who are currently active (blue or orange) descending by rating
    const active = players.filter((p) => p.team !== 'bench');
    const sorted = [...active].sort((a, b) => b.rating - a.rating);

    const newBlue: SquadSplitPlayer[] = [];
    const newOrange: SquadSplitPlayer[] = [];

    let blueSum = 0;
    let orangeSum = 0;

    sorted.forEach((player) => {
      // If team sizes are unequal, put in smaller team
      if (newBlue.length < newOrange.length) {
        newBlue.push({ ...player, team: 'blue' });
        blueSum += player.rating;
      } else if (newOrange.length < newBlue.length) {
        newOrange.push({ ...player, team: 'orange' });
        orangeSum += player.rating;
      } else {
        // Equal sizes: put in the team with smaller current sum
        if (blueSum <= orangeSum) {
          newBlue.push({ ...player, team: 'blue' });
          blueSum += player.rating;
        } else {
          newOrange.push({ ...player, team: 'orange' });
          orangeSum += player.rating;
        }
      }
    });

    const benched = players.filter((p) => p.team === 'bench');
    setPlayers([...newBlue, ...newOrange, ...benched]);
  };

  // Full Random Shuffle Split
  const handleRandomSplit = () => {
    sfx.playClipBeep();
    const active = players.filter((p) => p.team !== 'bench');
    const shuffled = [...active].sort(() => Math.random() - 0.5);
    const half = Math.ceil(shuffled.length / 2);

    const newPlayers = players.map((p) => {
      if (p.team === 'bench') return p;
      const idx = shuffled.findIndex((item) => item.id === p.id);
      return {
        ...p,
        team: (idx < half ? 'blue' : 'orange') as 'blue' | 'orange',
      };
    });

    setPlayers(newPlayers);
  };

  // Toggle player to opposite team or bench
  const handleSwitchTeam = (player: SquadSplitPlayer) => {
    sfx.playDing();
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== player.id) return p;
        if (p.team === 'blue') return { ...p, team: 'orange' };
        if (p.team === 'orange') return { ...p, team: 'blue' };
        return { ...p, team: 'blue' };
      })
    );
  };

  const handleToggleBench = (player: SquadSplitPlayer) => {
    sfx.playDing();
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== player.id) return p;
        return {
          ...p,
          team: p.team === 'bench' ? 'blue' : 'bench',
        };
      })
    );
  };

  // Quick Add Player
  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    sfx.playSuccess();
    const newP: SquadSplitPlayer = {
      id: `p-${Date.now()}`,
      name: newPlayerName.trim(),
      rating: 8.0,
      position: 'لاعب حارة',
      avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBir9R8_CcMjMLEhZ1nL_qUcNECyTBHf_fynAqL8eciHb2jvmXqOSL03C-sVv9m--Pwv93K2ECQ_IZkaIRtfFdiOE80-K2x7NyBGj5gKoV1JvibNcEStam1fZfxV1oXL9GnafXxNw5co-nWw_LfdcR9vQ8t9xygVhiBIyFkZqr_w9AyJ8M_U2ObOBMq992TUVG6_dwU1n2XAcFBFMIBa7ZgG_VI3bZXyA04OlHIMqiojdMhNxFMRik',
      team: bluePlayers.length <= orangePlayers.length ? 'blue' : 'orange',
    };
    setPlayers((prev) => [...prev, newP]);
    setNewPlayerName('');
  };

  // Coin Toss Simulation
  const handleCoinToss = () => {
    sfx.playCoinToss();
    setIsFlippingCoin(true);
    setCoinResult(null);

    setTimeout(() => {
      const outcome: 'blue' | 'orange' = Math.random() > 0.5 ? 'blue' : 'orange';
      setCoinResult(outcome);
      setIsFlippingCoin(false);
      sfx.playWhistle();
    }, 1200);
  };

  // WhatsApp Share Builder
  const handleShareLineup = () => {
    const text = `⚽ *قرعة وتشكيلة مباراة اليوم - نجوم الحارة* ⚽\n` +
      `🏟️ *ملعب جبل الحسين*\n\n` +
      `🔵 *الفريق الأزرق* (معدل ${blueAvg}⭐ - ${bluePlayers.length} لاعبين):\n` +
      bluePlayers.map((p, i) => `${i + 1}. ${p.name} (${p.position})`).join('\n') +
      `\n\n🟠 *الفريق البرتقالي* (معدل ${orangeAvg}⭐ - ${orangePlayers.length} لاعبين):\n` +
      orangePlayers.map((p, i) => `${i + 1}. ${p.name} (${p.position})`).join('\n') +
      (coinResult
        ? `\n\n🪙 *نتيجة القرعة:* ${coinResult === 'blue' ? 'الفريق الأزرق' : 'الفريق البرتقالي'} فاز بالقرعة وله ${coinSideChoice === 'ball' ? 'ضربة البداية ⚽' : 'اختيار المرمى 🥅'}!`
        : '') +
      `\n\nجاهزون للمباراة! حياكم الله يا شباب 🔥`;

    onShareWhatsApp(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-lg bg-[#16181d] border border-[#282a2e] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-[#e2e2e8]">
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-[#1e2024] to-[#16181d] border-b border-[#282a2e] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/20 text-[#ffc174] flex items-center justify-center border border-[#f59e0b]/30">
              <span className="material-symbols-outlined text-[24px]">balance</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
                  قرعة وتشكيلة الفريقين المتوازنة
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#00a572]/20 text-[#4edea3] text-[10px] font-['Space_Grotesk'] font-bold border border-[#00a572]/30">
                  Fair Split
                </span>
              </div>
              <p className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad]">
                توزيع عادل للاعبي الحارة لمنع سيطرة فريق على الآخر
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
          {/* Quick Balance Status HUD */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#1e2024] border border-[#282a2e]">
            {/* Blue Stats */}
            <div className="flex flex-col items-center text-center p-2 rounded-lg bg-[#1d4ed8]/15 border border-[#2563eb]/30">
              <span className="font-['Space_Grotesk'] text-[11px] text-[#60a5fa] font-bold">
                الأزرق ({bluePlayers.length})
              </span>
              <span className="font-['Space_Grotesk'] text-[20px] text-white font-extrabold mt-0.5">
                {blueAvg}
              </span>
              <span className="text-[10px] text-[#93c5fd]">معدل القوة</span>
            </div>

            {/* Difference / Balance Meter */}
            <div className="flex flex-col items-center justify-center text-center p-1">
              <span className="material-symbols-outlined text-[#ffc174] text-[20px]">
                {Number(ratingDiff) <= 0.2 ? 'check_circle' : 'swap_horiz'}
              </span>
              <span className="font-['Space_Grotesk'] text-[12px] font-bold text-[#ffc174] mt-0.5">
                فارق {ratingDiff}
              </span>
              <span className="text-[10px] text-[#d8c3ad]">
                {Number(ratingDiff) <= 0.2 ? 'موزون تماماً' : 'متفاوت بسيط'}
              </span>
            </div>

            {/* Orange Stats */}
            <div className="flex flex-col items-center text-center p-2 rounded-lg bg-[#f59e0b]/15 border border-[#f59e0b]/30">
              <span className="font-['Space_Grotesk'] text-[11px] text-[#ffc174] font-bold">
                البرتقالي ({orangePlayers.length})
              </span>
              <span className="font-['Space_Grotesk'] text-[20px] text-white font-extrabold mt-0.5">
                {orangeAvg}
              </span>
              <span className="text-[10px] text-[#fcd34d]">معدل القوة</span>
            </div>
          </div>

          {/* Generator Actions Bar */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSmartSplit}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#00a572] to-[#047857] hover:brightness-110 text-white font-['Rubik'] text-[13px] font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
              <span>تقسيم ذكي متوازن</span>
            </button>
            <button
              onClick={handleRandomSplit}
              className="py-2.5 px-3 rounded-xl bg-[#282a2e] hover:bg-[#333539] text-[#e2e2e8] font-['Rubik'] text-[13px] font-bold flex items-center justify-center gap-1.5 border border-[#37393e] active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">casino</span>
              <span>قرعة عشوائية كاملة</span>
            </button>
          </div>

          {/* Interactive Coin Toss Widget (قرعة العملة للبداية والملعب) */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#1e2024] to-[#121417] border border-[#ffc174]/20 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffc174] text-[18px]">
                  monetization_on
                </span>
                <span className="font-['Rubik'] text-[14px] text-white font-bold">
                  رمي القرعة الرقمي (Coin Toss)
                </span>
              </div>
              <div className="flex items-center gap-1 bg-[#111317] p-0.5 rounded-lg border border-[#282a2e]">
                <button
                  onClick={() => setCoinSideChoice('ball')}
                  className={`px-2 py-0.5 rounded text-[11px] font-['Rubik'] transition-all ${
                    coinSideChoice === 'ball'
                      ? 'bg-[#ffc174] text-[#472a00] font-bold'
                      : 'text-[#d8c3ad]'
                  }`}
                >
                  الكرة ⚽
                </button>
                <button
                  onClick={() => setCoinSideChoice('pitch')}
                  className={`px-2 py-0.5 rounded text-[11px] font-['Rubik'] transition-all ${
                    coinSideChoice === 'pitch'
                      ? 'bg-[#ffc174] text-[#472a00] font-bold'
                      : 'text-[#d8c3ad]'
                  }`}
                >
                  الملعب 🥅
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 text-right">
                <p className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad]">
                  حدد من يستفتح ضربة البداية أو يختار جهة المرمى لمنع أي خلاف قبل الصافرة.
                </p>
                {coinResult && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ffc174]/20 text-[#ffc174] text-[12px] font-['Rubik'] font-bold border border-[#ffc174]/40 animate-fadeIn">
                    <span>🎉 فاز بالقرعة:</span>
                    <span>
                      {coinResult === 'blue' ? '🔵 الفريق الأزرق' : '🟠 الفريق البرتقالي'}
                    </span>
                  </div>
                )}
              </div>

              {/* Tactile Flip Button */}
              <button
                onClick={handleCoinToss}
                disabled={isFlippingCoin}
                className={`relative w-16 h-16 rounded-full flex flex-col items-center justify-center shrink-0 shadow-lg cursor-pointer transition-all active:scale-95 ${
                  isFlippingCoin
                    ? 'animate-spin bg-gradient-to-tr from-[#f59e0b] to-[#fbbf24] text-[#472a00]'
                    : coinResult === 'blue'
                    ? 'bg-[#2563eb] text-white border-2 border-[#60a5fa]'
                    : coinResult === 'orange'
                    ? 'bg-[#ea580c] text-white border-2 border-[#fdba74]'
                    : 'bg-gradient-to-tr from-[#d97706] to-[#f59e0b] text-[#472a00] border-2 border-[#fef08a]'
                }`}
              >
                <span className="material-symbols-outlined text-[28px]">
                  {isFlippingCoin ? 'autorenew' : 'toll'}
                </span>
                <span className="font-['Rubik'] text-[10px] font-extrabold leading-none mt-0.5">
                  {isFlippingCoin ? '...' : 'ارمِ'}
                </span>
              </button>
            </div>
          </div>

          {/* Quick Add Player Form */}
          <form onSubmit={handleAddPlayer} className="flex gap-2">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="أضف لاعب حاضر بالملعب (مثلاً: أبو وسام)"
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

          {/* Dual Team Lineups (Interactive Tactical Cards) */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Team Blue Column */}
            <div className="flex flex-col rounded-xl bg-[#141824] border border-[#1d4ed8]/40 p-2.5 shadow-md">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1d4ed8]/30">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#3b82f6] shadow-[0_0_8px_#3b82f6]"></span>
                  <span className="font-['Rubik'] text-[13px] text-[#93c5fd] font-bold">
                    الفريق الأزرق
                  </span>
                </div>
                <span className="font-['Space_Grotesk'] text-[11px] text-[#60a5fa] font-bold">
                  {bluePlayers.length}
                </span>
              </div>

              <div className="space-y-1.5">
                {bluePlayers.map((player) => (
                  <div
                    key={player.id}
                    className="p-1.5 rounded-lg bg-[#1a2035] hover:bg-[#202844] flex items-center justify-between text-right border border-[#2563eb]/20 group transition-all"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <img
                        src={player.avatarUrl}
                        alt={player.name}
                        className="w-7 h-7 rounded-full object-cover shrink-0 border border-[#3b82f6]/40"
                      />
                      <div className="min-w-0">
                        <div className="font-['Rubik'] text-[11px] text-white font-bold truncate">
                          {player.name}
                        </div>
                        <div className="text-[9px] text-[#93c5fd] font-['Plus_Jakarta_Sans'] truncate">
                          {player.position}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-['Space_Grotesk'] text-[10px] text-[#ffc174] font-bold">
                        {player.rating}
                      </span>
                      <button
                        onClick={() => handleSwitchTeam(player)}
                        title="انقل للفريق البرتقالي"
                        className="w-6 h-6 rounded bg-[#282a2e] text-[#d8c3ad] hover:text-[#ffc174] hover:bg-[#333539] flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                ))}
                {bluePlayers.length === 0 && (
                  <div className="text-center py-4 text-[11px] text-[#8d725a]">
                    لا يوجد لاعبون
                  </div>
                )}
              </div>
            </div>

            {/* Team Orange Column */}
            <div className="flex flex-col rounded-xl bg-[#241a14] border border-[#f59e0b]/40 p-2.5 shadow-md">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#f59e0b]/30">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]"></span>
                  <span className="font-['Rubik'] text-[13px] text-[#fcd34d] font-bold">
                    الفريق البرتقالي
                  </span>
                </div>
                <span className="font-['Space_Grotesk'] text-[11px] text-[#ffc174] font-bold">
                  {orangePlayers.length}
                </span>
              </div>

              <div className="space-y-1.5">
                {orangePlayers.map((player) => (
                  <div
                    key={player.id}
                    className="p-1.5 rounded-lg bg-[#35251a] hover:bg-[#442f20] flex items-center justify-between text-right border border-[#f59e0b]/20 group transition-all"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <img
                        src={player.avatarUrl}
                        alt={player.name}
                        className="w-7 h-7 rounded-full object-cover shrink-0 border border-[#f59e0b]/40"
                      />
                      <div className="min-w-0">
                        <div className="font-['Rubik'] text-[11px] text-white font-bold truncate">
                          {player.name}
                        </div>
                        <div className="text-[9px] text-[#fcd34d] font-['Plus_Jakarta_Sans'] truncate">
                          {player.position}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-['Space_Grotesk'] text-[10px] text-[#ffc174] font-bold">
                        {player.rating}
                      </span>
                      <button
                        onClick={() => handleSwitchTeam(player)}
                        title="انقل للفريق الأزرق"
                        className="w-6 h-6 rounded bg-[#282a2e] text-[#d8c3ad] hover:text-[#60a5fa] hover:bg-[#333539] flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                      </button>
                    </div>
                  </div>
                ))}
                {orangePlayers.length === 0 && (
                  <div className="text-center py-4 text-[11px] text-[#8d725a]">
                    لا يوجد لاعبون
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bench Reserve Stack (if any) */}
          {benchPlayers.length > 0 && (
            <div className="p-2.5 rounded-xl bg-[#1e2024] border border-[#282a2e]">
              <span className="font-['Rubik'] text-[12px] text-[#d8c3ad] font-bold block mb-1.5">
                دكة البدلاء ({benchPlayers.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {benchPlayers.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleToggleBench(player)}
                    className="px-2 py-1 rounded bg-[#282a2e] hover:bg-[#333539] text-[11px] text-white flex items-center gap-1 border border-[#37393e] cursor-pointer"
                  >
                    <span>{player.name}</span>
                    <span className="text-[#4edea3] text-[10px]">+ إدخال</span>
                  </button>
                ))}
              </div>
            </div>
          )}
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
            onClick={handleShareLineup}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#25d366] hover:bg-[#20ba5a] active:scale-95 text-[#003816] font-['Rubik'] text-[13px] font-extrabold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
            <span>مشاركة التشكيلة لقروب الواتساب 💬</span>
          </button>
        </div>
      </div>
    </div>
  );
};
