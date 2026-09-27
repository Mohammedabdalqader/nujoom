/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  TabType,
  HighlightClip,
  Pitch,
  AppNotification,
  PlayerWallet,
  WalletTransaction,
  FriendPlayer,
} from './types';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeFeedScreen } from './components/screens/HomeFeedScreen';
import { PitchesBookingScreen } from './components/screens/PitchesBookingScreen';
import { MatchDayScreen } from './components/screens/MatchDayScreen';
import { RankingsScreen } from './components/screens/RankingsScreen';
import { PlayerProfileScreen } from './components/screens/PlayerProfileScreen';
import { ClipPlayerModal } from './components/modals/ClipPlayerModal';
import { MatchDetailsModal } from './components/modals/MatchDetailsModal';
import { BookingModal } from './components/modals/BookingModal';
import { QrCheckinModal } from './components/modals/QrCheckinModal';
import { MissingOneModal } from './components/modals/MissingOneModal';
import { NotificationDrawer } from './components/modals/NotificationDrawer';
import { FriendsManagementModal } from './components/modals/FriendsManagementModal';
import { FairSquadSplitterModal } from './components/tools/FairSquadSplitterModal';
import { MatchGearChecklistModal } from './components/tools/MatchGearChecklistModal';
import { MatchCostSplitterModal } from './components/tools/MatchCostSplitterModal';
import { useTheme } from './context/ThemeContext';
import { sfx } from './utils/audio';

export default function App() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('home-feed');
  const [activeClip, setActiveClip] = useState<HighlightClip | null>(null);
  const [isMatchDetailsOpen, setIsMatchDetailsOpen] = useState(false);
  const [bookingPitch, setBookingPitch] = useState<{ pitch: Pitch; slot?: string } | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isMissingOneOpen, setIsMissingOneOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [isSquadSplitterOpen, setIsSquadSplitterOpen] = useState(false);
  const [isGearChecklistOpen, setIsGearChecklistOpen] = useState(false);
  const [isCostSplitterOpen, setIsCostSplitterOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Friends & Squad State (شلة الحارة والأصدقاء)
  const [friends, setFriends] = useState<FriendPlayer[]>([
    {
      id: 'fr-1',
      name: 'عمر الدوسري',
      username: '@omar_dosari',
      avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBir9R8_CcMjMLEhZ1nL_qUcNECyTBHf_fynAqL8eciHb2jvmXqOSL03C-sVv9m--Pwv93K2ECQ_IZkaIRtfFdiOE80-K2x7NyBGj5gKoV1JvibNcEStam1fZfxV1oXL9GnafXxNw5co-nWw_LfdcR9vQ8t9xygVhiBIyFkZqr_w9AyJ8M_U2ObOBMq992TUVG6_dwU1n2XAcFBFMIBa7ZgG_VI3bZXyA04OlHIMqiojdMhNxFMRik',
      position: 'وسط هجومي',
      rating: 8.6,
      status: 'online',
      neighborhood: 'عمان • جبل الحسين',
      cardCode: 'NJM-2901',
      lastActive: 'نشط الآن',
    },
    {
      id: 'fr-2',
      name: 'طارق الزعبي',
      username: '@tareq_zoubi',
      avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuB3GdTY_aiB9ZkqL0Sv6dLoERK1pwPGFB8ecFpLSuGjjpH9RQCfwvrvYfnBa8M6BeSCuubVQOQk8SLQD7Gx82re7DDUTAAkrMQL2f4eAfx0u1J_eInvjCRhnKEmV5P_moaD9rGV72RCRWidVlgqTHdk_KuDpqEdX2N3e42G9s_EI6t98v8rR9AGHBdxFIDyhD230HU3SRm51yNZTk1-i3H9zbCO2eDnnRyBSrLvGVtze_dBl3MOUVE',
      position: 'صخرة دفاع',
      rating: 8.2,
      status: 'online',
      neighborhood: 'عمان • اللويبدة',
      cardCode: 'NJM-3410',
      lastActive: 'نشط الآن',
    },
    {
      id: 'fr-3',
      name: 'سيف العبدلي',
      username: '@saif_abdali',
      avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBamGPqOtVb7h4STVARV0g-41PYD0z9wJPucv2hNZVs8cJDLYzJu370Owz9nAt2n7Giokh3jJG7m1sFSEv81yiCyZNuiyBaWqTJ330txgoMwIGQaCy_-PL-pJTpTGauREl4hJEdrMxb-p9oVwNEE7_sT_vyARv20HCWdKVnzkHeDcOvAIUixT2Hvyi_QZryy4OFPJCK46plbigpoOaNbz_hG2HQ1bX33NCN9BDjHofGfVXHouwPkVc',
      position: 'جناح سريع',
      rating: 8.5,
      status: 'in_match',
      neighborhood: 'عمان • العبدلي',
      cardCode: 'NJM-1102',
      lastActive: 'يلعب في قفص ماركا',
    },
    {
      id: 'fr-4',
      name: 'حمزة الكيلاني',
      username: '@hamza_keilani',
      avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDIVfkWerdRP4dTqGKhuNfnIrdDrt-1E491M5zte0RhRlYCPZoP_spOGBqeiPqnUmJSvcz30-BUZBjo44sG1Fn8_NRfjbY3DgBNdk0do3TlnPnk-U5Ll_ZzDa-dILOgSBd1A2426U8DCoSaTgKvHiqud0i9vcecYASsr8wANZ1ZDuPvRQgzbDPX4ikjK1DlPzT574sXxsnqRjsUpeqWva1C6Qzjf2mEY1Li55omD5hKZqYzLsvqfg0',
      position: 'حارس مرمى',
      rating: 8.0,
      status: 'offline',
      neighborhood: 'عمان • جبل التاج',
      cardCode: 'NJM-5531',
      lastActive: 'منذ ساعتين',
    },
    {
      id: 'fr-5',
      name: 'معتز الشريف',
      username: '@motaz_shareef',
      avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuD5CKTm2Uh1cbUDwG3CRiNcx0ztVXu60fNA_-zyN51ved-r7_KYJXvpVK63O2x9Tl3Y2lqyhmFRLJjrUdHmIie5Lvv7g0t9t_uev1djU8bY2GzNo8131ZbKMgaGpB3RzQB_VNeychANoi7IKyMa3KBSAyiI8BIgHHipe9tqEVJtiZs4-8N0eIbC_R4ZLUYIcziGELhooO5WzVtxMgCEKibycBup3QWt6QwwoPz5MuzPvTw8fs_NpKI',
      position: 'محور دفاعي',
      rating: 8.3,
      status: 'online',
      neighborhood: 'عمان • جبل الحسين',
      cardCode: 'NJM-4421',
      lastActive: 'نشط الآن',
    },
  ]);

  const handleAddFriend = (player: Omit<FriendPlayer, 'id'>) => {
    const newFriend: FriendPlayer = {
      ...player,
      id: `fr-${Date.now()}`,
    };
    setFriends((prev) => [newFriend, ...prev]);
    showToast(`👥 تم إضافة الكابتن ${newFriend.name} إلى قائمة أصدقائك بنجاح!`);
  };

  const handleInviteFriend = (friend: FriendPlayer) => {
    sfx.playSuccess();
    showToast(`📩 تم إرسال دعوة للمباراة إلى ${friend.name} بنجاح!`);
  };

  // Virtual Digital Wallet State (Nujoom Coins ⭐)
  const [wallet, setWallet] = useState<PlayerWallet>({
    balance: 480, // 480 Stars = 48.00 JOD value
    totalEarned: 1320,
    tier: 'ذهبي',
    transactions: [
      {
        id: 'tx-1',
        type: 'earn',
        amount: 150,
        title: 'مكافأة الفوز ببطولة قفص ماركا الليلي 🏆',
        date: 'أمس 11:30 م',
        category: 'tournament_win',
      },
      {
        id: 'tx-2',
        type: 'earn',
        amount: 50,
        title: 'درع رجل المباراة (MVP) ضد نسور العبدلي 🥇',
        date: 'منذ يومين',
        category: 'mvp_award',
      },
      {
        id: 'tx-3',
        type: 'earn',
        amount: 30,
        title: 'تسجيل هاتريك في شباك اللويبدة ⚽',
        date: 'منذ 4 أيام',
        category: 'match_play',
      },
      {
        id: 'tx-4',
        type: 'spend',
        amount: 180,
        title: 'حجز ملعب جبل الحسين الأسطوري (خصم كامل) 🏟️',
        date: 'الأسبوع الماضي',
        category: 'pitch_booking',
      },
      {
        id: 'tx-5',
        type: 'earn',
        amount: 25,
        title: 'تسجيل حضور عبر باركود الملعب (+25 ⭐)',
        date: 'الأسبوع الماضي',
        category: 'match_play',
      },
    ],
  });

  const handleEarnStars = (amount: number, title: string, category: WalletTransaction['category']) => {
    const newTx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      type: 'earn',
      amount,
      title,
      date: 'الآن',
      category,
    };
    setWallet((prev) => ({
      ...prev,
      balance: prev.balance + amount,
      totalEarned: prev.totalEarned + amount,
      transactions: [newTx, ...prev.transactions],
    }));
    showToast(`⭐ مبروك! كسبت +${amount} عملة نجمة (${title})`);
  };

  const handleSpendStars = (amount: number, title: string) => {
    const newTx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      type: 'spend',
      amount,
      title,
      date: 'الآن',
      category: 'pitch_booking',
    };
    setWallet((prev) => ({
      ...prev,
      balance: Math.max(0, prev.balance - amount),
      transactions: [newTx, ...prev.transactions],
    }));
  };

  // User notifications state tracker
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'notif-1',
      icon: 'military_tech',
      title: 'بطاقة FIFA محدثة!',
      desc: 'تم احتساب هدفك الأخير وارتفع تقييمك إلى 8.4 ELO (مهاجم متميز).',
      time: 'منذ 10 دقائق',
      unread: true,
      tab: 'player-profile-and-fifa-card',
      category: 'rating',
    },
    {
      id: 'notif-2',
      icon: 'sports_soccer',
      title: 'مباراة الليلة تبدأ قريباً',
      desc: 'ملعب جبل الحسين: حي الحسين vs نسور العبدلي الساعة 10:00 م.',
      time: 'منذ ساعة',
      unread: true,
      tab: 'match-day-and-clips',
      category: 'match',
    },
    {
      id: 'notif-3',
      icon: 'person_add',
      title: 'ناقصنا واحد قريب منك!',
      desc: 'ملعب النزهة بحاجة للاعب وسط هجومي بعد 40 دقيقة.',
      time: 'منذ ساعتين',
      unread: false,
      tab: 'home-feed',
      category: 'urgent',
    },
  ]);

  const unreadNotificationsCount = notifications.filter((n) => n.unread).length;
  const hasUnreadNotifications = unreadNotificationsCount > 0;

  // Unread indicators per navigation tab
  const unreadTabs: Partial<Record<TabType, boolean>> = {
    'player-profile-and-fifa-card': notifications.some(
      (n) => n.unread && n.tab === 'player-profile-and-fifa-card'
    ),
    'match-day-and-clips': notifications.some(
      (n) => n.unread && n.tab === 'match-day-and-clips'
    ),
    'home-feed': notifications.some(
      (n) => n.unread && n.tab === 'home-feed'
    ),
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    showToast('تم تحديد جميع الإشعارات كمقروءة');
  };

  const addTestNotification = () => {
    const testItems: Omit<AppNotification, 'id' | 'unread' | 'time'>[] = [
      {
        icon: 'stars',
        title: 'كابتن عمر قيّم أداءك! ⭐',
        desc: 'حصلت على تقييم 9/10 في مباراة جبل الحسين الأخيرة مع شهادة إشادة جديدة.',
        tab: 'player-profile-and-fifa-card',
        category: 'rating',
      },
      {
        icon: 'local_fire_department',
        title: 'لقطتك وصلت 1,000 مشاهدة! 🔥',
        desc: 'هدف المقصية الأخير يتصدر قائمة تريند الحارة هذا المساء.',
        tab: 'player-profile-and-fifa-card',
        category: 'match',
      },
      {
        icon: 'campaign',
        title: 'ديربي الحارة: تصويت جديد!',
        desc: 'فُتح تصويت الفائز في ديربي جبل الحسين واللويبدة. صوّت الآن واربح XP.',
        tab: 'rankings-and-leaderboards',
        category: 'match',
      },
    ];

    const randomItem = testItems[Math.floor(Math.random() * testItems.length)];
    const newNotif: AppNotification = {
      ...randomItem,
      id: `notif-${Date.now()}`,
      unread: true,
      time: 'الآن',
    };

    setNotifications((prev) => [newNotif, ...prev]);
    showToast(`🔔 إشعار جديد: ${newNotif.title}`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleShareWhatsApp = (text: string) => {
    const encoded = encodeURIComponent(text);
    const url = `https://wa.me/?text=${encoded}`;
    try {
      window.open(url, '_blank');
    } catch {
      navigator.clipboard?.writeText(text);
      showToast('تم نسخ نص المشاركة إلى الحافظة!');
    }
  };

  const handleTabChange = (tab: TabType) => {
    sfx.playClipBeep();
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`flex flex-col min-h-screen selection:bg-[#f59e0b] selection:text-[#472a00] antialiased transition-colors duration-200 ${
      theme === 'light' ? 'light bg-[#f8fafc] text-[#0f172a]' : 'dark bg-[#111317] text-[#e2e2e8]'
    }`}>
      {/* Header with Navigation & Red Dot Notification State */}
      <Header
        activeTab={activeTab}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenFriends={() => setIsFriendsModalOpen(true)}
        onProfileClick={() => handleTabChange('player-profile-and-fifa-card')}
        hasUnreadNotifications={hasUnreadNotifications}
        unreadCount={unreadNotificationsCount}
        onlineFriendsCount={friends.filter((f) => f.status === 'online').length}
      />

      {/* Main Content Area */}
      <main className={`flex flex-col relative w-full pt-16 pb-20 min-h-screen max-w-lg mx-auto transition-colors duration-200 ${
        theme === 'light' ? 'bg-[#f8fafc]' : 'bg-[#111317]'
      }`}>
        {activeTab === 'home-feed' && (
          <HomeFeedScreen
            onNavigateTab={handleTabChange}
            onOpenMatchDetails={() => setIsMatchDetailsOpen(true)}
            onOpenMissingOne={() => setIsMissingOneOpen(true)}
            onPlayClip={(clip) => setActiveClip(clip)}
            onShareWhatsApp={handleShareWhatsApp}
            onOpenFriends={() => setIsFriendsModalOpen(true)}
            onlineFriendsCount={friends.filter((f) => f.status === 'online').length}
            onOpenSquadSplitter={() => setIsSquadSplitterOpen(true)}
            onOpenGearChecklist={() => setIsGearChecklistOpen(true)}
            onOpenCostSplitter={() => setIsCostSplitterOpen(true)}
          />
        )}

        {activeTab === 'pitches-and-booking' && (
          <PitchesBookingScreen
            onOpenBookingModal={(pitch, slot) => setBookingPitch({ pitch, slot })}
            onOpenMissingOne={() => setIsMissingOneOpen(true)}
            onShareWhatsApp={handleShareWhatsApp}
          />
        )}

        {activeTab === 'match-day-and-clips' && (
          <MatchDayScreen
            onPlayClip={(clip) => setActiveClip(clip)}
            onOpenQrModal={() => setIsQrModalOpen(true)}
            onOpenSquadSplitter={() => setIsSquadSplitterOpen(true)}
            onOpenGearChecklist={() => setIsGearChecklistOpen(true)}
            onOpenCostSplitter={() => setIsCostSplitterOpen(true)}
          />
        )}

        {activeTab === 'rankings-and-leaderboards' && (
          <RankingsScreen
            onShareWhatsApp={handleShareWhatsApp}
            onOpenPlayerCard={() => handleTabChange('player-profile-and-fifa-card')}
          />
        )}

        {activeTab === 'player-profile-and-fifa-card' && (
          <PlayerProfileScreen
            onPlayClip={(clip) => setActiveClip(clip)}
            onShareWhatsApp={handleShareWhatsApp}
            wallet={wallet}
            onEarnStars={handleEarnStars}
            onNavigateToBooking={() => handleTabChange('pitches-and-booking')}
            friends={friends}
            onOpenFriends={() => setIsFriendsModalOpen(true)}
            onInviteFriend={handleInviteFriend}
          />
        )}
      </main>

      {/* Bottom 5-Tab Navigation Bar with Unread Tab Indicators */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        unreadTabs={unreadTabs}
      />

      {/* Floating System Toast */}
      {toastMessage && (
        <div className="fixed top-20 inset-x-4 z-50 max-w-sm mx-auto p-3 rounded-xl bg-[#00a572] text-[#00311f] font-bold shadow-2xl flex items-center justify-between animate-fadeIn border border-[#4edea3]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span className="font-['Plus_Jakarta_Sans'] text-[13px]">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Interactive Modals */}
      <ClipPlayerModal
        clip={activeClip}
        onClose={() => setActiveClip(null)}
        onShare={handleShareWhatsApp}
      />

      <MatchDetailsModal
        isOpen={isMatchDetailsOpen}
        onClose={() => setIsMatchDetailsOpen(false)}
        onShareWhatsApp={handleShareWhatsApp}
      />

      <BookingModal
        pitch={bookingPitch ? bookingPitch.pitch : null}
        selectedSlot={bookingPitch ? bookingPitch.slot : undefined}
        walletBalance={wallet.balance}
        onClose={() => setBookingPitch(null)}
        onSuccess={({ pitchName, time, paymentMethod, starsSpent }) => {
          setBookingPitch(null);
          if (paymentMethod === 'stars' && starsSpent && starsSpent > 0) {
            handleSpendStars(starsSpent, `حجز ${pitchName} (خصم كامل)`);
            showToast(`⭐ تم حجز ${pitchName} بنجاح لموعد ${time} وخصم ${starsSpent} نجمة من محفظتك!`);
          } else {
            showToast(`تم حجز ${pitchName} بنجاح لموعد ${time} (الدفع نقداً بالملعب)!`);
          }
        }}
      />

      <QrCheckinModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onCheckinSuccess={() => {
          showToast('تم تسجيل حضورك في الملعب واحتساب +50 XP!');
        }}
      />

      <MissingOneModal
        isOpen={isMissingOneOpen}
        onClose={() => setIsMissingOneOpen(false)}
        onShareWhatsApp={handleShareWhatsApp}
      />

      <FriendsManagementModal
        isOpen={isFriendsModalOpen}
        onClose={() => setIsFriendsModalOpen(false)}
        friends={friends}
        onAddFriend={handleAddFriend}
        onInviteFriend={handleInviteFriend}
        onShareWhatsApp={handleShareWhatsApp}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNavigateTab={handleTabChange}
        notifications={notifications}
        onMarkAsRead={markNotificationAsRead}
        onMarkAllAsRead={markAllNotificationsAsRead}
        onAddTestNotification={addTestNotification}
      />

      {/* 3 Game-Changing Neighborhood Match Day Features */}
      <FairSquadSplitterModal
        isOpen={isSquadSplitterOpen}
        onClose={() => setIsSquadSplitterOpen(false)}
        friends={friends}
        onShareWhatsApp={handleShareWhatsApp}
      />

      <MatchGearChecklistModal
        isOpen={isGearChecklistOpen}
        onClose={() => setIsGearChecklistOpen(false)}
        friends={friends}
        onShareWhatsApp={handleShareWhatsApp}
      />

      <MatchCostSplitterModal
        isOpen={isCostSplitterOpen}
        onClose={() => setIsCostSplitterOpen(false)}
        friends={friends}
        onShareWhatsApp={handleShareWhatsApp}
      />
    </div>
  );
}
