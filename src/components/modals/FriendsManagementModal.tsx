import React, { useState } from 'react';
import { FriendPlayer } from '../../types';
import { sfx } from '../../utils/audio';

interface FriendsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  friends: FriendPlayer[];
  onAddFriend: (player: Omit<FriendPlayer, 'id'>) => void;
  onInviteFriend: (friend: FriendPlayer) => void;
  onShareWhatsApp: (text: string) => void;
}

export const FriendsManagementModal: React.FC<FriendsManagementModalProps> = ({
  isOpen,
  onClose,
  friends,
  onAddFriend,
  onInviteFriend,
  onShareWhatsApp,
}) => {
  const [filter, setFilter] = useState<'all' | 'online' | 'in_match'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerCode, setNewPlayerCode] = useState('');
  const [newPlayerPos, setNewPlayerPos] = useState('مهاجم');

  if (!isOpen) return null;

  // Filtered friends
  const filteredFriends = friends.filter((f) => {
    const matchesFilter =
      filter === 'all' ? true : filter === 'online' ? f.status === 'online' : f.status === 'in_match';
    const matchesSearch =
      searchQuery === '' ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.cardCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.neighborhood.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const onlineCount = friends.filter((f) => f.status === 'online').length;
  const inMatchCount = friends.filter((f) => f.status === 'in_match').length;

  const handleAddNewPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    sfx.playSuccess();

    onAddFriend({
      name: newPlayerName.trim(),
      username: `@${newPlayerName.trim().replace(/\s+/g, '_').toLowerCase()}`,
      avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBgt_dwHn9fut92to4azaDf4-yv8cZTp50ykkpwzaG3ibkKgBQoCjcdmWhHzo32cEalKT42b-tf66UatK-9APujy80fmTt3rEq5emwquxZ5Hwl3y0xI_8ZRG4GGpGtU1fuNiyQEZfrGQtPzbwVpTd-RLuQ0XPPz-4VazQ3085-N0hWaQ4DGEjJ_A6xWfqo82D0ALa4vXeHEH20rskgfKsOXndDIhu7ZR8u1jvdMlcPxXXBbgyixO2s',
      position: newPlayerPos,
      rating: +(7.5 + Math.random() * 1.2).toFixed(1),
      status: 'online',
      neighborhood: 'عمان • جبل الحسين',
      cardCode: newPlayerCode.trim() ? newPlayerCode.trim().toUpperCase() : `NJM-${Math.floor(1000 + Math.random() * 9000)}`,
    });

    setNewPlayerName('');
    setNewPlayerCode('');
    setShowAddForm(false);
  };

  // Neighborhood suggestions
  const suggestedPlayers = [
    {
      name: 'معتز الشريف',
      pos: 'حارس مرمى',
      rating: 8.3,
      hood: 'جبل الحسين',
      code: 'NJM-4421',
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuD5CKTm2Uh1cbUDwG3CRiNcx0ztVXu60fNA_-zyN51ved-r7_KYJXvpVK63O2x9Tl3Y2lqyhmFRLJjrUdHmIie5Lvv7g0t9t_uev1djU8bY2GzNo8131ZbKMgaGpB3RzQB_VNeychANoi7IKyMa3KBSAyiI8BIgHHipe9tqEVJtiZs4-8N0eIbC_R4ZLUYIcziGELhooO5WzVtxMgCEKibycBup3QWt6QwwoPz5MuzPvTw8fs_NpKI',
    },
    {
      name: 'سامر قنديل',
      pos: 'وسط محور',
      rating: 7.9,
      hood: 'اللويبدة',
      code: 'NJM-6190',
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDIVfkWerdRP4dTqGKhuNfnIrdDrt-1E491M5zte0RhRlYCPZoP_spOGBqeiPqnUmJSvcz30-BUZBjo44sG1Fn8_NRfjbY3DgBNdk0do3TlnPnk-U5Ll_ZzDa-dILOgSBd1A2426U8DCoSaTgKvHiqud0i9vcecYASsr8wANZ1ZDuPvRQgzbDPX4ikjK1DlPzT574sXxsnqRjsUpeqWva1C6Qzjf2mEY1Li55omD5hKZqYzLsvqfg0',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl bg-[#1e2024] p-4 shadow-2xl border border-[#ffc174]/40 flex flex-col space-y-3.5 max-h-[88vh] overflow-hidden text-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#282a2e] pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffc174] text-[24px]">group</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-['Rubik'] text-[18px] text-[#e2e2e8] font-bold">
                  أصدقاء الحارة (الشلة)
                </h2>
                <span className="font-['Space_Grotesk'] text-[11px] bg-[#f59e0b] text-[#472a00] font-black px-2 py-0.2 rounded-full">
                  {friends.length} لاعب
                </span>
              </div>
              <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#d8c3ad] block">
                دعوة مباشرة للمباريات ومتابعة الحالة الحية
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#282a2e] hover:bg-[#333539] flex items-center justify-center text-[#e2e2e8] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Filter Pills & Add Friend Trigger */}
        <div className="flex items-center justify-between gap-2 shrink-0">
          {/* Status Filter */}
          <div className="inline-flex p-0.5 rounded-lg bg-[#1a1c20] border border-[#282a2e]">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md font-['Rubik'] text-[12px] font-bold transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-[#37393e] text-[#e2e2e8] shadow-sm'
                  : 'text-[#d8c3ad] hover:text-[#e2e2e8]'
              }`}
            >
              الكل ({friends.length})
            </button>
            <button
              onClick={() => setFilter('online')}
              className={`px-2.5 py-1 rounded-md font-['Rubik'] text-[12px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                filter === 'online'
                  ? 'bg-[#00a572] text-[#00311f] shadow-sm'
                  : 'text-[#d8c3ad] hover:text-[#e2e2e8]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]"></span>
              <span>متصل ({onlineCount})</span>
            </button>
            <button
              onClick={() => setFilter('in_match')}
              className={`px-2.5 py-1 rounded-md font-['Rubik'] text-[12px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                filter === 'in_match'
                  ? 'bg-[#f59e0b] text-[#472a00] shadow-sm'
                  : 'text-[#d8c3ad] hover:text-[#e2e2e8]'
              }`}
            >
              <span className="text-[10px]">⚽</span>
              <span>في مباراة ({inMatchCount})</span>
            </button>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="py-1 px-3 rounded-lg bg-[#f59e0b] hover:bg-[#ffc174] text-[#472a00] font-['Rubik'] text-[12px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            <span>{showAddForm ? 'إلغاء' : 'إضافة لاعب'}</span>
          </button>
        </div>

        {/* Add Friend Form (Expandable) */}
        {showAddForm && (
          <form
            onSubmit={handleAddNewPlayer}
            className="p-3 rounded-xl bg-[#1a1c20] border border-[#ffc174]/40 flex flex-col space-y-2.5 shrink-0 animate-fadeIn"
          >
            <div className="flex items-center justify-between pb-1 border-b border-[#282a2e]">
              <span className="font-['Rubik'] text-[13px] font-bold text-[#ffc174] flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                إضافة لاعب بالاسم أو كود فيفا (NJM)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="اسم اللاعب (مثال: طارق الزعبي)"
                required
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                className="bg-[#14161a] border border-[#282a2e] focus:border-[#ffc174] rounded-lg px-2.5 py-1.5 text-[12px] text-[#e2e2e8] outline-none"
              />
              <input
                type="text"
                placeholder="كود البطاقة (NJM-8702)"
                value={newPlayerCode}
                onChange={(e) => setNewPlayerCode(e.target.value)}
                className="bg-[#14161a] border border-[#282a2e] focus:border-[#ffc174] rounded-lg px-2.5 py-1.5 text-[12px] text-[#e2e2e8] outline-none text-left"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={newPlayerPos}
                onChange={(e) => setNewPlayerPos(e.target.value)}
                className="bg-[#14161a] border border-[#282a2e] rounded-lg px-2 py-1 text-[12px] text-[#e2e2e8] outline-none"
              >
                <option value="مهاجم">مهاجم (ST)</option>
                <option value="صانع ألعاب">صانع ألعاب (CAM)</option>
                <option value="جناح سريع">جناح (Winger)</option>
                <option value="صخرة دفاع">دفاع (CB)</option>
                <option value="حارس مرمى">حارس (GK)</option>
              </select>

              <button
                type="submit"
                className="flex-1 py-1.5 rounded-lg bg-[#00a572] hover:bg-[#10B981] text-[#00311f] font-['Rubik'] text-[13px] font-bold transition-all cursor-pointer"
              >
                حفظ وإضافة للشلة ✅
              </button>
            </div>
          </form>
        )}

        {/* Search Bar */}
        <div className="relative shrink-0">
          <input
            type="text"
            placeholder="ابحث بالاسم، الحارة، أو كود البطاقة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1a1c20] border border-[#282a2e] focus:border-[#ffc174] rounded-xl pr-9 pl-3 py-2 text-[12px] text-[#e2e2e8] outline-none placeholder:text-[#d8c3ad]/60"
          />
          <span className="material-symbols-outlined text-[#d8c3ad] text-[18px] absolute right-3 top-2.5 pointer-events-none">
            search
          </span>
        </div>

        {/* Friends List */}
        <div className="flex flex-col space-y-2 overflow-y-auto no-scrollbar flex-1 py-1">
          {filteredFriends.length === 0 ? (
            <div className="py-8 text-center text-[#d8c3ad] font-['Plus_Jakarta_Sans'] text-[13px]">
              لا يوجد لاعبون يطابقون البحث
            </div>
          ) : (
            filteredFriends.map((friend) => {
              const isOnline = friend.status === 'online';
              const isInMatch = friend.status === 'in_match';

              return (
                <div
                  key={friend.id}
                  className="p-3 rounded-xl bg-[#1a1c20] border border-[#282a2e] hover:border-[#ffc174]/30 transition-all flex items-center justify-between gap-2.5 shadow-sm"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Avatar with Status Pip */}
                    <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 bg-[#282a2e] p-0.5">
                      <img
                        src={friend.avatarUrl}
                        alt={friend.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-[#111317] ${
                          isOnline
                            ? 'bg-[#4edea3]'
                            : isInMatch
                            ? 'bg-[#f59e0b]'
                            : 'bg-[#a08e7a]'
                        }`}
                        title={
                          isOnline
                            ? 'متصل الآن'
                            : isInMatch
                            ? 'في مباراة جارية'
                            : 'غير متصل'
                        }
                      />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-['Rubik'] text-[14px] text-[#e2e2e8] font-bold truncate">
                          {friend.name}
                        </span>
                        <span className="font-['Space_Grotesk'] text-[11px] text-[#ffc174] font-black">
                          {friend.rating}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-['Plus_Jakarta_Sans'] text-[#d8c3ad]">
                        <span>{friend.position}</span>
                        <span>•</span>
                        <span>{friend.neighborhood}</span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isOnline ? (
                          <span className="font-['Space_Grotesk'] text-[10px] text-[#4edea3] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
                            جاهز للعب الآن
                          </span>
                        ) : isInMatch ? (
                          <span className="font-['Space_Grotesk'] text-[10px] text-[#ffc174] font-bold flex items-center gap-1">
                            <span>⚽</span>
                            يلعب بملعب الكرسي (الشوط 2)
                          </span>
                        ) : (
                          <span className="font-['Space_Grotesk'] text-[10px] text-[#d8c3ad]/70">
                            {friend.lastActive || 'غير متصل'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Quick Invite & WhatsApp */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        sfx.playSuccess();
                        onInviteFriend(friend);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-[#00a572] hover:bg-[#10B981] text-[#00311f] font-['Rubik'] text-[12px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[15px]">send</span>
                      <span>دعوة</span>
                    </button>

                    <button
                      onClick={() => {
                        sfx.playClipBeep();
                        onShareWhatsApp(
                          `يا هلا بكابتن ${friend.name}، جاهز لمباراتنا القادمة على منصة نجوم الحارة؟ تعال وانضم لتشكيلتنا!`
                        );
                      }}
                      aria-label="مراسلة عبر واتساب"
                      className="w-8 h-8 rounded-lg bg-[#282a2e] hover:bg-[#37393e] text-[#4edea3] flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">chat</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Suggested Neighborhood Players to Add */}
        <div className="pt-2 border-t border-[#282a2e] flex flex-col gap-2 shrink-0">
          <span className="font-['Space_Grotesk'] text-[11px] text-[#ffc174] font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">explore</span>
            لاعبون مقترحون من حارتك (عمان):
          </span>

          <div className="grid grid-cols-2 gap-2">
            {suggestedPlayers.map((p) => (
              <div
                key={p.code}
                className="p-2 rounded-xl bg-[#14161a] border border-[#282a2e] flex items-center justify-between gap-1.5"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <img src={p.avatar} alt={p.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-['Rubik'] text-[11px] font-bold text-[#e2e2e8] truncate">
                      {p.name}
                    </span>
                    <span className="font-['Space_Grotesk'] text-[9px] text-[#d8c3ad]">
                      {p.pos} • {p.rating}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    sfx.playSuccess();
                    onAddFriend({
                      name: p.name,
                      username: `@${p.name.replace(/\s+/g, '_')}`,
                      avatarUrl: p.avatar,
                      position: p.pos,
                      rating: p.rating,
                      status: 'online',
                      neighborhood: p.hood,
                      cardCode: p.code,
                    });
                  }}
                  className="w-6 h-6 rounded-md bg-[#282a2e] hover:bg-[#ffc174] hover:text-[#472a00] text-[#ffc174] flex items-center justify-center transition-all cursor-pointer shrink-0"
                  title="إضافة للشلة"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
