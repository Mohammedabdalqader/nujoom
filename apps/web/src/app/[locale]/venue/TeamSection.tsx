import { formatDateTime } from '@nujoom/shared';

import type { Locale } from '@/lib/i18n';

import { removeStaffMember, revokeLink } from './actions';
import { CreateLink, type LinkStrings } from './CreateLink';

export type TeamStrings = {
  title: string;
  hint: string;
  owner: string;
  staff: string;
  remove: string;
  links: string;
  noLinks: string;
  /** Contains `{{date}}`. */
  expires: string;
  revoke: string;
  link: LinkStrings;
};

type Member = { user_id: string; name: string | null; role: string };
type Link = { id: string; expires_at: string };

/** The owner's team: members, open invite links and a new link (D-069). Owners only. */
export function TeamSection({
  locale,
  facilityId,
  team,
  links,
  strings: s,
}: {
  locale: Locale;
  facilityId: string;
  team: Member[];
  links: Link[];
  strings: TeamStrings;
}) {
  const quiet =
    'rounded-full border border-border-strong px-3 py-1 text-xs text-on-surface hover:border-primary';
  return (
    <div className="mt-4 border-t border-border pt-4">
      <h4 className="mb-1 font-headline font-bold">{s.title}</h4>
      <p className="mb-3 text-xs text-on-surface-variant">{s.hint}</p>
      <ul className="mb-3 flex flex-col gap-2">
        {team.map((m) => (
          <li
            key={m.user_id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
          >
            <span>
              {m.name}{' '}
              <span className="text-xs text-on-surface-variant">
                ({m.role === 'owner' ? s.owner : s.staff})
              </span>
            </span>
            {m.role === 'staff' ? (
              <form action={removeStaffMember}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="facility" value={facilityId} />
                <input type="hidden" name="user" value={m.user_id} />
                <button type="submit" className={quiet}>
                  {s.remove}
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
      <h5 className="mb-1 text-sm font-bold">{s.links}</h5>
      {links.length === 0 ? (
        <p className="text-sm text-on-surface-variant">{s.noLinks}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {links.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span className="text-on-surface-variant">
                {s.expires.replace(
                  '{{date}}',
                  formatDateTime(l.expires_at, locale, { dateStyle: 'medium' }),
                )}
              </span>
              <form action={revokeLink}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="invite" value={l.id} />
                <button type="submit" className={quiet}>
                  {s.revoke}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <CreateLink
        facilityId={facilityId}
        locale={locale}
        openIds={links.map((l) => l.id)}
        strings={s.link}
      />
    </div>
  );
}
