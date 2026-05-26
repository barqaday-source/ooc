// ====================================================================
// VoiceRecorder - نسخة مضمونة: طلب إذن WebView + تسجيل نيتيف
// ====================================================================

import { useState } from "react";
import { Send, Trash2, Loader2, Mic } from "lucide-react";
import { VoiceRecorder, RecordingData } from 'capacitor-voice-recorder';

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
  const [sending, setSending] = useState(false);
  const [levels, setLevels] = useState<number[]>(Array(BAR_COUNT).fill(0.2));
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null);
  const [waveId, setWaveId] = useState<number | null>(null);

  const fakeAnalyze = () => {
    const newLevels = Array.from({ length: BAR_COUNT }, () => {
      return Math.random() * 0.8 + 0.2;
    });
    setLevels(newLevels);
    const id = requestAnimationFrame(() => {
      setTimeout(fakeAnalyze, 100);
    });
    setWaveId(id);
  };

  const stopTimers = () => {
    if (timerId) clearInterval(timerId);
    if (waveId) cancelAnimationFrame(waveId);
    setTimerId(null);
    setWaveId(null);
  };

  const start = async () => {
    try {
      // الخطوة 1: طلب الإذن من WebView - هذا يطلع البوب اب
      console.log("طلب الإذن من WebView...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      // نوقف الستريم فوراً لأننا نستخدم البلاگن النيتيف للتسجيل
      stream.getTracks().forEach(track => track.stop());
      console.log("WebView وافق على المايك");

      // الخطوة 2: طلب الإذن من البلاگن النيتيف
      const perm = await VoiceRecorder.requestAudioRecordingPermission();
      
      if (!perm.value) {
        alert("يرجى منح التطبيق إذن الوصول للميكروفون من إعدادات الهاتف > التطبيقات > دردشاتي > الأذونات");
        return;
      }

      // الخطوة 3: ابدأ التسجيل النيتيف
      const startResult = await VoiceRecorder.startRecording();
      
      if (!startResult.value) {
        alert("فشل بدء التسجيل");
        return;
      }

      setRecording(true);
      setSeconds(0);
      fakeAnalyze();
      
      const id = setInterval(() => setSeconds((s) => s + 1), 1000);
      setTimerId(id);

    } catch (error: any) {
      console.error("فشل الوصول إلى المايك:", error);
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        alert("يرجى منح التطبيق إذن الوصول للميكروفون من إعدادات الهاتف.");
      } else {
        alert(`فشل الوصول للمايك: ${error.message}`);
      }
    }
  };

  const stopAndSend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!recording) return;

    setRecording(false);
    stopTimers();
    setSending(true);

    try {
      const result: RecordingData = await VoiceRecorder.stopRecording();
      
      if (!result.value?.recordDataBase64) {
        alert("التسجيل فارغ");
        setSending(false);
        return;
      }

      const base64 = result.value.recordDataBase64;
      const mimeType = result.value.mimeType || "audio/aac";
      
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      if (blob.size < 1000) {
        alert("الصوت قصير جداً أو فارغ");
        setSending(false);
        return;
      }

      await onSend(blob, seconds);
      setSeconds(0);
      setLevels(Array(BAR_COUNT).fill(0.2));
      
    } catch (e: any) {
      console.error("فشل الإرسال:", e);
      alert(`فشل إرسال التسجيل: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  const cancel = async () => {
    if (recording) {
      await VoiceRecorder.stopRecording();
    }
    setRecording(false);
    setSeconds(0);
    setLevels(Array(BAR_COUNT).fill(0.2));
    stopTimers();
  };

  if (!recording) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); start(); }}
        disabled={disabled || sending}
        className="w-12 h-12 rounded-full bg-white/5 border border-white/10 backdrop-blur-lg flex items-center justify-center disabled:opacity-50 active:scale-95 transition shrink-0 hover:bg-white/10"
        aria-label="تسجيل رسالة صوتية"
      >
        <Mic className="w-5 h-5 text-foreground/80" />
      </button>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 flex items-center w-[96%] h- my-[5px] px- bg-[#fff1f1] border border-[#ffcccc] rounded- shadow-[0_2px_8px_rgba(255,204,204,0.3)]"
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
              opacity: 0.8,
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
