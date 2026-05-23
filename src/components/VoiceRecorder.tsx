// ====================================================================
// VoiceRecorder - تسجيل رسالة صوتية بـ MediaRecorder API + AnalyserNode
// ====================================================================

import { useEffect, useRef, useState } from "react";
import { Send, Trash2, Loader2 } from "lucide-react";

interface Props {
  onSend: (blob: Blob, durationSec: number) => Promise<void>;
  disabled?: boolean;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const BAR_COUNT = 22;

export default function VoiceRecorder({ onSend, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [sending, setSending] = useState(false);
  const [levels, setLevels] = useState<number[]>(Array(BAR_COUNT).fill(0.2));

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const pendingSendRef = useRef(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current?.state!== "closed") {
      audioCtxRef.current?.close();
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  useEffect(() => () => {
    cleanupStream();
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, []);

  // تحليل مستوى الصوت الحقيقي
  const analyze = () => {
    if (!analyserRef.current ||!dataArrayRef.current) return;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    const slice = Math.floor(dataArrayRef.current.length / BAR_COUNT);
    const newLevels = Array.from({ length: BAR_COUNT }, (_, i) => {
      let sum = 0;
      for (let j = 0; j < slice; j++) {
        sum += dataArrayRef.current![i * slice + j];
      }
      const avg = sum / slice / 255;
      return Math.max(0.15, avg);
    });

    setLevels(newLevels);
    rafRef.current = requestAnimationFrame(analyze);
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const preferred = [
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus",
        "audio/mp4",
        "audio/webm"
      ];
      const mime = preferred.find((m) => MediaRecorder.isTypeSupported(m)) || "";
      const mr = new MediaRecorder(stream, {
        mimeType: mime,
        audioBitsPerSecond: 128000
      });
      mediaRef.current = mr;
      chunksRef.current = [];

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      analyze();

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
    setLevels(Array(BAR_COUNT).fill(0.2));
    cleanupStream();
  };

  const sendBlob = async (b: Blob) => {
    setSending(true);
    try {
      await onSend(b, seconds);
      setBlob(null);
      setSeconds(0);
      setLevels(Array(BAR_COUNT).fill(0.2));
    } finally {
      setSending(false);
    }
  };

  const stopAndSend = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (recording) {
      pendingSendRef.current = true;
      mediaRef.current?.stop();
      setRecording(false);
      if (timerRef.current) window.clearInterval(timerRef.current);
      return;
    }
    if (blob) void sendBlob(blob);
  };

  // الحالة 1: زر مايكروفون فقط - يختفي زر الإرسال
  if (!recording &&!blob) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); start(); }}
        disabled={disabled}
        className="w-12 h-12 rounded-full bg-white/5 border border-white/10 backdrop-blur-lg flex items-center justify-center disabled:opacity-50 active:scale-95 transition shrink-0 hover:bg-white/10"
        aria-label="تسجيل رسالة صوتية"
      >
        <svg className="w-5 h-5 text-foreground/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
        </svg>
      </button>
    );
  }

  // الحالة 2: كرت التسجيل - شكل كبسولة انستغرام
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 flex items-center w-[96%] h-[50px] my-[5px] px-[15px] bg-[#fff1f1] border border-[#ffcccc] rounded-[30px] shadow-[0_2px_8px_rgba(255,204,204,0.3)]"
      style={{ alignItems: 'center' }}
    >
      {/* زر الإرسال - يسار تماماً */}
      <button
        type="button"
        onClick={stopAndSend}
        disabled={sending}
        className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-red-500 hover:bg-red-600 transition-all shrink-0 disabled:opacity-60"
        aria-label="إرسال"
      >
        {sending? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </button>

      {/* التايمر */}
      <span className="text-xs font-bold font-mono text-red-600 tabular-nums shrink-0 w-10 text-center">
        {fmt(seconds)}
      </span>

      {/* موجات الصوت - تاخذ كل المساحة المتبقية flex-1 */}
      <div className="flex items-center gap-[1.5px] flex-1 h-6 overflow-hidden px-1">
        {levels.map((level, i) => (
          <span
            key={i}
            className="w-[2px] rounded-full bg-red-500/70 transition-all duration-75"
            style={{
              height: `${Math.max(2, level * 18)}px`,
              opacity: recording? 0.8 : 0.4,
            }}
          />
        ))}
      </div>

      {/* زر الحذف - يمين تماماً */}
      <button
        type="button"
        onClick={cancel}
        className="w-8 h-8 rounded-full border border-red-300/60 hover:bg-red-50 flex items-center justify-center transition-all shrink-0"
        aria-label="حذف التسجيل"
      >
        <Trash2 className="w-3.5 h-3.5 text-red-500/90" />
      </button>
    </div>
  );
}