// ====================================================================
// Profile - الحساب الشخصي + رفع صورة من الجهاز
// ====================================================================

import { ChangeEvent, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { uploadUserAvatar, compressImage } from "@/lib/upload";
import AppShell from "@/components/AppShell";
import UserAvatar from "@/components/UserAvatar";
import { Camera, Loader2, Pencil, Save, Shield, SlidersHorizontal, Users } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, isAdmin, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const actions = [
    { label: "الأصدقاء", icon: Users, onClick: () => navigate("/friends") },
    { label: "الإعدادات", icon: SlidersHorizontal, onClick: () => navigate("/dashboard") },
    ...(isAdmin ? [{ label: "لوحة الأدمن", icon: Shield, onClick: () => navigate("/admin") }] : []),
  ];

  const handleAvatarPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("اختر ملف صورة فقط");
      return;
    }
    setUploadingAvatar(true);
    try {
      const compressed = await compressImage(file, 512, 0.85);
      const { url, error } = await uploadUserAvatar(user.id, compressed);
      if (error || !url) throw error || new Error("فشل الرفع");
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", user.id);
      if (updErr) throw updErr;
      await refreshProfile();
      toast.success("تم تحديث الصورة");
    } catch (err) {
      toast.error("فشل تحديث الصورة", { description: (err as Error).message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
    }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error("فشل الحفظ", { description: error.message });
    else { toast.success("تم الحفظ"); await refreshProfile(); setEditing(false); }
  };

  return (
    <AppShell>
      <div className="anim-fade-in">
        {/* Hero */}
        <div className="glass-thick mx-4 mt-2 px-6 pt-8 pb-10 rounded-[2.5rem] shadow-glassy text-center relative">
          <div className="relative w-28 h-28 mx-auto">
            <UserAvatar
              src={profile?.avatar_url}
              name={profile?.display_name || profile?.username}
              size="xl"
              ring
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -left-1 w-9 h-9 bg-foreground text-background rounded-2xl flex items-center justify-center shadow-elev disabled:opacity-50"
              aria-label="تغيير الصورة"
            >
              {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarPick} />
          </div>
          <h2 className="font-bold text-xl mt-4">{profile?.display_name || profile?.username || "—"}</h2>
          <p className="text-sm opacity-70 mt-1">@{profile?.username || "—"}</p>
          <button
            onClick={() => setEditing(true)}
            className="mt-5 h-12 w-full rounded-[1.4rem] bg-foreground text-background font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition"
          >
            <Pencil className="w-4 h-4" /> تعديل الملف
          </button>
          {isAdmin && (
            <span className="inline-flex items-center gap-1 mt-2 text-[10px] bg-foreground text-background px-2 py-1 rounded-full font-semibold">
              <Shield className="w-3 h-3" /> أدمن
            </span>
          )}
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {!editing ? (
            <>
              <div className="glass-card rounded-[2rem] p-5 shadow-glassy">
                <p className="text-xs text-muted-foreground mb-1">النبذة</p>
                <p className="text-sm">{profile?.bio || "لا توجد نبذة بعد"}</p>
              </div>

              <div className="space-y-2.5">
                {actions.map(({ label, icon: Icon, onClick }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    className="w-full rounded-[1.4rem] glass-card shadow-glassy flex items-center gap-3 p-4 active:scale-[0.98] transition font-bold text-right"
                  >
                    <span className="w-11 h-11 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="text-sm flex-1">{label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-3 glass-card rounded-[2rem] p-4">
              <div>
                <label className="text-xs text-muted-foreground px-1 mb-1 block">الاسم الظاهر</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60}
                  className="w-full h-12 px-4 rounded-2xl glass outline-none text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground px-1 mb-1 block">النبذة</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} rows={3}
                  className="w-full px-4 py-3 rounded-2xl glass outline-none text-sm resize-none" />
              </div>

              <div className="flex gap-2">
                <button onClick={() => setEditing(false)}
                  className="flex-1 h-12 rounded-2xl glass font-semibold">إلغاء</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 h-12 rounded-2xl bg-foreground text-background font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> حفظ</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
