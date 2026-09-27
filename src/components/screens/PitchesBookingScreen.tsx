import React, { useState } from 'react';
import { Pitch } from '../../types';
import { sfx } from '../../utils/audio';

interface PitchesBookingScreenProps {
  onOpenBookingModal: (pitch: Pitch, selectedSlot?: string) => void;
  onOpenMissingOne: () => void;
  onShareWhatsApp: (text: string) => void;
}

export const PitchesBookingScreen: React.FC<PitchesBookingScreenProps> = ({
  onOpenBookingModal,
  onOpenMissingOne,
  onShareWhatsApp,
}) => {
  const [selectedDistrict, setSelectedDistrict] = useState('hussein');
  const [showMap, setShowMap] = useState(false);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState('all');
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string>>({
    'pitch-hussein': '10:00 م',
    'pitch-kursi': '8:00 م',
    'pitch-nuzha': '10:30 م',
  });

  const dates = [
    { label: 'اليوم', date: '28 أيلول' },
    { label: 'غداً', date: '29 أيلول' },
    { label: 'الجمعة', date: '30 أيلول' },
    { label: 'السبت', date: '1 تشرين' },
  ];

  const formats = [
    { id: 'all', label: 'الكل (18 ملعب)' },
    { id: '5v5', label: '5 ضد 5' },
    { id: '6v6', label: '6 ضد 6' },
    { id: '7v7', label: '7 ضد 7' },
    { id: 'indoor', label: 'مغطى صالات' },
  ];

  const pitches: Pitch[] = [
    {
      id: 'pitch-hussein',
      name: 'ملعب جبل الحسين الأسطوري',
      district: 'جبل الحسين • عمان',
      pricePerHour: 18,
      rating: 4.8,
      reviewCount: 140,
      format: '6 ضد 6',
      surface: 'عشب معتمد',
      isHdCameraVerified: true,
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAk4m9oEmvPJhVvpDJLR0JryRWdSQ7MmLYuNRSlordxcyK-cNwoDyBTyeoUJBELc84RWPFQeudhRO-XbjPR6nn1IPW8Y30tcW4l8QTjO5kMCK0lotyNfoNlIgM_JlCeqXiZ_01Xeg2JajNsn4dgYJZqasyd9cni1l0FxgzxWZQ85T82Ahzia126VwrneFA5wm-IM8so-UPmgCYf64DQpEFYxrHKcXFSWX3kViTrvK-8TdmfeO57g6A',
      timeSlots: [
        { time: '7:00 م', status: 'booked' },
        { time: '8:30 م', status: 'available' },
        { time: '10:00 م', status: 'selected' },
        { time: '11:30 م', status: 'available' },
      ],
    },
    {
      id: 'pitch-kursi',
      name: 'ملعب الكرسي الملكي',
      district: 'الكرسي / دابوق',
      pricePerHour: 22,
      rating: 4.9,
      reviewCount: 89,
      format: '7 ضد 7',
      surface: 'مساحة دولية',
      isHdCameraVerified: true,
      isElite7v7: true,
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAo-R2CFZBz9EG1ygG6Vr9Qx3n2hrlB73G4UUrZzIdZTU_7qglV-xCaUR3WebNuAjGykit3quSLFaBjX_CjvQJXwIhEuybm-LEkH651JKVyZQg-NIrSflMK09VxLtw51zM-Ai3OLDq5Q8cN5uQzVktlgaRLQZVvnIiAmsERA-5J5j2Yy0LQm7kfdIsMyEwMCAr2EUFm2TxW1nFMvZqoUS0KuaSnpv5ZFXqiWwHYri6YKMZnEiLrHEU',
      timeSlots: [
        { time: '8:00 م', status: 'available' },
        { time: '9:30 م', status: 'available' },
      ],
    },
    {
      id: 'pitch-nuzha',
      name: 'ملعب حديقة النزهة الشعبي',
      district: 'النزهة والهاشمي الشمالي',
      pricePerHour: 15,
      rating: 4.6,
      reviewCount: 210,
      format: '5 ضد 5 كيج',
      surface: 'عشب صناعي',
      isHdCameraVerified: false,
      isUrgentPlayersNeeded: true,
      urgentText: 'مطلوب لاعبين الآن',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCRSd2RHGhP1ILuukaulJZn-rX5t6bQkUxWGP-Kk9K9fxHTmBdh1covzDQcaspeJHQ6IJam9hWg83vVezRm9uCgnVzUfAwv-Iheb6pv0h7acBOHO5fD9YjNGw3HtW3BvJN8F9_JLAfKejnqcd7EkNXru0F8j6VEBYNDewBeyt86qgmmD-b565k0rko98JgM6PHCbqK0yCr73mqQO-AG1WvQ-oyiJKj-SpRGTzUDkq7wPOExqJJBZ3M',
      timeSlots: [
        { time: '10:30 م', status: 'available' },
        { time: '12:00 منتصف الليل', status: 'available' },
      ],
    },
  ];

  const handleSelectSlot = (pitchId: string, time: string) => {
    sfx.playClipBeep();
    setSelectedSlots((prev) => ({ ...prev, [pitchId]: time }));
  };

  const handleBookClick = (pitch: Pitch) => {
    sfx.playSuccess();
    onOpenBookingModal(pitch, selectedSlots[pitch.id]);
  };

  return (
    <div className="flex flex-col w-full pb-8 px-4 space-y-4">
      {/* Interactive Search & Neighborhood Selector */}
      <div className="flex flex-col gap-2 bg-[#1e2024] rounded-xl p-3 shadow-md border border-[#282a2e]/60">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-1 bg-[#1a1c20] rounded-lg px-3 py-2 border border-[#282a2e]/40">
            <span className="material-symbols-outlined text-[#ffc174] text-[20px]">location_on</span>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-['Space_Grotesk'] text-[11px] text-[#d8c3ad] leading-none">
                المنطقة المختارة • AMMAN
              </span>
              <select
                aria-label="اختر المنطقة"
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="bg-transparent font-['Rubik'] text-[15px] font-bold text-[#e2e2e8] outline-none cursor-pointer py-0.5"
              >
                <option className="bg-[#282a2e] text-[#e2e2e8]" value="all">
                  عَمّان بالكامل (كل الأحياء)
                </option>
                <option className="bg-[#282a2e] text-[#e2e2e8]" value="hussein">
                  جبل الحسين (Jabal Al-Hussein)
                </option>
                <option className="bg-[#282a2e] text-[#e2e2e8]" value="kursi">
                  الكرسي ودابوق (Al-Kursi)
                </option>
                <option className="bg-[#282a2e] text-[#e2e2e8]" value="jubeiha">
                  الجبيهة وصويلح (Jubeiha)
                </option>
                <option className="bg-[#282a2e] text-[#e2e2e8]" value="nuzha">
                  النزهة والهاشمي (Al-Nuzha)
                </option>
              </select>
            </div>
          </div>

          <button
            onClick={() => {
              sfx.playClipBeep();
              setShowMap(!showMap);
            }}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg transition-colors shadow-sm shrink-0 cursor-pointer ${
              showMap
                ? 'bg-[#00a572] text-[#00311f]'
                : 'bg-[#282a2e] hover:bg-[#333539] text-[#e2e2e8]'
            }`}
          >
            <span className="material-symbols-outlined text-[#4edea3] text-[20px]">map</span>
            <span className="font-['Space_Grotesk'] text-[11px] font-bold">
              {showMap ? 'إغلاق الخريطة' : 'الخريطة'}
            </span>
          </button>
        </div>

        {/* Live Date Strip */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {dates.map((item, idx) => {
            const isSelected = selectedDateIndex === idx;
            return (
              <button
                key={idx}
                onClick={() => {
                  sfx.playClipBeep();
                  setSelectedDateIndex(idx);
                }}
                className={`shrink-0 flex flex-col items-center justify-center min-w-[76px] py-1.5 px-2 rounded-lg font-bold shadow-sm transition-transform active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-[#f59e0b] text-[#472a00]'
                    : 'bg-[#1a1c20] hover:bg-[#282a2e] text-[#d8c3ad] hover:text-[#e2e2e8]'
                }`}
              >
                <span className="font-['Space_Grotesk'] text-[10px] uppercase tracking-wider opacity-90">
                  {item.label}
                </span>
                <span className="font-['Space_Grotesk'] text-[16px]">
                  {item.date}
                </span>
              </button>
            );
          })}
        </div>

        {/* Pitch Format Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {formats.map((fmt) => {
            const isSelected = selectedFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                onClick={() => setSelectedFormat(fmt.id)}
                className={`shrink-0 px-3 py-1 rounded-full font-['Space_Grotesk'] text-[11px] font-bold shadow-sm transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#00a572] text-[#00311f]'
                    : 'bg-[#1a1c20] hover:bg-[#282a2e] text-[#d8c3ad]'
                }`}
              >
                {fmt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Drawer View (when toggled) */}
      {showMap && (
        <div className="flex flex-col bg-[#282a2e] rounded-xl p-3 space-y-3 shadow-2xl border border-[#ffc174]/20 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#4edea3] text-[20px]">explore</span>
              <span className="font-['Rubik'] text-[16px] text-[#e2e2e8] font-bold">
                خريطة ملاعب عمان المضاءة
              </span>
            </div>
            <button
              onClick={() => setShowMap(false)}
              className="w-7 h-7 rounded-full bg-[#1e2024] flex items-center justify-center text-[#d8c3ad] hover:text-[#e2e2e8] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
          <div
            className="w-full h-52 bg-[#1a1c20] rounded-lg overflow-hidden relative shadow-inner bg-cover bg-center border border-[#333539]"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCAcZV9St3JmsIDWT0nhEIXSdnG0TNwWcdgikcjQWTHJ0HSbFJhRreskyp9wU8uuXlyaMvXVUvczcspaN6HQQVv7LzHQQifkkpY8K0XqNGD1NPSHSiWNeHots148Pz0FioNttLDSCEOxsA4T9rTRW1oSK5RedBLqR_jHa6Vc9Entc_l56EQ5bAuZbgq_JOk_0CzJ1_peluBCYypJVo8g5Nm52JHTiAliqJNcctguzK-X7fhOZjjPWk')",
            }}
          >
            {/* Simulated Live Pitch Radar Pins */}
            <div
              onClick={() => handleBookClick(pitches[0])}
              className="absolute top-1/4 left-1/3 flex flex-col items-center cursor-pointer group"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-[#f59e0b] animate-ping"></span>
              <span className="px-1.5 py-0.5 rounded bg-[#111317]/95 text-[#ffc174] font-['Space_Grotesk'] text-[9px] font-bold shadow-md group-hover:scale-110 transition-transform">
                جبل الحسين 18 د.أ
              </span>
            </div>
            <div
              onClick={() => handleBookClick(pitches[1])}
              className="absolute bottom-1/3 right-1/4 flex flex-col items-center cursor-pointer group"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-[#4edea3]"></span>
              <span className="px-1.5 py-0.5 rounded bg-[#111317]/95 text-[#4edea3] font-['Space_Grotesk'] text-[9px] font-bold shadow-md group-hover:scale-110 transition-transform">
                الكرسي 22 د.أ
              </span>
            </div>
            <div
              onClick={() => onOpenMissingOne()}
              className="absolute top-1/2 right-1/3 flex flex-col items-center cursor-pointer group"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-[#ffb4ab] animate-pulse"></span>
              <span className="px-1.5 py-0.5 rounded bg-[#111317]/95 text-[#ffb4ab] font-['Space_Grotesk'] text-[9px] font-bold shadow-md group-hover:scale-110 transition-transform">
                النزهة: ناقص لاعب!
              </span>
            </div>
          </div>
          <p className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad] text-center">
            اضغط على أي دبوس لمشاهدة توافر الحصص والمسافة المباشرة من موقعك
          </p>
        </div>
      )}

      {/* Neighborhood Pulse Alert: Missing One / ناقصنا واحد */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-l from-[#93000a]/40 via-[#1e2024] to-[#1e2024] p-3 flex items-center justify-between gap-3 shadow-md border border-[#93000a]/40">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#ffb4ab]/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#ffb4ab] text-[22px] animate-pulse">
              group_add
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-['Rubik'] text-[14px] text-[#ffb4ab] font-bold truncate">
                مباراة عاجلة: ناقصنا حارس ولاعب!
              </span>
              <span className="inline-block w-2 h-2 rounded-full bg-[#ffb4ab] animate-ping"></span>
            </div>
            <p className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad] truncate">
              ملعب حديقة النزهة • يبدأ بعد 40 دقيقة (الحجز مدفوع)
            </p>
          </div>
        </div>
        <button
          onClick={onOpenMissingOne}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-[#93000a] hover:bg-[#b91c1c] text-[#ffdad6] font-['Space_Grotesk'] text-[11px] font-bold transition-all shadow-md active:scale-95 cursor-pointer"
        >
          انضمام سريع
        </button>
      </div>

      {/* Section Title */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#ffc174] text-[20px]">sports_soccer</span>
          <h2 className="font-['Rubik'] text-[22px] text-[#e2e2e8] font-extrabold tracking-tight">
            ملاعب الحارة الليلة
          </h2>
        </div>
        <span className="font-['Space_Grotesk'] text-[11px] text-[#ffb95f] bg-[#1e2024] px-2 py-0.5 rounded-md border border-[#282a2e]">
          إضاءة ليلية عالية ⚡
        </span>
      </div>

      {/* Pitch Card 1: Jabal Al-Hussein (Hero Spotlight Pitch) */}
      <article className="flex flex-col bg-[#1e2024] rounded-xl overflow-hidden shadow-xl border border-[#282a2e] transition-all hover:border-[#ffc174]/40">
        <div className="relative w-full h-44 bg-[#282a2e] overflow-hidden">
          <img
            alt={pitches[0].name}
            className="w-full h-full object-cover"
            src={pitches[0].imageUrl}
          />
          {/* Top Badges Overlay */}
          <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#111317]/85 backdrop-blur-md text-[#4edea3] font-['Space_Grotesk'] text-[11px] font-bold shadow-sm">
              <span className="material-symbols-outlined text-[14px]">videocam</span>
              موثق بكاميرا HD
            </span>
            <button
              onClick={() => sfx.playClipBeep()}
              aria-label="أضف للمفضلة"
              className="w-8 h-8 rounded-full bg-[#111317]/75 backdrop-blur-md flex items-center justify-center text-[#e2e2e8] hover:text-[#ffc174] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">favorite</span>
            </button>
          </div>
          {/* Bottom Gradient Scrim & Title Tag */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1e2024] via-[#1e2024]/60 to-transparent p-3 pt-8 flex items-end justify-between">
            <div className="flex flex-col">
              <span className="font-['Space_Grotesk'] text-[10px] text-[#ffddb8] font-bold tracking-wider uppercase">
                {pitches[0].district}
              </span>
              <h3 className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-black">
                {pitches[0].name}
              </h3>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-baseline gap-0.5 text-[#ffc174]">
                <span className="font-['Space_Grotesk'] text-[24px] font-black">
                  {pitches[0].pricePerHour}
                </span>
                <span className="font-['Plus_Jakarta_Sans'] text-[12px] font-bold">د.أ / س</span>
              </div>
              <span className="font-['Space_Grotesk'] text-[9px] text-[#d8c3ad]">
                شامل الإضاءة والمياه
              </span>
            </div>
          </div>
        </div>

        {/* Pitch Specs & Meta */}
        <div className="p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between text-[14px] text-[#d8c3ad] pb-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[#ffc174] text-[16px]">star</span>
                <strong className="text-[#e2e2e8] font-['Space_Grotesk'] text-[16px]">
                  {pitches[0].rating}
                </strong>
                <span className="font-['Space_Grotesk'] text-[10px]">
                  ({pitches[0].reviewCount} تقييم)
                </span>
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[#4edea3] text-[16px]">aspect_ratio</span>
                <span>{pitches[0].format}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">grass</span>
                <span>{pitches[0].surface}</span>
              </span>
            </div>
            <span className="font-['Space_Grotesk'] text-[11px] px-2 py-0.5 rounded bg-[#282a2e] text-[#4edea3]">
              متاح الليلة
            </span>
          </div>

          {/* Time Slots Grid */}
          <div className="flex flex-col gap-1.5">
            <span className="font-['Space_Grotesk'] text-[11px] text-[#d8c3ad]">
              اختر موعد الحجز المفضل:
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                disabled
                className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-[#1a1c20] text-[#d8c3ad] opacity-50 cursor-not-allowed"
              >
                <span className="font-['Space_Grotesk'] text-[13px] line-through">7:00 م</span>
                <span className="text-[9px] font-['Space_Grotesk']">محجوز</span>
              </button>

              {['8:30 م', '10:00 م', '11:30 م'].map((time) => {
                const isSelected = selectedSlots[pitches[0].id] === time;
                return (
                  <button
                    key={time}
                    onClick={() => handleSelectSlot(pitches[0].id, time)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#00a572] text-[#00311f] shadow-md ring-2 ring-[#4edea3]'
                        : 'bg-[#282a2e] hover:bg-[#333539] text-[#4edea3]'
                    }`}
                  >
                    <span className="font-['Space_Grotesk'] text-[13px]">{time}</span>
                    <span className="text-[9px] font-['Space_Grotesk']">
                      {isSelected ? 'محدد' : 'متاح'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pitch Booking Action CTA */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => handleBookClick(pitches[0])}
              className="flex-1 py-3 px-4 rounded-xl bg-[#f59e0b] hover:bg-[#ffc174] text-[#472a00] font-['Rubik'] text-[15px] font-bold shadow-[0_4px_16px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">bolt</span>
              <span>احجز الآن وتحدّى شباب الحارة</span>
            </button>
            <button
              onClick={() =>
                onShareWhatsApp(
                  `⚽ شو رأيكم نحجز ${pitches[0].name} الليلة؟ موعد ${selectedSlots[pitches[0].id] || '10:00 م'} متاح!`
                )
              }
              aria-label="مشاركة عبر واتساب"
              className="w-12 h-12 rounded-xl bg-[#00a572]/20 text-[#4edea3] hover:bg-[#00a572] hover:text-[#00311f] flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">share</span>
            </button>
          </div>
        </div>
      </article>

      {/* Pitch Card 2: Al-Kursi Stadium (Premium 7v7 Arena) */}
      <article className="flex flex-col bg-[#1e2024] rounded-xl overflow-hidden shadow-lg border border-[#282a2e]">
        <div className="relative w-full h-40 bg-[#282a2e] overflow-hidden">
          <img
            alt={pitches[1].name}
            className="w-full h-full object-cover"
            src={pitches[1].imageUrl}
          />
          <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#111317]/85 backdrop-blur-md text-[#ffc174] font-['Space_Grotesk'] text-[11px] font-bold shadow-sm">
              <span className="material-symbols-outlined text-[13px]">verified</span>
              تصنيف نخبة 7v7
            </span>
            <button
              onClick={() => sfx.playClipBeep()}
              aria-label="أضف للمفضلة"
              className="w-8 h-8 rounded-full bg-[#111317]/75 backdrop-blur-md flex items-center justify-center text-[#e2e2e8] hover:text-[#ffc174] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">favorite</span>
            </button>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1e2024] via-[#1e2024]/60 to-transparent p-3 pt-6 flex items-end justify-between">
            <div className="flex flex-col">
              <span className="font-['Space_Grotesk'] text-[10px] text-[#d8c3ad] font-bold">
                {pitches[1].district}
              </span>
              <h3 className="font-['Rubik'] text-[16px] text-[#e2e2e8] font-bold">
                {pitches[1].name}
              </h3>
            </div>
            <div className="flex items-baseline gap-0.5 text-[#ffc174]">
              <span className="font-['Space_Grotesk'] text-[24px] font-black">
                {pitches[1].pricePerHour}
              </span>
              <span className="font-['Plus_Jakarta_Sans'] text-[12px] font-bold">د.أ / س</span>
            </div>
          </div>
        </div>

        <div className="p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-[14px] text-[#d8c3ad]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[#ffc174] text-[15px]">star</span>
                <strong className="text-[#e2e2e8] font-['Space_Grotesk'] text-[13px]">
                  {pitches[1].rating}
                </strong>
                <span className="font-['Space_Grotesk'] text-[10px]">
                  ({pitches[1].reviewCount})
                </span>
              </span>
              <span>• 7 ضد 7 مساحة دولية</span>
              <span>• مواقف مجانية</span>
            </div>
          </div>

          {/* Time Slots Row */}
          <div className="flex items-center gap-2">
            {['8:00 م', '9:30 م'].map((time) => {
              const isSelected = selectedSlots[pitches[1].id] === time;
              return (
                <button
                  key={time}
                  onClick={() => handleSelectSlot(pitches[1].id, time)}
                  className={`flex-1 py-1.5 rounded-lg font-['Space_Grotesk'] text-[11px] font-bold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#00a572] text-[#00311f] ring-1 ring-[#4edea3]'
                      : 'bg-[#282a2e] hover:bg-[#333539] text-[#4edea3]'
                  }`}
                >
                  {time} (متاح)
                </button>
              );
            })}
            <button
              onClick={() => handleBookClick(pitches[1])}
              className="py-1.5 px-3 rounded-lg bg-[#ffc174] hover:bg-[#f59e0b] text-[#472a00] font-['Rubik'] text-[13px] font-bold transition-all shadow-sm cursor-pointer"
            >
              حجز سريع
            </button>
          </div>
        </div>
      </article>

      {/* Pitch Card 3: Al-Nuzha Street Ground (Community Street Cage) */}
      <article className="flex flex-col bg-[#1e2024] rounded-xl overflow-hidden shadow-lg border border-[#282a2e]">
        <div className="relative w-full h-36 bg-[#282a2e] overflow-hidden">
          <img
            alt={pitches[2].name}
            className="w-full h-full object-cover"
            src={pitches[2].imageUrl}
          />
          <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#93000a] text-[#ffdad6] font-['Space_Grotesk'] text-[11px] font-bold shadow-sm">
              <span className="material-symbols-outlined text-[13px]">campaign</span>
              مطلوب لاعبين الآن
            </span>
            <span className="font-['Space_Grotesk'] text-[10px] bg-[#111317]/80 backdrop-blur-md px-2 py-0.5 rounded text-[#e2e2e8]">
              5 ضد 5 كيج
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1e2024] via-[#1e2024]/60 to-transparent p-3 pt-6 flex items-end justify-between">
            <div className="flex flex-col">
              <span className="font-['Space_Grotesk'] text-[10px] text-[#d8c3ad] font-bold">
                {pitches[2].district}
              </span>
              <h3 className="font-['Rubik'] text-[16px] text-[#e2e2e8] font-bold">
                {pitches[2].name}
              </h3>
            </div>
            <div className="flex items-baseline gap-0.5 text-[#ffc174]">
              <span className="font-['Space_Grotesk'] text-[24px] font-black">
                {pitches[2].pricePerHour}
              </span>
              <span className="font-['Plus_Jakarta_Sans'] text-[12px] font-bold">د.أ / س</span>
            </div>
          </div>
        </div>

        <div className="p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[14px] text-[#d8c3ad]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ffc174] text-[15px]">star</span>
              <strong className="text-[#e2e2e8] font-['Space_Grotesk'] text-[13px]">
                {pitches[2].rating}
              </strong>
              <span>({pitches[2].reviewCount} تقييم)</span>
            </div>
            <span className="font-['Plus_Jakarta_Sans'] text-[#4edea3] font-bold">
              سعر اقتصادي للشباب
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="font-['Space_Grotesk'] text-[11px] text-[#d8c3ad]">
              المواعيد المتاحة: 10:30 م ، 12:00 منتصف الليل
            </span>
            <button
              onClick={() => handleBookClick(pitches[2])}
              className="py-1.5 px-3 rounded-lg bg-[#282a2e] hover:bg-[#f59e0b] hover:text-[#472a00] text-[#ffc174] font-['Rubik'] text-[13px] font-bold transition-all cursor-pointer"
            >
              تفاصيل الملعب
            </button>
          </div>
        </div>
      </article>

      {/* Neighborhood Pitch Perks Bar */}
      <section className="grid grid-cols-3 gap-2 pt-1">
        <div className="flex flex-col items-center text-center p-2.5 rounded-lg bg-[#1a1c20] border border-[#282a2e]/60">
          <span className="material-symbols-outlined text-[#ffc174] text-[22px] mb-1">
            qr_code_scanner
          </span>
          <span className="font-['Rubik'] text-[13px] font-bold text-[#e2e2e8]">
            دخول فوري
          </span>
          <span className="font-['Space_Grotesk'] text-[10px] text-[#d8c3ad]">
            مسح رمز الـ QR
          </span>
        </div>
        <div className="flex flex-col items-center text-center p-2.5 rounded-lg bg-[#1a1c20] border border-[#282a2e]/60">
          <span className="material-symbols-outlined text-[#4edea3] text-[22px] mb-1">
            emergency
          </span>
          <span className="font-['Rubik'] text-[13px] font-bold text-[#e2e2e8]">
            إسعاف أولي
          </span>
          <span className="font-['Space_Grotesk'] text-[10px] text-[#d8c3ad]">
            متوفر بكل ملعب
          </span>
        </div>
        <div className="flex flex-col items-center text-center p-2.5 rounded-lg bg-[#1a1c20] border border-[#282a2e]/60">
          <span className="material-symbols-outlined text-[#ffc174] text-[22px] mb-1">
            videocam
          </span>
          <span className="font-['Rubik'] text-[13px] font-bold text-[#e2e2e8]">
            سجّل لقطاتك
          </span>
          <span className="font-['Space_Grotesk'] text-[10px] text-[#d8c3ad]">
            كاميرات ذكية
          </span>
        </div>
      </section>
    </div>
  );
};
