// ====================================================================
// VoiceRecorder - تسجيل رسالة صوتية بـ MediaRecorder API
// ====================================================================
// يدعم التسجيل/الإيقاف/الإلغاء + يعرض المؤقت + يرجّع Blob جاهز للرفع.
// ====================================================================

import { useEffect, useRef, useState } from "react";
import { Mic, Trash2, Send, Loader2 } from "lucide-react";

interface Props {
  onSend: (blob: Blob, durationSec: number) => Promise<void>;
  disabled?: boolean;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function VoiceRecorder({ onSend, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [tick, setTick] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [sending, setSending] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const pendingSendRef = useRef(false);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => () => {
    cleanupStream();
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, []);

  // نبضة حركية لتموجات الصوت أثناء التسجيل (10fps)
  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setTick((x) => x + 1), 100);
    return () => window.clearInterval(id);
  }, [recording]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // اختيار صيغة مدعومة
      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
      const mime = preferred.find((m) => MediaRecorder.isTypeSupported(m)) || "";
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setBlob(b);
        cleanupStream();
        if (pendingSendRef.current) {
          pendingSendRef.current = false;
          void sendBlob(b);
        }
      };
      mr.start();
      setRecording(true);
      setSeconds(0);
      setBlob(null);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) {
      alert("يجب السماح بالوصول إلى الميكروفون");
    }
  };

  const cancel = () => {
    if (recording) {
      mediaRef.current?.stop();
      setRecording(false);
    }
    if (timerRef.current) window.clearInterval(timerRef.current);
    setBlob(null);
    setSeconds(0);
    cleanupStream();
  };

  const sendBlob = async (b: Blob) => {
    setSending(true);
    try {
      await onSend(b, seconds);
      setBlob(null);
      setSeconds(0);
    } finally {
      setSending(false);
    }
  };

  const stopAndSend = () => {
    if (recording) {
      pendingSendRef.current = true;
      mediaRef.current?.stop();
      setRecording(false);
      if (timerRef.current) window.clearInterval(timerRef.current);
      return;
    }
    if (blob) void sendBlob(blob);
  };

  // الحالة 1: لا يوجد تسجيل ولا blob => زر مايكروفون فقط
  if (!recording && !blob) {
    return (
      <button
        type="button"
        onClick={start}
        disabled={disabled}
        className="w-12 h-12 rounded-full glass-thick border border-white/60 flex items-center justify-center disabled:opacity-50 active:scale-95 transition shrink-0"
        aria-label="تسجيل رسالة صوتية"
      >
        <Mic className="w-5 h-5 text-foreground/80" strokeWidth={1.6} />
      </button>
    );
  }

  // الحالة 2 و3: شريط زجاجي عائم بخيارات حذف/إرسال
  const isRec = recording;
  return (
    <div className="flex items-center gap-2 flex-1 glass-thick border border-white/60 dark:border-white/15 rounded-full h-12 px-2.5 shadow-elev anim-scale-in">
      <button
        type="button"
        onClick={cancel}
        className="w-9 h-9 rounded-full bg-destructive/15 hover:bg-destructive/25 flex items-center justify-center active:scale-95 transition"
        aria-label="حذف التسجيل"
      >
        <Trash2 className="w-4 h-4 text-destructive" />
      </button>

      <div className="flex-1 flex items-center gap-2 min-w-0 px-1">
        {isRec && <span className="w-2.5 h-2.5 rounded-full bg-destructive live-pulse shrink-0" />}
        {/* أعمدة موجة سوداء حية كواتساب */}
        <div className="flex items-center gap-[3px] flex-1 h-7 overflow-hidden">
          {Array.from({ length: 26 }).map((_, i) => {
            const h = isRec
              ? 5 + Math.abs(Math.sin(tick * 0.45 + i * 0.55)) * 20
              : 5 + Math.abs(Math.sin(i * 0.9)) * 16;
            return (
              <span
                key={i}
                className="w-[2.5px] rounded-full bg-black dark:bg-white"
                style={{ height: `${h}px`, transition: "height 180ms ease" }}
              />
            );
          })}
        </div>
        <span className="text-[12px] font-mono font-semibold text-foreground shrink-0 tabular-nums">{fmt(seconds)}</span>
      </div>

      <button
        type="button"
        onClick={stopAndSend}
        disabled={sending}
        className="w-9 h-9 rounded-full flex items-center justify-center text-white active:scale-95 disabled:opacity-60"
        style={{ backgroundColor: "var(--app-btn)" }}
        aria-label="إرسال"
      >
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </button>
    </div>
  );
}
