import React from 'react';
import { TabType } from '../types';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  unreadTabs?: Partial<Record<TabType, boolean>>;
}

interface NavItem {
  id: TabType;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home-feed', label: 'الرئيسية', icon: 'home' },
  { id: 'pitches-and-booking', label: 'الملاعب', icon: 'stadium' },
  { id: 'match-day-and-clips', label: 'المباراة', icon: 'sports_soccer' },
  { id: 'rankings-and-leaderboards', label: 'المتصدرين', icon: 'leaderboard' },
  { id: 'player-profile-and-fifa-card', label: 'ملفي', icon: 'military_tech' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, unreadTabs }) => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-[#111317]/90 backdrop-blur-xl shadow-[0_-4px_24px_rgba(0,0,0,0.5)] border-t border-[#282a2e]/40">
      <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const hasUnread = unreadTabs?.[item.id];
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center min-w-[56px] h-12 transition-colors cursor-pointer select-none relative ${
                isActive
                  ? 'text-[#ffc174] font-bold'
                  : 'text-[#d8c3ad] hover:text-[#e2e2e8]'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <span
                  className={`material-symbols-outlined text-[22px] transition-transform ${
                    isActive ? 'text-[#ffc174] drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] scale-110' : ''
                  }`}
                >
                  {item.icon}
                </span>
                {hasUnread && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ef4444] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ef4444] ring-1 ring-[#111317]"></span>
                  </span>
                )}
              </div>
              <span className="font-['Plus_Jakarta_Sans'] text-[12px] leading-tight mt-0.5 font-medium">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
