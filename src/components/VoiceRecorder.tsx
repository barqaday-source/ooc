// ====================================================================
// VoiceRecorder - نسخة نهائية: mp4 + بدون AudioContext + معالجة أخطاء
// ====================================================================

import { useEffect, useRef, useState } from "react";
import { Send, Trash2, Loader2 } from "lucide-react";
import { VoiceRecorder } from 'capacitor-voice-recorder';

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

export default function VoiceRecorderComponent({ onSend, disabled }: Props) {
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
  const fakeWaveRef = useRef<number | null>(null);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (fakeWaveRef.current) {
      cancelAnimationFrame(fakeWaveRef.current);
      fakeWaveRef.current = null;
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, []);

  // موجات وهمية تتحرك وقت التسجيل فقط للشكل
  const fakeAnalyze = () => {
    const newLevels = Array.from({ length: BAR_COUNT }, () => {
      return Math.random() * 0.8 + 0.2;
    });
    setLevels(newLevels);
    fakeWaveRef.current = requestAnimationFrame(() => {
      setTimeout(fakeAnalyze, 100);
    });
  };

  const start = async () => {
    try {
      // 1. التحقق من إذن Capacitor أولاً
      let status = await VoiceRecorder.hasAudioRecordingPermission();
      if (!status.value) {
        status = await VoiceRecorder.requestAudioRecordingPermission();
      }
      if (!status.value) {
        alert("تم رفض إذن الميكروفون. فعّله من: الإعدادات > التطبيقات > تطبيقك > الأذونات > الميكروفون");
        return;
      }

      // 2. نشغل getUserMedia مباشرة - بدون AudioContext
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      streamRef.current = stream;

      // 3. ترتيب الأولويات لأندرويد: mp4 أولاً
      const preferredMimeTypes = [
        "audio/mp4",
        "audio/aac",
        "audio/mpeg",
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus"
      ];

      let selectedMime = "";
      for (const mime of preferredMimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          console.log("Selected MIME:", selectedMime);
          break;
        }
      }

      const options: MediaRecorderOptions = selectedMime
       ? { mimeType: selectedMime, audioBitsPerSecond: 128000 }
        : { audioBitsPerSecond: 128000 };

      const mr = new MediaRecorder(stream, options);
      mediaRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mr.onstop = () => {
        const finalMime = mr.mimeType || "audio/mp4";
        const b = new Blob(chunksRef.current, { type: finalMime });
        console.log("Final Blob MIME:", finalMime, "Size:", b.size);
        setBlob(b);
        cleanupStream();
        setLevels(Array(BAR_COUNT).fill(0.2));

        if (pendingSendRef.current) {
          pendingSendRef.current = false;
          void sendBlob(b);
        }
      };

      mr.onerror = (e) => {
        console.error("MediaRecorder error:", e);
        alert("حدث خطأ أثناء التسجيل");
        cancel();
      };

      mr.start(250);
      setRecording(true);
      setSeconds(0);
      setBlob(null);
      fakeAnalyze();
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);

    } catch (e) {
      console.error("خطأ فادح في بدء التسجيل:", e);
      alert("فشل الوصول للميكروفون. تأكد من تشغيل npx cap sync android");
      cleanupStream();
    }
  };

  const cancel = () => {
    if (recording && mediaRef.current?.state === "recording") {
      mediaRef.current.stop();
    }
    setRecording(false);
    setBlob(null);
    setSeconds(0);
    setLevels(Array(BAR_COUNT).fill(0.2));
    cleanupStream();
  };

  const sendBlob = async (b: Blob) => {
    if (b.size === 0) {
      alert("التسجيل فارغ. حاول مرة أخرى");
      return;
    }

    setSending(true);
    try {
      await onSend(b, seconds);
      setBlob(null);
      setSeconds(0);
      setLevels(Array(BAR_COUNT).fill(0.2));
    } catch (e) {
      console.error("فشل الإرسال:", e);
      alert("فشل إرسال التسجيل");
    } finally {
      setSending(false);
    }
  };

  const stopAndSend = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (recording && mediaRef.current?.state === "recording") {
      pendingSendRef.current = true;
      mediaRef.current.stop();
      setRecording(false);
    } else if (blob) {
      void sendBlob(blob);
    }
  };

  // الحالة 1: زر مايكروفون فقط
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

  // الحالة 2: كرت التسجيل
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 flex items-center w-[96%] h-[50px] my-[5px] px-[15px] bg-[#fff1f1] border border-[#ffcccc] rounded-[30px] shadow-[0_2px_8px_rgba(255,204,204,0.3)]"
    >
      <button
        type="button"
        onClick={stopAndSend}
        disabled={sending}
        className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-red-500 hover:bg-red-600 transition-all shrink-0 disabled:opacity-60"
        aria-label="إرسال"
      >
        {sending? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </button>

      <span className="text-xs font-bold font-mono text-red-600 tabular-nums shrink-0 w-10 text-center">
        {fmt(seconds)}
      </span>

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

      <button
        type="button"
        onClick={cancel}
        disabled={sending}
        className="w-8 h-8 rounded-full border border-red-300/60 hover:bg-red-50 flex items-center justify-center transition-all shrink-0 disabled:opacity-60"
        aria-label="حذف التسجيل"
      >
        <Trash2 className="w-3.5 h-3.5 text-red-500/90" />
      </button>
    </div>
  );
            }
