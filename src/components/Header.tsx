import React from 'react';
import { TabType } from '../types';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  activeTab: TabType;
  onOpenNotifications: () => void;
  onOpenFriends?: () => void;
  onProfileClick: () => void;
  hasUnreadNotifications?: boolean;
  unreadCount?: number;
  onlineFriendsCount?: number;
}

const TAB_SUBTITLES: Record<TabType, string> = {
  'home-feed': 'NUJOOM AL-HARA • Home Feed',
  'pitches-and-booking': 'NUJOOM AL-HARA • Pitches And Booking',
  'match-day-and-clips': 'NUJOOM AL-HARA • Match Day And Clips',
  'rankings-and-leaderboards': 'NUJOOM AL-HARA • Rankings And Leaderboards',
  'player-profile-and-fifa-card': 'NUJOOM AL-HARA • Player Profile And Fifa Card',
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenNotifications,
  onOpenFriends,
  onProfileClick,
  hasUnreadNotifications = true,
  onlineFriendsCount = 3,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#111317]/85 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.35)] pt-safe">
      <div className="h-16 px-3 flex items-center justify-between gap-2 max-w-lg mx-auto">
        {/* Logo and Brand Title */}
        <div className="flex items-center gap-2 min-w-0">
          <img
            alt="Nujoom Al-Hara Crown Logo"
            className="h-8 w-auto object-contain shrink-0"
            src="https://lh3.googleusercontent.com/aida/AEtjO1VpeodpkjizIawK_q88bViNa5306ZtEWQHSF83S7Wt_ZDnpKF_cKsMI2wsrcXfr-ZZbT2mwrUBYTpftjIkbCdAS9oDJvt8-0A_7bEgw3graXIB8cEd6Xja5f5CpiEY5IH5UOyGos51cIdO5z3beNGYzOc7_rn9rcerIoJ_3x3nTZJdtrkRCD2m7VdS5JTzinGjL5W_mPk0EUXotszkIHbNbHoGfayJyEoENerpBIdkiFe8lSJHcvCtt"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-['Rubik'] text-[18px] text-[#ffc174] font-bold tracking-tight truncate leading-tight">
                نجوم الحارة
              </span>
              <span className="font-['Space_Grotesk'] text-[11px] text-[#4edea3] font-bold uppercase bg-[#282a2e] px-1.5 py-0.5 rounded-full shrink-0">
                عمان
              </span>
            </div>
            <span className="font-['Space_Grotesk'] text-[11px] text-[#d8c3ad] tracking-wider uppercase truncate">
              {TAB_SUBTITLES[activeTab]}
            </span>
          </div>
        </div>

        {/* Action Controls: Theme Switcher, Friends, Notifications & Profile */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Theme Toggle Button (Dark / Light) */}
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'تفعيل الوضع النهاري Light Mode' : 'تفعيل الوضع الليلي Dark Mode'}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1e2024] hover:bg-[#282a2e] text-[#e2e2e8] transition-all cursor-pointer group active:scale-95 shadow-sm border border-[#282a2e]"
            title={theme === 'dark' ? 'التحويل للوضع النهاري (Light Mode)' : 'التحويل للوضع الليلي (Dark Mode)'}
          >
            <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${
              theme === 'dark' ? 'text-[#ffc174] group-hover:rotate-45' : 'text-[#f59e0b] group-hover:-rotate-45'
            }`}>
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {onOpenFriends && (
            <button
              onClick={onOpenFriends}
              aria-label="قائمة الأصدقاء Friends"
              className="w-11 h-11 flex items-center justify-center rounded-full bg-[#1e2024] hover:bg-[#282a2e] text-[#e2e2e8] relative transition-colors cursor-pointer group"
              title="شلة الحارة والأصدقاء"
            >
              <span className="material-symbols-outlined text-[21px] text-[#e2e2e8] group-hover:text-[#4edea3] transition-colors">
                group
              </span>
              {onlineFriendsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#00a572] text-[#00311f] font-['Space_Grotesk'] text-[9px] font-black shadow ring-1 ring-[#111317]">
                  {onlineFriendsCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={onOpenNotifications}
            aria-label="التنبيهات Notifications"
            className="w-11 h-11 flex items-center justify-center rounded-full bg-[#1e2024] hover:bg-[#282a2e] text-[#e2e2e8] relative transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {hasUnreadNotifications && (
              <span className="absolute top-2 left-2 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ef4444] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ef4444] ring-2 ring-[#111317]"></span>
              </span>
            )}
          </button>

          <button
            onClick={onProfileClick}
            aria-label="الملف الشخصي Profile"
            className="relative flex items-center justify-center p-0.5 cursor-pointer group"
          >
            <img
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-[#ffc174]/60 group-hover:ring-[#ffc174] transition-all"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3GdTY_aiB9ZkqL0Sv6dLoERK1pwPGFB8ecFpLSuGjjpH9RQCfwvrvYfnBa8M6BeSCuubVQOQk8SLQD7Gx82re7DDUTAAkrMQL2f4eAfx0u1J_eInvjCRhnKEmV5P_moaD9rGV72RCRWidVlgqTHdk_KuDpqEdX2N3e42G9s_EI6t98v8rR9AGHBdxFIDyhD230HU3SRm51yNZTk1-i3H9zbCO2eDnnRyBSrLvGVtze_dBl3MOUVE"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#4edea3] ring-2 ring-[#111317]"></span>
          </button>
        </div>
      </div>
    </header>
  );
};
