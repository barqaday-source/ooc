// ====================================================================
// RoomMembers - إدارة أعضاء الغرفة (لمالك الغرفة/الأدمن)
// حظر دائم، استبعاد مؤقت، تعيين مشرفين
// ====================================================================

import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase, type Room, type Profile, type RoomBan, type RoomModerator } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { ArrowRight, Loader2, Shield, ShieldOff, Lock, Unlock, Clock } from "lucide-react";
import { toast } from "sonner";

interface MemberRow extends Profile {
  isModerator: boolean;
  ban?: RoomBan;
}

export default function RoomMembers() {
  const { roomId } = useParams<{ roomId: string }>();
  const [params] = useSearchParams();
  const focusBanId = params.get("ban");
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!roomId) return;
    setLoading(true);

    const { data: roomData } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
    setRoom(roomData as Room | null);

    // كل من شارك بالغرفة (من الرسائل) + المالك + المشرفين + المحظورين
    const [{ data: msgs }, { data: mods }, { data: bans }] = await Promise.all([
      supabase.from("messages").select("user_id").eq("room_id", roomId),
      supabase.from("room_moderators").select("*").eq("room_id", roomId),
      supabase.from("room_bans").select("*").eq("room_id", roomId),
    ]);

    const ids = new Set<string>();
    if (roomData) ids.add((roomData as Room).owner_id);
    ((msgs as { user_id: string }[]) ?? []).forEach(m => ids.add(m.user_id));
    ((mods as RoomModerator[]) ?? []).forEach(m => ids.add(m.user_id));
    ((bans as RoomBan[]) ?? []).forEach(b => ids.add(b.user_id));

    if (focusBanId) ids.add(focusBanId);

    if (ids.size === 0) { setMembers([]); setLoading(false); return; }

    const { data: profiles } = await supabase
      .from("profiles").select("*").in("id", Array.from(ids));

    const modMap = new Set(((mods as RoomModerator[]) ?? []).map(m => m.user_id));
    const banMap = new Map(((bans as RoomBan[]) ?? []).map(b => [b.user_id, b]));

    setMembers(((profiles as Profile[]) ?? []).map(p => ({
      ...p,
      isModerator: modMap.has(p.id),
      ban: banMap.get(p.id),
    })));
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [roomId]);

  if (loading) return <AppShell><div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div></AppShell>;
  if (!room) return <AppShell><div className="p-8 text-center">الغرفة غير موجودة</div></AppShell>;
  const canManage = room.owner_id === user?.id || isAdmin;
  if (!canManage) return <AppShell><div className="p-8 text-center text-destructive">لا تملك الصلاحية</div></AppShell>;

  const ban = async (userId: string, durationMin: number | null) => {
    const expires_at = durationMin ? new Date(Date.now() + durationMin * 60_000).toISOString() : null;
    const { error } = await supabase.from("room_bans").upsert(
      { room_id: roomId!, user_id: userId, banned_by: user!.id, expires_at, reason: durationMin ? "kick" : "ban" },
      { onConflict: "room_id,user_id" }
    );
    if (error) toast.error("فشل", { description: error.message });
    else { toast.success(durationMin ? "تم الاستبعاد المؤقت" : "تم الحظر الدائم"); refresh(); }
  };

  const unban = async (userId: string) => {
    const { error } = await supabase.from("room_bans").delete().eq("room_id", roomId!).eq("user_id", userId);
    if (error) toast.error("فشل", { description: error.message });
    else { toast.success("رُفع الحظر"); refresh(); }
  };

  const toggleMod = async (userId: string, isMod: boolean) => {
    if (isMod) {
      const { error } = await supabase.from("room_moderators").delete().eq("room_id", roomId!).eq("user_id", userId);
      if (error) toast.error("فشل", { description: error.message }); else { toast.success("أُلغي الإشراف"); refresh(); }
    } else {
      const { error } = await supabase.from("room_moderators").insert({ room_id: roomId!, user_id: userId });
      if (error) toast.error("فشل", { description: error.message }); else { toast.success("صار مشرفاً"); refresh(); }
    }
  };

  return (
    <AppShell>
      <div className="p-4 anim-fade-in">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(`/chat/${roomId}`)} className="p-2"><ArrowRight className="w-5 h-5" /></button>
          <div>
            <h2 className="font-bold text-lg">إدارة الأعضاء</h2>
            <p className="text-xs text-muted-foreground">{room.name}</p>
          </div>
        </div>

        <div className="space-y-2">
          {members.length === 0 && <p className="text-center text-muted-foreground py-12 text-sm">لا يوجد أعضاء بعد</p>}

          {members.map(m => {
            const isOwner = m.id === room.owner_id;
            const isMe = m.id === user?.id;
            const banned = m.ban && (!m.ban.expires_at || new Date(m.ban.expires_at) > new Date());
            const focused = focusBanId === m.id;

            return (
              <div key={m.id} className={`bg-card rounded-2xl p-3 ${focused ? "ring-2 ring-destructive" : ""}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-bold text-sm shrink-0">
                    {(m.display_name || m.username).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold truncate">{m.display_name || m.username}</p>
                      {isOwner && <span className="text-[9px] bg-foreground text-background px-1.5 py-0.5 rounded-md">صاحب</span>}
                      {m.isModerator && !isOwner && <span className="text-[9px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded-md">مشرف</span>}
                      {banned && <span className="text-[9px] bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-md">
                        {m.ban?.expires_at ? "مستبعد" : "محظور"}
                      </span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground">@{m.username}</p>
                  </div>
                </div>

                {!isOwner && !isMe && (
                  <div className="flex gap-1.5 flex-wrap">
                    {banned ? (
                      <button onClick={() => unban(m.id)}
                        className="flex-1 h-9 rounded-lg bg-success/10 text-success text-xs font-semibold flex items-center justify-center gap-1">
                        <Unlock className="w-3.5 h-3.5" /> رفع الحظر
                      </button>
                    ) : (
                      <>
                        <button onClick={() => ban(m.id, 60)} title="استبعاد ساعة"
                          className="flex-1 h-9 rounded-lg bg-background border border-border text-xs font-semibold flex items-center justify-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> استبعاد
                        </button>
                        <button onClick={() => ban(m.id, null)}
                          className="flex-1 h-9 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold flex items-center justify-center gap-1">
                          <Lock className="w-3.5 h-3.5" /> حظر
                        </button>
                      </>
                    )}
                    {room.owner_id === user?.id && (
                      <button onClick={() => toggleMod(m.id, m.isModerator)}
                        className="flex-1 h-9 rounded-lg bg-background border border-border text-xs font-semibold flex items-center justify-center gap-1">
                        {m.isModerator ? <><ShieldOff className="w-3.5 h-3.5" /> إلغاء إشراف</> : <><Shield className="w-3.5 h-3.5" /> تعيين مشرف</>}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
