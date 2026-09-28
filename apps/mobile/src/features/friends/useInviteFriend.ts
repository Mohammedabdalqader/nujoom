import { useHomeFeed } from '@/data/api';
import type { PlayerRef } from '@/data/types';
import { sfx } from '@/design/sound';
import { useLocale } from '@/lib/locale';
import { useToast } from '@/ui/Toast';

/**
 * One-tap invite to your next match. R3 sends a structured in-app invite for that booking (no
 * free text, spec §7); without an upcoming match there is nothing to invite to.
 */
export function useInviteFriend() {
  const { t } = useLocale();
  const toast = useToast();
  const nextMatch = useHomeFeed().data?.nextMatch ?? null;

  return (friend: PlayerRef) => {
    if (!nextMatch) {
      toast.show(t('profile.friends.noMatchToInvite'));
      return;
    }
    sfx.success();
    toast.show(t('profile.friends.invited', { name: friend.name }));
  };
}
