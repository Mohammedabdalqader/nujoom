export type TabType = 
  | 'home-feed' 
  | 'pitches-and-booking' 
  | 'match-day-and-clips' 
  | 'rankings-and-leaderboards' 
  | 'player-profile-and-fifa-card';

export interface PlayerStats {
  rating: number;
  matchesPlayed: number;
  goals: number;
  assists: number;
  mvpCount: number;
  eloRating: number;
  confidence: number;
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
}

export interface PlayerProfile {
  id: string;
  name: string;
  username: string;
  position: string;
  positionTag: string;
  neighborhood: string;
  city: string;
  avatarUrl: string;
  cardCode: string;
  stats: PlayerStats;
}

export interface PitchTimeSlot {
  time: string;
  status: 'booked' | 'available' | 'selected';
}

export interface Pitch {
  id: string;
  name: string;
  district: string;
  pricePerHour: number;
  rating: number;
  reviewCount: number;
  format: string;
  surface: string;
  isHdCameraVerified: boolean;
  isElite7v7?: boolean;
  isUrgentPlayersNeeded?: boolean;
  urgentText?: string;
  imageUrl: string;
  timeSlots: PitchTimeSlot[];
}

export interface HighlightClip {
  id: string;
  title: string;
  authorName: string;
  authorHandle: string;
  pitchName: string;
  duration: string;
  thumbnailUrl: string;
  tag: string;
  likes: number;
  views: string;
  opponent?: string;
  timeAgo: string;
  videoType: 'goal' | 'skill' | 'save';
}

export interface MatchEvent {
  minute: string;
  title: string;
  subtitle: string;
  team: 'blue' | 'orange' | 'general';
  teamTag: string;
  hasClip?: boolean;
  clipDuration?: string;
  interactions?: number;
  type: 'goal' | 'save' | 'sub';
}

export interface MvpCandidate {
  id: string;
  name: string;
  rank: number;
  statLine: string;
  rating: number;
  avatarUrl: string;
  votesPercent: number;
}

export interface AppNotification {
  id: string;
  icon: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  tab: TabType;
  category?: 'match' | 'rating' | 'urgent' | 'system';
}

export interface WalletTransaction {
  id: string;
  type: 'earn' | 'spend';
  amount: number;
  title: string;
  date: string;
  category: 'match_play' | 'tournament_win' | 'mvp_award' | 'pitch_booking' | 'daily_reward';
  details?: string;
}

export interface PlayerWallet {
  balance: number; // in Nujoom Stars ⭐
  totalEarned: number;
  tier: 'برونزي' | 'فضي' | 'ذهبي' | 'أسطوري';
  transactions: WalletTransaction[];
}

export interface FriendPlayer {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  position: string;
  rating: number;
  status: 'online' | 'offline' | 'in_match';
  neighborhood: string;
  cardCode: string;
  lastActive?: string;
  phone?: string;
}

export interface MatchGearItem {
  id: string;
  name: string;
  icon: string;
  category: 'ball' | 'bibs' | 'water' | 'referee' | 'firstaid' | 'other';
  assignedTo?: string; // Player name or null
  isReady: boolean;
  statusNote: string;
}

export interface SquadSplitPlayer {
  id: string;
  name: string;
  rating: number;
  position: string;
  avatarUrl: string;
  team: 'blue' | 'orange' | 'bench';
}

export interface QatyaPlayer {
  id: string;
  name: string;
  avatarUrl?: string;
  hasPaid: boolean;
  paymentMethod?: 'cash' | 'cliq' | 'stars';
  paidAt?: string;
}


