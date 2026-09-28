import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { kv } from '@/lib/kv';

/**
 * The prototype's five sound effects (D-018), rendered from its Web Audio patches by
 * tools/sounds. Same call sites as the prototype: `clipBeep` on tab changes and toggles,
 * `success` on completed actions, `whistle` for kick-off moments, `coinToss`, and `ding` on
 * checklist ticks. Muted by the "Sounds" setting.
 */
const SOURCES = {
  whistle: require('../../assets/sounds/whistle.wav'),
  clipBeep: require('../../assets/sounds/clip-beep.wav'),
  success: require('../../assets/sounds/success.wav'),
  coinToss: require('../../assets/sounds/coin-toss.wav'),
  ding: require('../../assets/sounds/ding.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

const MUTE_KEY = 'settings.soundsMuted';
const players: Partial<Record<SoundName, AudioPlayer>> = {};
let configured = false;

function player(name: SoundName): AudioPlayer {
  if (!configured) {
    configured = true;
    // UI sounds respect the silent switch and never pause the user's music.
    void setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(
      () => {},
    );
  }
  return (players[name] ??= createAudioPlayer(SOURCES[name]));
}

export function soundsMuted(): boolean {
  return kv.get(MUTE_KEY) === '1';
}

export function setSoundsMuted(muted: boolean): void {
  if (muted) kv.set(MUTE_KEY, '1');
  else kv.remove(MUTE_KEY);
}

function play(name: SoundName): void {
  if (soundsMuted()) return;
  try {
    const p = player(name);
    p.seekTo(0);
    p.play();
  } catch {
    // Sound is decoration; never let it break an action.
  }
}

export const sfx = {
  whistle: () => play('whistle'),
  clipBeep: () => play('clipBeep'),
  success: () => play('success'),
  coinToss: () => play('coinToss'),
  ding: () => play('ding'),
};
