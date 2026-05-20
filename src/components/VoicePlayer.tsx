// ====================================================================
// VoicePlayer - مشغّل صوت زجاجي بأعمدة موجة سوداء
// ====================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

interface Props {
  src: string;
  duration?: number | null;
  mine?: boolean;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const BARS = 30;

export default function VoicePlayer({ src, duration, mine }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(duration || 0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onEnd = () => { setPlaying(false); setCurrent(0); };
    const onMeta = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) setTotal(a.duration);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    a.addEventListener("loadedmetadata", onMeta);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  // أعمدة موجة شبه ثابتة مشتقة من المصدر (تعطي إحساس صوت طبيعي)
  const bars = useMemo(() => {
    const seed = (src || "x").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return Array.from({ length: BARS }, (_, i) => {
      const v = Math.sin((i + 1) * ((seed % 7) + 1) * 0.6) * 0.5 + 0.5;
      const peak = Math.sin(i * 0.45) * 0.3 + 0.5;
      return Math.max(0.2, Math.min(1, v * 0.55 + peak * 0.6));
    });
  }, [src]);

  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;
  const activeIdx = Math.floor((pct / 100) * BARS);

  return (
    <div className={`flex items-center gap-2.5 min-w-[210px] ${mine ? "text-background" : ""}`}>
      <button
        onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${
          mine ? "border-background/50 bg-background/10" : "border-foreground/30 bg-transparent"
        }`}
        aria-label={playing ? "إيقاف" : "تشغيل"}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 mr-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="h-7 flex items-center gap-[2px]">
          {bars.map((h, i) => {
            const active = i <= activeIdx;
            return (
              <span
                key={i}
                className={`w-[2.5px] rounded-full transition-opacity ${
                  active
                    ? "bg-black dark:bg-white"
                    : "bg-black/35 dark:bg-white/40"
                }`}
                style={{ height: `${Math.round(h * 22) + 4}px` }}
              />
            );
          })}
        </div>
        <div className="text-[10px] mt-0.5 opacity-70 font-mono">
          {fmt(current)} / {fmt(total)}
        </div>
      </div>

      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}