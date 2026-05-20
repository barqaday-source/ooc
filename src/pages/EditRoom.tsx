// ====================================================================
// EditRoom - تعديل الغرفة (لمالكها فقط)
// التصميم: صورة الغلاف في الأعلى مع زر رفع من الاستوديو،
// تحتها حقل الاسم، ثم النبذة، ثم زرّا حفظ وحذف.
// لا توجد روابط صور — الرفع المباشر فقط.
// ====================================================================

import { useEffect, useRef, useState, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase, type Room } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { uploadFile, compressImage } from "@/lib/upload";
import { ArrowRight, Loader2, Trash2, Camera, ImagePlus, Save } from "lucide-react";
import { toast } from "sonner";

export default function EditRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [room, setRoom] = useState<Room | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    supabase.from("rooms").select("*").eq("id", roomId).maybeSingle().then(({ data }) => {
      if (data) {
        const r = data as Room;
        setRoom(r);
        setName(r.name);
        setDescription(r.description ?? "");
        setCoverUrl(r.cover_url ?? "");
      }
      setLoading(false);
    });
  }, [roomId]);

  // اختيار صورة من الاستوديو → ضغطها → رفعها إلى bucket: room-covers
  const handlePickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("الرجاء اختيار صورة");
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressImage(file, 1280, 0.85);
      const { url, error } = await uploadFile("room-covers", user.id, compressed, "jpg");
      if (error || !url) {
        toast.error("فشل رفع الصورة", { description: error?.message });
      } else {
        setCoverUrl(url);
        toast.success("تم رفع الصورة");
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!room) {
    return <AppShell><div className="p-8 text-center">الغرفة غير موجودة</div></AppShell>;
  }

  if (room.owner_id !== user?.id) {
    return <AppShell><div className="p-8 text-center text-destructive">لا تملك صلاحية تعديل هذه الغرفة</div></AppShell>;
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("اسم الغرفة مطلوب");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("rooms").update({
      name: name.trim(),
      description: description.trim() || null,
      cover_url: coverUrl || null,
    }).eq("id", room.id);
    setSaving(false);
    if (error) {
      toast.error("فشل الحفظ", { description: error.message });
    } else {
      toast.success("تم حفظ التعديلات");
      navigate(`/chat/${room.id}`);
    }
  };

  const handleDelete = async () => {
    if (!confirm("هل تريد حذف الغرفة؟ سيتم حذف كل الرسائل ولا يمكن التراجع.")) return;
    const { error } = await supabase.from("rooms").delete().eq("id", room.id);
    if (error) toast.error("فشل الحذف", { description: error.message });
    else { toast.success("حُذفت الغرفة"); navigate("/rooms"); }
  };

  return (
    <AppShell>
      <div className="p-4 anim-fade-in space-y-5">
        {/* رأس الصفحة */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-2xl glass border border-white/40 active:scale-95 transition"
            aria-label="رجوع"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-lg">تعديل الغرفة</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* 1) صورة الغلاف + زر الرفع من الاستوديو */}
          <div className="relative w-full aspect-[16/10] rounded-[1.8rem] overflow-hidden glass-card border border-white/40 shadow-glassy">
            {coverUrl ? (
              <img src={coverUrl} alt="غلاف الغرفة" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2 bg-gradient-to-br from-primary/15 to-primary/5">
                <ImagePlus className="w-10 h-10" />
                <p className="text-xs">لا توجد صورة بعد</p>
              </div>
            )}

            {/* زر اختيار من الاستوديو */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePickImage}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 h-11 px-5 rounded-full glass-thick border border-white/50 text-sm font-semibold flex items-center gap-2 active:scale-95 transition disabled:opacity-60"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              {uploading ? "جارٍ الرفع..." : coverUrl ? "تغيير الصورة" : "رفع من الاستوديو"}
            </button>
          </div>

          {/* 2) اسم الغرفة */}
          <div>
            <label className="text-xs text-muted-foreground px-2 mb-1.5 block">اسم الغرفة</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={50}
              placeholder="مثال: غرفة الأصدقاء"
              className="w-full h-12 px-4 rounded-2xl glass border border-white/40 outline-none text-sm font-medium"
            />
          </div>

          {/* 3) نبذة عن الغرفة */}
          <div>
            <label className="text-xs text-muted-foreground px-2 mb-1.5 block">نبذة عن الغرفة</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="اكتب وصفاً مختصراً يعرّف الزوار بالغرفة..."
              className="w-full px-4 py-3 rounded-2xl glass border border-white/40 outline-none text-sm resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1 px-1">{description.length}/200</p>
          </div>

          {/* أزرار الحفظ والحذف */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || uploading}
              className="h-12 rounded-2xl bg-foreground text-background font-bold flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="h-12 rounded-2xl bg-destructive/10 text-destructive font-bold flex items-center justify-center gap-2 border border-destructive/20 active:scale-95 transition"
            >
              <Trash2 className="w-4 h-4" />
              حذف الغرفة
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
