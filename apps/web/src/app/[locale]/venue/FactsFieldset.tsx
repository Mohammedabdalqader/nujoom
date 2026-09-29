import { AMENITIES, amenitiesKey } from '@nujoom/shared';

/**
 * The field's design facts inside the owner's save form (D-065): size, surface, covered or open,
 * floodlights. "Not set" leaves a fact unchanged; each select carries the stored value in a hidden
 * `was_*` field so the action sends only what the owner actually changed (each change is recorded
 * as operator evidence).
 */
export type FactStrings = {
  title: string;
  hint: string;
  unknown: string;
  players: string;
  /** Contains `{{n}}`. */
  playersOption: string;
  surface: string;
  surfaces: Record<string, string>;
  indoor: string;
  covered: string;
  open: string;
  lights: string;
  lit: string;
  unlit: string;
  amenities: string;
  amenityNames: Record<string, string>;
  none: string;
  nameAr: string;
  nameEn: string;
  length: string;
  width: string;
  futsal: string;
  futsalYes: string;
  futsalNo: string;
};

export const SURFACES = [
  'artificial_turf',
  'natural_grass',
  'hard_court',
  'sand',
  'other',
] as const;

const yesNo = (v: unknown) => (v === true ? 'yes' : v === false ? 'no' : '');

export function FactsFieldset({
  field,
  strings: s,
}: {
  field: {
    players_per_side?: unknown;
    surface?: unknown;
    indoor?: unknown;
    lights?: unknown;
    amenities?: unknown;
    futsal?: unknown;
    length_m?: unknown;
    width_m?: unknown;
    label?: unknown;
  };
  strings: FactStrings;
}) {
  const select =
    'w-full rounded-lg border border-border bg-surface-container-low px-3 py-2 text-on-surface';
  const current = {
    players: field.players_per_side ? String(field.players_per_side) : '',
    surface: typeof field.surface === 'string' ? field.surface : '',
    indoor: yesNo(field.indoor),
    lights: yesNo(field.lights),
    futsal: yesNo(field.futsal),
  };
  const label = (field.label ?? {}) as { ar?: string | null; en?: string | null };
  const text = (name: string, labelText: string, value: unknown, extra: object) => (
    <label className="flex flex-col gap-1 text-sm">
      {labelText}
      <input type="hidden" name={`was_${name}`} value={value == null ? '' : String(value)} />
      <input
        name={`fact_${name}`}
        defaultValue={value == null ? '' : String(value)}
        className={select}
        {...extra}
      />
    </label>
  );
  const row = (name: keyof typeof current, label: string, options: [string, string][]) => (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input type="hidden" name={`was_${name}`} value={current[name]} />
      <select name={`fact_${name}`} defaultValue={current[name]} className={select}>
        <option value="">{s.unknown}</option>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <fieldset className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
      <legend className="mb-1 text-sm font-bold">{s.title}</legend>
      <p className="text-xs text-on-surface-variant sm:col-span-2">{s.hint}</p>
      {row(
        'players',
        s.players,
        [3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => [
          String(n),
          s.playersOption.replaceAll('{{n}}', String(n)),
        ]),
      )}
      {row(
        'surface',
        s.surface,
        SURFACES.map((v) => [v, s.surfaces[v] ?? v]),
      )}
      {row('indoor', s.indoor, [
        ['yes', s.covered],
        ['no', s.open],
      ])}
      {row('lights', s.lights, [
        ['yes', s.lit],
        ['no', s.unlit],
      ])}
      {row('futsal', s.futsal, [
        ['yes', s.futsalYes],
        ['no', s.futsalNo],
      ])}
      {text('length', s.length, field.length_m, { inputMode: 'decimal', dir: 'ltr', maxLength: 6 })}
      {text('width', s.width, field.width_m, { inputMode: 'decimal', dir: 'ltr', maxLength: 6 })}
      {text('label_ar', s.nameAr, label.ar, { dir: 'rtl', lang: 'ar', maxLength: 60 })}
      {text('label_en', s.nameEn, label.en, { dir: 'ltr', lang: 'en', maxLength: 60 })}
      <div className="flex flex-col gap-2 text-sm sm:col-span-2">
        {s.amenities}
        <input type="hidden" name="was_amenities" value={amenitiesKey(field.amenities)} />
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {AMENITIES.map((a) => (
            <label key={a} className="flex items-center gap-2">
              <input
                type="checkbox"
                name="amenity"
                value={a}
                defaultChecked={Array.isArray(field.amenities) && field.amenities.includes(a)}
              />
              {s.amenityNames[a] ?? a}
            </label>
          ))}
          <label className="flex items-center gap-2 text-on-surface-variant">
            <input
              type="checkbox"
              name="amenities_none"
              defaultChecked={Array.isArray(field.amenities) && field.amenities.length === 0}
            />
            {s.none}
          </label>
        </div>
      </div>
    </fieldset>
  );
}
