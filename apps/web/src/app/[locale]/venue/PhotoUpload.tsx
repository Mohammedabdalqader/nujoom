'use client';

import { errorKey } from '@nujoom/shared';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { browserSupabase } from '@/lib/supabase/client';

export type PhotoStrings = {
  add: string;
  choose: string;
  where: string;
  wholeVenue: string;
  rights: string;
  upload: string;
  uploading: string;
  sent: string;
  unreadable: string;
  errors: Record<string, string>;
};

// The bucket takes JPEG or WebP up to 2 MB (D-049); phone photos are bigger, so shrink here.
const MAX_SIDE = 1600;
const MAX_BYTES = 1_900_000;

async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.85, 0.75, 0.6]) {
    const blob = await new Promise<Blob | null>((done) =>
      canvas.toBlob(done, 'image/jpeg', quality),
    );
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  throw new Error('too_large');
}

/**
 * An owner adds a photo of their venue (D-062): shrunk in the browser, uploaded straight into the
 * venue's private folder with the owner's own session, then registered for admin review as
 * owner-granted. Nothing is shown to players until an admin approves it.
 */
export function PhotoUpload({
  facilityId,
  fields,
  strings: s,
}: {
  facilityId: string;
  fields: { id: string; label: string }[];
  strings: PhotoStrings;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [pitch, setPitch] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const supabase = browserSupabase();
    if (!file || !agreed || !supabase) return;
    setBusy(true);
    setNotice(null);
    try {
      let blob: Blob;
      try {
        blob = await shrink(file);
      } catch {
        setNotice({ ok: false, text: s.unreadable });
        return;
      }
      const path = `${facilityId}/${crypto.randomUUID()}.jpg`;
      const up = await supabase.storage
        .from('pitch-media')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (up.error) throw up.error;
      const { error } = await supabase.rpc('add_pitch_media', {
        p_facility: facilityId,
        p_pitch: pitch || null,
        p_path: path,
        p_rights: 'owner_granted',
      });
      if (error) throw error;
      setNotice({ ok: true, text: s.sent });
      setFile(null);
      setAgreed(false);
      form.reset();
      // Drop an earlier action's ?done= or ?error= notice and reload the photo list.
      router.replace(window.location.pathname, { scroll: false });
    } catch (err) {
      const code = (err as { message?: string }).message ?? '';
      setNotice({ ok: false, text: s.errors[errorKey(code)] ?? s.errors['errors.generic'] ?? '' });
    } finally {
      setBusy(false);
    }
  }

  const input =
    'w-full rounded-lg border border-border bg-surface-container-low px-3 py-2 text-sm text-on-surface';
  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
      <h4 className="font-headline font-bold">{s.add}</h4>
      <label className="flex flex-col gap-1 text-sm">
        {s.choose}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className={input}
        />
      </label>
      {fields.length > 1 ? (
        <label className="flex flex-col gap-1 text-sm">
          {s.where}
          <select value={pitch} onChange={(e) => setPitch(e.target.value)} className={input}>
            <option value="">{s.wholeVenue}</option>
            {fields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          required
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1"
        />
        <span>{s.rights}</span>
      </label>
      {notice ? (
        <p
          role={notice.ok ? 'status' : 'alert'}
          className={`text-sm ${notice.ok ? 'text-secondary' : 'text-error'}`}
        >
          {notice.text}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy || !file || !agreed}
        className="self-start rounded-full bg-primary-container px-5 py-2 text-sm font-bold text-on-primary hover:opacity-90 disabled:opacity-50"
      >
        {busy ? s.uploading : s.upload}
      </button>
    </form>
  );
}
