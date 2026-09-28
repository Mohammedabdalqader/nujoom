# /// script
# requires-python = ">=3.12"
# dependencies = ["numpy>=2"]
# ///
"""Renders the design prototype's five Web Audio sound effects to WAV files (D-018).

The prototype synthesised its sounds at runtime with Web Audio oscillators
(src/utils/audio.ts at commit 9f9017d). React Native has no Web Audio, so each patch is
rendered offline here with the same oscillator type, start/stop times, frequency and gain
automation (setValueAtTime + exponentialRampToValueAtTime), then played with expo-audio.

Usage: pnpm --filter @nujoom/tools-sounds build
"""

from __future__ import annotations

import wave
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

SAMPLE_RATE = 44_100
OUT = Path(__file__).resolve().parents[2] / "apps" / "mobile" / "assets" / "sounds"


@dataclass
class Param:
    """An AudioParam timeline: an initial set plus exponential ramps (Web Audio semantics)."""

    events: list[tuple[str, float, float]] = field(default_factory=list)  # (kind, value, time)

    def set(self, value: float, t: float) -> Param:
        self.events.append(("set", value, t))
        return self

    def exp(self, value: float, t: float) -> Param:
        self.events.append(("exp", value, t))
        return self

    def render(self, times: np.ndarray, default: float) -> np.ndarray:
        out = np.full_like(times, default)
        prev_value, prev_time = default, 0.0
        for kind, value, t in self.events:
            if kind == "set":
                out[times >= t] = value
            else:  # exponential ramp from the previous event to (value, t)
                span = (times >= prev_time) & (times < t)
                frac = (times[span] - prev_time) / (t - prev_time)
                out[span] = prev_value * (value / prev_value) ** frac
                out[times >= t] = value
            prev_value, prev_time = value, t
        return out


@dataclass
class Voice:
    wave: str  # "sine" | "triangle"
    start: float
    stop: float
    frequency: Param
    gain: Param


def oscillator(kind: str, freq: np.ndarray, active: np.ndarray) -> np.ndarray:
    # Phase starts at zero when the oscillator starts, like OscillatorNode.start().
    phase = 2 * np.pi * (np.cumsum(np.where(active, freq, 0.0)) - np.where(active, freq, 0.0)) / SAMPLE_RATE
    if kind == "sine":
        return np.sin(phase)
    # Band-limited triangle (odd harmonics, 1/k^2), like Web Audio's periodic-wave tables.
    signal = np.zeros_like(phase)
    k = 1
    while k * freq[active].max() < SAMPLE_RATE / 2:
        signal += ((-1) ** ((k - 1) // 2)) * np.sin(k * phase) / (k * k)
        k += 2
    return signal * 8 / np.pi**2


def render(voices: list[Voice]) -> np.ndarray:
    length = max(v.stop for v in voices) + 0.01
    times = np.arange(int(length * SAMPLE_RATE)) / SAMPLE_RATE
    mix = np.zeros_like(times)
    for v in voices:
        active = (times >= v.start) & (times < v.stop)
        freq = v.frequency.render(times, 440.0)
        gain = v.gain.render(times, 1.0)
        mix += np.where(active, oscillator(v.wave, freq, active) * gain, 0.0)
    return mix


def sweep(kind: str, f0: float, ramps: list[tuple[float, float]], g0: float, g1: float, dur: float) -> Voice:
    freq = Param().set(f0, 0.0)
    for value, t in ramps:
        freq.exp(value, t)
    return Voice(kind, 0.0, dur, freq, Param().set(g0, 0.0).exp(g1, dur))


def chime(freqs: list[float], step: float, gain: float, decay: float, floor: float = 0.001) -> list[Voice]:
    return [
        Voice(
            "sine",
            i * step,
            i * step + decay,
            Param().set(f, i * step),
            Param().set(gain, i * step).exp(floor, i * step + decay),
        )
        for i, f in enumerate(freqs)
    ]


SOUNDS = {
    # Whistle / goal trigger: triangle 1800 -> 2400 -> 1900 Hz, 0.2 -> 0.01 over 250 ms.
    "whistle": [sweep("triangle", 1800, [(2400, 0.08), (1900, 0.18)], 0.2, 0.01, 0.25)],
    # Recording clip buzzer (also every tab change and toggle): sine 520 -> 880 Hz.
    "clip-beep": [sweep("sine", 520, [(880, 0.15)], 0.25, 0.01, 0.2)],
    # Success chime: C5, E5, G5 arpeggio.
    "success": chime([523.25, 659.25, 783.99], 0.08, 0.15, 0.2),
    # Coin toss: metallic multi-tone chime.
    "coin-toss": chime([800, 1100, 1400, 1700, 1200], 0.06, 0.12, 0.15),
    # Ding for checklists: B5.
    "ding": chime([987.77], 0.0, 0.2, 0.35),
}


def write_wav(path: Path, samples: np.ndarray) -> None:
    pcm = np.clip(samples, -1, 1)
    with wave.open(str(path), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SAMPLE_RATE)
        f.writeframes((pcm * 32767).astype("<i2").tobytes())


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, voices in SOUNDS.items():
        path = OUT / f"{name}.wav"
        write_wav(path, render(voices))
        print(f"{path.name}: {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
