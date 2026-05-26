// ====================================================================
// VoicePlayer - مشغّل صوت بسيط بدون Web Audio API عشان يشتغل بالـ APK
// ====================================================================

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Pause, Play } from "lucide-react";

interface Props {
  src: string;
  duration?: number | null;
  mine?: boolean;
}

function fmt(sec: number) {
  if (!Number.isFinite(sec)) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const BARS = 48;

export default function VoicePlayer({ src, duration, mine = false }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(duration || 0);
  const [isSeeking, setIsSeeking] = useState(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onTime = () => {
      if (!isSeeking) setCurrent(a.currentTime);
    };
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
      a.currentTime = 0;
    };
    const onMeta = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) {
        setTotal(a.duration);
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);

    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, [isSeeking]);

  const toggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const a = audioRef.current;
      if (!a) return;

      if (playing) {
        a.pause();
      } else {
        document.querySelectorAll("audio").forEach((el) => {
          if (el!== a) el.pause();
        });
        a.play().catch(() => setPlaying(false));
      }
    },
    [playing]
  );

  const bars = useMemo(() => {
    return Array.from({ length: BARS }, (_, i) => {
      const t = i / (BARS - 1);
      const shape = 1 - Math.pow(t * 2 - 1, 2);
      const random = Math.random() * 0.2 + 0.8;
      return Math.max(0.15, shape * random);
    });
  }, [src]);

  const pct = total > 0? Math.min(100, (current / total) * 100) : 0;
  const activeIdx = Math.floor((pct / 100) * BARS);

  const handleSeek = useCallback(
    (clientX: number) => {
      const a = audioRef.current;
      const bar = progressRef.current;
      if (!a ||!bar || total === 0) return;

      const rect = bar.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percent = x / rect.width;
      const newTime = percent * total;

      a.currentTime = newTime;
      setCurrent(newTime);
    },
    [total]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsSeeking(true);
    handleSeek(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsSeeking(true);
    handleSeek(e.touches[0].clientX);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isSeeking) handleSeek(e.clientX);
    },
    [isSeeking, handleSeek]
  );

  const handleMouseUp = useCallback(() => {
    setIsSeeking(false);
  }, []);

  useEffect(() => {
    if (isSeeking) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isSeeking, handleMouseMove, handleMouseUp]);

  const theme = {
    container: "bg-transparent border border-zinc-200/60 dark:border-zinc-700/50 backdrop-blur-sm rounded-[24px]",
    button: "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 w-8 h-8 flex items-center justify-center rounded-full shrink-0 transition-opacity",
    barActive: "bg-zinc-900 dark:bg-zinc-100",
    barInactive: "bg-zinc-300/70 dark:bg-zinc-600/70",
    text: "text-zinc-500 dark:text-zinc-400",
  };

  return (
    <div className={`flex items-center gap-2.5 py-1.5 px-3 min-w-[260px] ${theme.container}`}>
      <button onClick={toggle} className={theme.button} aria-label={playing? "إيقاف" : "تشغيل"}>
        {playing? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div
          ref={progressRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={(e) => {
            if (isSeeking) handleSeek(e.touches[0].clientX);
          }}
          onTouchEnd={() => setIsSeeking(false)}
          className="h-8 flex items-center gap-[2px] cursor-pointer select-none"
        >
          {bars.map((h, i) => {
            const isActive = i <= activeIdx;
            return (
              <div
                key={i}
                className={`w-[2px] rounded-full transition-all duration-150 ${
                  isActive? theme.barActive : theme.barInactive
                }`}
                style={{
                  height: `${Math.round(h * (isActive? 28 : 18)) + 4}px`,
                }}
              />
            );
          })}
        </div>

        <div className={`text-[11px] font-medium tabular-nums ${theme.text}`}>
          {fmt(current)} / {fmt(total)}
        </div>
      </div>

      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}
