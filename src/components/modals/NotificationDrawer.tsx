import React from 'react';
import { AppNotification, TabType } from '../../types';
import { sfx } from '../../utils/audio';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: TabType) => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onAddTestNotification: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onAddTestNotification,
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-2xl bg-[#1e2024] p-4 shadow-2xl border border-[#ffc174]/40 flex flex-col space-y-3 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#282a2e] pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffc174] text-[22px]">
              notifications
            </span>
            <h2 className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
              التنبيهات والإشعارات
            </h2>
            {unreadCount > 0 ? (
              <span className="flex items-center gap-1 bg-[#ef4444]/20 border border-[#ef4444]/40 text-[#ffb4ab] font-['Space_Grotesk'] text-[10px] px-2 py-0.5 rounded-full font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-ping"></span>
                <span>{unreadCount} جديد</span>
              </span>
            ) : (
              <span className="bg-[#282a2e] text-[#d8c3ad] font-['Space_Grotesk'] text-[10px] px-2 py-0.5 rounded-full">
                الكل مقروء
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#282a2e] hover:bg-[#333539] flex items-center justify-center text-[#e2e2e8] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Action Controls: Mark all read & Simulate */}
        <div className="flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={() => {
              sfx.playClipBeep();
              onMarkAllAsRead();
            }}
            disabled={unreadCount === 0}
            className={`font-['Plus_Jakarta_Sans'] text-[12px] flex items-center gap-1 transition-colors ${
              unreadCount > 0
                ? 'text-[#ffc174] hover:underline cursor-pointer font-bold'
                : 'text-[#d8c3ad]/50 cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">done_all</span>
            <span>تحديد الكل كمقروء</span>
          </button>

          <button
            onClick={() => {
              sfx.playSuccess();
              onAddTestNotification();
            }}
            className="font-['Space_Grotesk'] text-[11px] text-[#4edea3] hover:text-[#6ffbbe] bg-[#00a572]/15 hover:bg-[#00a572]/25 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-bold border border-[#00a572]/30"
          >
            <span className="material-symbols-outlined text-[14px]">add_alert</span>
            <span>تجربة إشعار جديد</span>
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex flex-col space-y-2 overflow-y-auto no-scrollbar py-1 flex-1">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-[#d8c3ad] font-['Plus_Jakarta_Sans'] text-[13px]">
              لا توجد تنبيهات حالياً
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  sfx.playClipBeep();
                  onMarkAsRead(n.id);
                  onNavigateTab(n.tab);
                  onClose();
                }}
                className={`p-3 rounded-xl flex items-start gap-3 cursor-pointer transition-all border ${
                  n.unread
                    ? 'bg-[#282a2e] border-[#ef4444]/40 hover:bg-[#333539] shadow-sm relative'
                    : 'bg-[#1a1c20] border-[#282a2e] hover:bg-[#282a2e] opacity-80'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    n.unread
                      ? 'bg-[#ef4444]/20 text-[#ffb4ab]'
                      : 'bg-[#333539] text-[#d8c3ad]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{n.icon}</span>
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-['Rubik'] text-[14px] text-[#e2e2e8] font-bold truncate">
                      {n.title}
                    </span>
                    {n.unread && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse"></span>
                        <span className="font-['Space_Grotesk'] text-[9px] text-[#ef4444] font-bold uppercase">
                          جديد
                        </span>
                      </span>
                    )}
                  </div>
                  <p className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad] line-clamp-2 mt-0.5">
                    {n.desc}
                  </p>
                  <span className="font-['Space_Grotesk'] text-[10px] text-[#ffc174] mt-1 font-medium">
                    {n.time}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
