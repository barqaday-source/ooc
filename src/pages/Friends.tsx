// ====================================================================
// Friends - الأصدقاء وطلبات الصداقة والحظر الشخصي
// ====================================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, type Profile, type Friendship } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { ArrowRight, Loader2, UserPlus, Check, X, Ban, Search, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface Row {
  friendship: Friendship;
  other: Profile;
  iAmRequester: boolean;
}

export default function Friends() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"friends" | "requests" | "blocked">("friends");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    const list = (data as Friendship[]) ?? [];
    const otherIds = list.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id);
    const { data: profiles } = otherIds.length
      ? await supabase.from("profiles").select("*").in("id", otherIds)
      : { data: [] as Profile[] };
    const profMap = new Map(((profiles as Profile[]) ?? []).map(p => [p.id, p]));

    setRows(list.map(f => ({
      friendship: f,
      other: profMap.get(f.requester_id === user.id ? f.addressee_id : f.requester_id)!,
      iAmRequester: f.requester_id === user.id,
    })).filter(r => r.other));
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user]);

  const doSearch = async () => {
    if (!search.trim() || !user) return;
    const { data } = await supabase
      .from("profiles").select("*")
      .ilike("username", `%${search.trim()}%`).neq("id", user.id).limit(20);
    setSearchResults((data as Profile[]) ?? []);
  };

  const sendRequest = async (otherId: string) => {
    const { error } = await supabase.from("friendships")
      .insert({ requester_id: user!.id, addressee_id: otherId, status: "pending" });
    if (error) toast.error("فشل", { description: error.message });
    else {
      // إشعار الطرف الآخر بطلب صداقة
      await supabase.from("notifications").insert({
        user_id: otherId,
        type: "friend_request",
        title: "طلب صداقة جديد",
        body: `أرسل لك مستخدم طلب صداقة`,
        link: "/friends",
      });
      toast.success("أُرسل الطلب"); refresh(); setSearchResults([]); setSearch("");
    }
  };

  const respond = async (id: string, status: "accepted" | "blocked") => {
    const row = rows.find(r => r.friendship.id === id);
    const { error } = await supabase.from("friendships").update({ status }).eq("id", id);
    if (error) toast.error("فشل", { description: error.message });
    else {
      // عند القبول، أعلم صاحب الطلب
      if (status === "accepted" && row) {
        await supabase.from("notifications").insert({
          user_id: row.friendship.requester_id,
          type: "friend_accept",
          title: "تم قبول طلب الصداقة",
          body: `قُبل طلب صداقتك`,
          link: "/friends",
        });
      }
      toast.success(status === "accepted" ? "صار صديقاً" : "تم الحظر"); refresh();
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("friendships").delete().eq("id", id);
    if (error) toast.error("فشل", { description: error.message });
    else { toast.success("أُزيل"); refresh(); }
  };

  const block = async (otherId: string) => {
    // ابحث عن friendship موجودة أو أنشئ
    const existing = rows.find(r => r.other.id === otherId);
    if (existing) await respond(existing.friendship.id, "blocked");
    else {
      const { error } = await supabase.from("friendships")
        .insert({ requester_id: user!.id, addressee_id: otherId, status: "blocked" });
      if (error) toast.error("فشل", { description: error.message });
      else { toast.success("تم الحظر"); refresh(); }
    }
  };

  const startDm = async (otherId: string) => {
    const { data, error } = await supabase.rpc("get_or_create_dm", { other_user_id: otherId });
    if (error || !data) {
      toast.error("تعذّر بدء المحادثة", { description: error?.message });
      return;
    }
    navigate(`/chat/${data}`);
  };

  const friends = rows.filter(r => r.friendship.status === "accepted");
  const requests = rows.filter(r => r.friendship.status === "pending" && !r.iAmRequester);
  const sent = rows.filter(r => r.friendship.status === "pending" && r.iAmRequester);
  const blocked = rows.filter(r => r.friendship.status === "blocked" && r.iAmRequester);

  return (
    <AppShell>
      <div className="p-4 anim-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/profile")} className="p-2"><ArrowRight className="w-5 h-5" /></button>
          <h2 className="font-bold text-lg">الأصدقاء</h2>
        </div>

        {/* بحث */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 flex items-center gap-2 bg-card rounded-xl px-3 h-11 border border-border">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder="ابحث باسم المستخدم..."
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
          <button onClick={doSearch} className="px-4 h-11 rounded-xl bg-foreground text-background text-sm font-semibold">بحث</button>
        </div>

        {searchResults.length > 0 && (
          <div className="bg-card rounded-2xl p-2 mb-4 space-y-1">
            {searchResults.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2">
                <button
                  onClick={() => navigate(`/u/${p.id}`)}
                  className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center font-bold text-sm active:scale-95"
                  aria-label="عرض الملف"
                >
                  {(p.display_name || p.username).charAt(0).toUpperCase()}
                </button>
                <button onClick={() => navigate(`/u/${p.id}`)} className="flex-1 min-w-0 text-right">
                  <p className="text-sm font-semibold truncate">{p.display_name || p.username}</p>
                  <p className="text-[10px] text-muted-foreground">@{p.username}</p>
                </button>
                <button onClick={() => sendRequest(p.id)}
                  className="w-9 h-9 rounded-lg bg-foreground text-background flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4 p-1 bg-card rounded-2xl">
          {([
            ["friends", `الأصدقاء (${friends.length})`],
            ["requests", `طلبات (${requests.length})`],
            ["blocked", `محظورون (${blocked.length})`],
          ] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex-1 h-10 rounded-xl text-xs font-semibold transition ${
                tab === k ? "bg-foreground text-background" : "text-muted-foreground"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="space-y-2">
            {tab === "friends" && friends.map(r => (
              <Card key={r.friendship.id} p={r.other}
                actions={<>
                  <button onClick={() => startDm(r.other.id)} className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center" aria-label="محادثة"><MessageCircle className="w-4 h-4" /></button>
                  <button onClick={() => block(r.other.id)} className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center"><Ban className="w-4 h-4" /></button>
                  <button onClick={() => remove(r.friendship.id)} className="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center"><X className="w-4 h-4" /></button>
                </>}
              />
            ))}
            {tab === "friends" && friends.length === 0 && <Empty msg="لا يوجد أصدقاء بعد" />}

            {tab === "requests" && (
              <>
                {requests.map(r => (
                  <Card key={r.friendship.id} p={r.other}
                    actions={<>
                      <button onClick={() => respond(r.friendship.id, "accepted")} className="w-9 h-9 rounded-lg bg-success/10 text-success flex items-center justify-center"><Check className="w-4 h-4" /></button>
                      <button onClick={() => remove(r.friendship.id)} className="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center"><X className="w-4 h-4" /></button>
                    </>}
                    badge="طلب وارد"
                  />
                ))}
                {sent.map(r => (
                  <Card key={r.friendship.id} p={r.other}
                    actions={<button onClick={() => remove(r.friendship.id)} className="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center"><X className="w-4 h-4" /></button>}
                    badge="طلب صادر"
                  />
                ))}
                {requests.length === 0 && sent.length === 0 && <Empty msg="لا توجد طلبات" />}
              </>
            )}

            {tab === "blocked" && blocked.map(r => (
              <Card key={r.friendship.id} p={r.other}
                actions={<button onClick={() => remove(r.friendship.id)} className="px-3 h-9 rounded-lg bg-background border border-border text-xs font-semibold">إلغاء الحظر</button>}
                badge="محظور"
              />
            ))}
            {tab === "blocked" && blocked.length === 0 && <Empty msg="لا يوجد محظورون" />}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Card({ p, actions, badge }: { p: Profile; actions: React.ReactNode; badge?: string }) {
  return (
    <div className="bg-card rounded-2xl p-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-bold text-sm shrink-0">
        {(p.display_name || p.username).charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold truncate">{p.display_name || p.username}</p>
          {badge && <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">{badge}</span>}
        </div>
        <p className="text-[10px] text-muted-foreground">@{p.username}</p>
      </div>
      <div className="flex gap-1.5">{actions}</div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p className="text-center text-muted-foreground text-sm py-8">{msg}</p>;
}
