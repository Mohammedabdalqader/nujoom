import React, { useState } from 'react';
import { HighlightClip } from '../../types';
import { sfx } from '../../utils/audio';

interface ClipPlayerModalProps {
  clip: HighlightClip | null;
  onClose: () => void;
  onShare: (text: string) => void;
}

export const ClipPlayerModal: React.FC<ClipPlayerModalProps> = ({
  clip,
  onClose,
  onShare,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [likes, setLikes] = useState(clip?.likes || 0);
  const [hasLiked, setHasLiked] = useState(false);

  if (!clip) return null;

  const handleLike = () => {
    sfx.playClipBeep();
    if (!hasLiked) {
      setLikes((prev) => prev + 1);
      setHasLiked(true);
    } else {
      setLikes((prev) => prev - 1);
      setHasLiked(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-2xl bg-[#1a1c20] overflow-hidden shadow-2xl border border-[#ffc174]/30 flex flex-col">
        {/* Top Header */}
        <div className="p-3 bg-[#111317]/90 flex items-center justify-between border-b border-[#282a2e]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] animate-pulse"></span>
            <span className="font-['Space_Grotesk'] text-[11px] text-[#ffc174] font-bold">
              لقطة موثقة • 720p HD
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#282a2e] hover:bg-[#37393e] flex items-center justify-center text-[#e2e2e8] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Video Canvas Container */}
        <div
          onClick={() => setIsPlaying(!isPlaying)}
          className="relative w-full h-80 bg-black flex items-center justify-center cursor-pointer overflow-hidden bg-cover bg-center"
          style={{ backgroundImage: `url('${clip.thumbnailUrl}')` }}
        >
          <div className="absolute inset-0 bg-black/30" />

          {/* Center Play/Pause indicator */}
          {!isPlaying && (
            <div className="w-16 h-16 rounded-full bg-[#f59e0b]/90 text-[#472a00] flex items-center justify-center shadow-2xl z-10">
              <span
                className="material-symbols-outlined text-[36px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                play_arrow
              </span>
            </div>
          )}

          {/* Watermark in corner */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#111317]/70 backdrop-blur-md border border-[#ffc174]/30">
            <span className="font-['Rubik'] text-[11px] text-[#ffc174] font-bold">نجوم الحارة</span>
            <span className="material-symbols-outlined text-[#ffc174] text-[12px]">verified</span>
          </div>

          {/* Scrub bar / progress */}
          <div className="absolute bottom-0 inset-x-0 h-1 bg-[#282a2e]">
            <div className="h-full bg-[#ffc174] w-2/3 animate-pulse" />
          </div>
        </div>

        {/* Clip Details */}
        <div className="p-4 flex flex-col space-y-3 bg-[#1e2024]">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col">
              <span className="font-['Space_Grotesk'] text-[11px] text-[#ffc174] font-bold">
                {clip.tag} • {clip.pitchName}
              </span>
              <h3 className="font-['Rubik'] text-[16px] text-[#e2e2e8] font-bold mt-0.5">
                {clip.title}
              </h3>
              <span className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#d8c3ad]">
                بواسطة {clip.authorName} ({clip.authorHandle})
              </span>
            </div>
          </div>

          {/* Actions: Like, Share WhatsApp, Download */}
          <div className="flex items-center gap-2 pt-1 border-t border-[#282a2e]/60">
            <button
              onClick={handleLike}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 font-['Space_Grotesk'] text-[13px] font-bold transition-colors cursor-pointer ${
                hasLiked
                  ? 'bg-[#ffbcb7]/20 text-[#ffbcb7] border border-[#ffbcb7]/40'
                  : 'bg-[#282a2e] hover:bg-[#333539] text-[#e2e2e8]'
              }`}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={hasLiked ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                favorite
              </span>
              <span>{likes}</span>
            </button>

            <button
              onClick={() => {
                sfx.playSuccess();
                onShare(
                  `⚽ لقطة خرافية من "${clip.authorName}" في نجوم الحارة: ${clip.title} على ${clip.pitchName}!`
                );
              }}
              className="flex-1 py-2 rounded-xl bg-[#00a572] hover:bg-[#10B981] text-[#00311f] font-['Rubik'] text-[14px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
              <span>مشاركة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
