import React, { useState } from 'react';
import { Pitch } from '../../types';
import { sfx } from '../../utils/audio';

interface BookingModalProps {
  pitch: Pitch | null;
  selectedSlot?: string;
  walletBalance?: number;
  onClose: () => void;
  onSuccess: (bookingDetails: {
    pitchName: string;
    time: string;
    organizer: string;
    paymentMethod: 'cash' | 'stars';
    starsSpent?: number;
  }) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  pitch,
  selectedSlot,
  walletBalance = 480,
  onClose,
  onSuccess,
}) => {
  const [organizerName, setOrganizerName] = useState('أحمد المالكي');
  const [phone, setPhone] = useState('0791234567');
  const [teamSize, setTeamSize] = useState('6v6');
  const [time, setTime] = useState(selectedSlot || '10:00 م');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'stars'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!pitch) return null;

  const starsRequired = pitch.pricePerHour * 10;
  const canPayWithStars = walletBalance >= starsRequired;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === 'stars' && !canPayWithStars) {
      alert(`رصيدك الحالي (${walletBalance} ⭐) لا يكفي لتغطية تكلفة الحجز الكاملة (${starsRequired} ⭐). يرجى اختيار الدفع نقداً أو كسب المزيد من النجوم.`);
      return;
    }

    setIsSubmitting(true);
    sfx.playSuccess();
    setTimeout(() => {
      setIsSubmitting(false);
      onSuccess({
        pitchName: pitch.name,
        time,
        organizer: organizerName,
        paymentMethod,
        starsSpent: paymentMethod === 'stars' ? starsRequired : 0,
      });
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-2xl bg-[#1e2024] p-4 shadow-2xl border border-[#ffc174]/40 flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#282a2e] pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffc174] text-[22px]">bolt</span>
            <h2 className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
              تأكيد حجز الملعب
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#282a2e] hover:bg-[#333539] flex items-center justify-center text-[#e2e2e8] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Pitch Summary */}
        <div className="bg-[#1a1c20] p-3 rounded-xl border border-[#282a2e] flex items-center gap-3">
          <img
            src={pitch.imageUrl}
            alt={pitch.name}
            className="w-16 h-14 object-cover rounded-lg"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-['Rubik'] text-[15px] text-[#e2e2e8] font-bold truncate">
              {pitch.name}
            </span>
            <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad]">
              {pitch.district}
            </span>
            <span className="font-['Space_Grotesk'] text-[13px] text-[#ffc174] font-black mt-0.5">
              {pitch.pricePerHour} دينار / ساعة
            </span>
          </div>
        </div>

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="flex flex-col space-y-3">
          <div className="flex flex-col gap-1">
            <label className="font-['Space_Grotesk'] text-[11px] text-[#d8c3ad]">
              اسم المنظم / الكابتن
            </label>
            <input
              type="text"
              required
              value={organizerName}
              onChange={(e) => setOrganizerName(e.target.value)}
              className="w-full bg-[#1a1c20] border border-[#282a2e] focus:border-[#ffc174] rounded-lg px-3 py-2 text-[#e2e2e8] text-[14px] outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-['Space_Grotesk'] text-[11px] text-[#d8c3ad]">
              رقم الهاتف (للتنسيق)
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-[#1a1c20] border border-[#282a2e] focus:border-[#ffc174] rounded-lg px-3 py-2 text-[#e2e2e8] text-[14px] outline-none text-left"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-['Space_Grotesk'] text-[11px] text-[#d8c3ad]">الوقت</label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-[#1a1c20] border border-[#282a2e] focus:border-[#ffc174] rounded-lg px-3 py-2 text-[#e2e2e8] text-[13px] outline-none"
              >
                {pitch.timeSlots
                  .filter((s) => s.status !== 'booked')
                  .map((s) => (
                    <option key={s.time} value={s.time}>
                      {s.time}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-['Space_Grotesk'] text-[11px] text-[#d8c3ad]">نوع المباراة</label>
              <select
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value)}
                className="w-full bg-[#1a1c20] border border-[#282a2e] focus:border-[#ffc174] rounded-lg px-3 py-2 text-[#e2e2e8] text-[13px] outline-none"
              >
                <option value="5v5">5 ضد 5</option>
                <option value="6v6">6 ضد 6</option>
                <option value="7v7">7 ضد 7</option>
              </select>
            </div>
          </div>

          {/* Payment Method Selector: Cash vs Nujoom Stars */}
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="font-['Space_Grotesk'] text-[11px] text-[#d8c3ad]">طريقة الدفع</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'bg-[#1a1c20] border-[#4edea3] ring-1 ring-[#4edea3]'
                    : 'bg-[#1a1c20] border-[#282a2e] text-[#d8c3ad]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-['Rubik'] text-[12px] font-bold text-[#e2e2e8]">نقداً بالملعب</span>
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${paymentMethod === 'cash' ? 'border-[#4edea3] bg-[#4edea3]' : 'border-[#d8c3ad]'}`}>
                    {paymentMethod === 'cash' && <span className="w-1.5 h-1.5 rounded-full bg-[#003824]" />}
                  </span>
                </div>
                <span className="font-['Space_Grotesk'] text-[11px] text-[#4edea3] font-bold mt-1">
                  {pitch.pricePerHour} دينار
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('stars')}
                className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                  paymentMethod === 'stars'
                    ? 'bg-[#2a2215] border-[#ffc174] ring-1 ring-[#ffc174]'
                    : 'bg-[#1a1c20] border-[#282a2e] text-[#d8c3ad]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-['Rubik'] text-[12px] font-bold text-[#ffc174]">رصيد نجوم ⭐</span>
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${paymentMethod === 'stars' ? 'border-[#ffc174] bg-[#ffc174]' : 'border-[#d8c3ad]'}`}>
                    {paymentMethod === 'stars' && <span className="w-1.5 h-1.5 rounded-full bg-[#472a00]" />}
                  </span>
                </div>
                <span className="font-['Space_Grotesk'] text-[11px] text-[#ffc174] font-bold mt-1">
                  {starsRequired} نجمة (رصيدك: {walletBalance} ⭐)
                </span>
              </button>
            </div>
          </div>

          {paymentMethod === 'stars' && (
            <div className={`p-2.5 rounded-lg border text-[11px] leading-relaxed ${canPayWithStars ? 'bg-[#2a2215] border-[#ffc174]/40 text-[#ffddb8]' : 'bg-[#93000a]/20 border-[#ffb4ab]/40 text-[#ffdad6]'}`}>
              {canPayWithStars ? (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#ffc174] text-[16px]">check_circle</span>
                  <span>حجز مجاني 100% باستخدام {starsRequired} نجمة من محفظتك الرقمية!</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#ffb4ab] text-[16px]">warning</span>
                  <span>رصيدك الحالي ({walletBalance} ⭐) أقل من المطلوب ({starsRequired} ⭐). يمكنك اختيار الدفع نقداً.</span>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || (paymentMethod === 'stars' && !canPayWithStars)}
            className={`w-full py-3 rounded-xl font-['Rubik'] text-[16px] font-bold shadow-lg transition-all active:scale-95 cursor-pointer mt-2 ${
              paymentMethod === 'stars'
                ? canPayWithStars
                  ? 'bg-[#f59e0b] hover:bg-[#ffc174] text-[#472a00]'
                  : 'bg-[#333539] text-[#d8c3ad] opacity-60 cursor-not-allowed'
                : 'bg-[#f59e0b] hover:bg-[#ffc174] text-[#472a00]'
            }`}
          >
            {isSubmitting
              ? 'جاري تأكيد الحجز...'
              : paymentMethod === 'stars'
              ? `تأكيد الحجز مجاناً بـ ${starsRequired} نجمة ⭐`
              : 'تأكيد الحجز وتثبيت الموعد ⚽'}
          </button>
        </form>
      </div>
    </div>
  );
};
