// ====================================================================
// Friends - الأصدقاء وطلبات الصداقة والحظر الشخصي
// ====================================================================

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, type Profile, type Friendship } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { ArrowRight, Loader2, UserPlus, Check, X, Ban, Search, MessageCircle, Clock, UserCheck } from "lucide-react";
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
  const [searching, setSearching] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: friendships, error: friendshipsError } = await supabase
.from("friendships")
.select("*")
.or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (friendshipsError) throw friendshipsError;

      const list = (friendships as Friendship[])?? [];

      if (list.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const otherIds = list.map(f => f.requester_id === user.id? f.addressee_id : f.requester_id);
      const { data: profiles, error: profilesError } = await supabase
.from("profiles")
.select("*")
.in("id", otherIds);

      if (profilesError) throw profilesError;

      const profMap = new Map(((profiles as Profile[])?? []).map(p => [p.id, p]));

      const newRows = list.map(f => ({
        friendship: f,
        other: profMap.get(f.requester_id === user.id? f.addressee_id : f.requester_id)!,
        iAmRequester: f.requester_id === user.id,
      })).filter(r => r.other);

      setRows(newRows);
    } catch (error: any) {
      console.error('Error fetching friends:', error);
      toast.error("فشل تحميل الأصدقاء", { description: error.message });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const doSearch = async () => {
    if (!search.trim() ||!user?.id) return;

    setSearching(true);
    try {
      const { data, error } = await supabase
.from("profiles")
.select("*")
.ilike("username", `%${search.trim()}%`)
.neq("id", user.id)
.limit(20);

      if (error) throw error;
      setSearchResults((data as Profile[])?? []);
    } catch (error: any) {
      toast.error("فشل البحث", { description: error.message });
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async (otherId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase.from("friendships").insert({
        requester_id: user.id,
        addressee_id: otherId,
        status: "pending"
      });

      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: otherId,
        type: "friend_request",
        title: "طلب صداقة جديد",
        body: `أرسل لك ${user.user_metadata?.display_name || 'مستخدم'} طلب صداقة`,
        link: "/friends",
      });

      toast.success("أُرسل الطلب");
      refresh();
      setSearchResults([]);
      setSearch("");
    } catch (error: any) {
      toast.error("فشل الإرسال", { description: error.message });
    }
  };

  const respond = async (id: string, status: "accepted" | "blocked") => {
    const row = rows.find(r => r.friendship.id === id);

    try {
      const { error } = await supabase.from("friendships").update({ status }).eq("id", id);
      if (error) throw error;

      if (status === "accepted" && row) {
        await supabase.from("notifications").insert({
          user_id: row.friendship.requester_id,
          type: "friend_accept",
          title: "تم قبول طلب الصداقة",
          body: `قبل ${user?.user_metadata?.display_name || 'مستخدم'} طلب صداقتك`,
          link: "/friends",
        });
      }

      toast.success(status === "accepted"? "صار صديقاً" : "تم الحظر");
      refresh();
    } catch (error: any) {
      toast.error("فشل العملية", { description: error.message });
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from("friendships").delete().eq("id", id);
      if (error) throw error;
      toast.success("أُزيل");
      refresh();
    } catch (error: any) {
      toast.error("فشل الحذف", { description: error.message });
    }
  };

  const block = async (otherId: string) => {
    if (!user?.id) return;

    const existing = rows.find(r => r.other.id === otherId);
    if (existing) {
      await respond(existing.friendship.id, "blocked");
    } else {
      try {
        const { error } = await supabase.from("friendships").insert({
          requester_id: user.id,
          addressee_id: otherId,
          status: "blocked"
        });
        if (error) throw error;
        toast.success("تم الحظر");
        refresh();
      } catch (error: any) {
        toast.error("فشل الحظر", { description: error.message });
      }
    }
  };

  const startDm = async (otherId: string) => {
    try {
      const { data, error } = await supabase.rpc("get_or_create_dm", { other_user_id: otherId });
      if (error ||!data) throw error || new Error("No data returned");
      navigate(`/chat/${data}`);
    } catch (error: any) {
      toast.error("تعذّر بدء المحادثة", { description: error?.message });
    }
  };

  const friends = rows.filter(r => r.friendship.status === "accepted");
  const requests = rows.filter(r => r.friendship.status === "pending" &&!r.iAmRequester);
  const sent = rows.filter(r => r.friendship.status === "pending" && r.iAmRequester);
  const blocked = rows.filter(r => r.friendship.status === "blocked" && r.iAmRequester);

  if (!user) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">يجب تسجيل الدخول</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-4 anim-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/profile")} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition">
            <ArrowRight className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-lg">الأصدقاء</h2>
        </div>

        <div className="flex gap-2 mb-4">
          <div className="flex-1 flex items-center gap-2 bg-card rounded-full px-3 h-11 border border-border">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder="ابحث باسم المستخدم..."
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
          <button
            onClick={doSearch}
            disabled={searching}
            className="px-4 h-11 rounded-full bg-foreground text-background text-sm font-semibold active:scale-95 transition disabled:opacity-50"
          >
            {searching? <Loader2 className="w-4 h-4 animate-spin" /> : "بحث"}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {searchResults.map(p => (
              <SearchCard key={p.id} p={p} onAdd={() => sendRequest(p.id)} />
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-4 p-1 bg-card rounded-full">
          {([
            ["friends", `الأصدقاء (${friends.length})`],
            ["requests", `طلبات (${requests.length})`],
            ["blocked", `محظورون (${blocked.length})`],
          ] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex-1 h-10 rounded-full text-xs font-semibold transition ${
                tab === k? "bg-foreground text-background" : "text-muted-foreground"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {loading? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <>
            {(tab === "friends" || tab === "blocked") && (
              <div className="grid grid-cols-2 gap-3">
                {tab === "friends" && friends.map(r => (
                  <FriendCard
                    key={r.friendship.id}
                    p={r.other}
                    onDm={() => startDm(r.other.id)}
                    onBlock={() => block(r.other.id)}
                    onRemove={() => remove(r.friendship.id)}
                  />
                ))}
                {tab === "friends" && friends.length === 0 && <Empty msg="لا يوجد أصدقاء بعد" />}

                {tab === "blocked" && blocked.map(r => (
                  <BlockedCard
                    key={r.friendship.id}
                    p={r.other}
                    onUnblock={() => remove(r.friendship.id)}
                  />
                ))}
                {tab === "blocked" && blocked.length === 0 && <Empty msg="لا يوجد محظورون" />}
              </div>
            )}

            {tab === "requests" && (
              <div className="space-y-4">
                {requests.map(r => (
                  <RequestRow
                    key={r.friendship.id}
                    p={r.other}
                    onAccept={() => respond(r.friendship.id, "accepted")}
                    onReject={() => remove(r.friendship.id)}
                    type="incoming"
                  />
                ))}
                {sent.map(r => (
                  <RequestRow
                    key={r.friendship.id}
                    p={r.other}
                    onCancel={() => remove(r.friendship.id)}
                    type="outgoing"
                  />
                ))}
                {requests.length === 0 && sent.length === 0 && <Empty msg="لا توجد طلبات" fullWidth />}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function FriendCard({ p, onDm, onBlock, onRemove }: {
  p: Profile;
  onDm: () => void;
  onBlock: () => void;
  onRemove: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl rounded-2xl p-4 flex flex-col items-center text-center shadow-lg border border-white/20 dark:border-white/10">
      <button
        onClick={() => navigate(`/u/${p.id}`)}
        className="w-16 h-16 rounded-full bg-white/20 dark:bg-black/20 backdrop-blur-md flex items-center justify-center font-bold text-lg mb-3 shadow-inner active:scale-95 transition border border-white/30 overflow-hidden"
      >
        {p.avatar_url? (
          <img src={p.avatar_url} alt={p.display_name || p.username} className="w-full h-full object-cover" />
        ) : (
          (p.display_name || p.username).charAt(0).toUpperCase()
        )}
      </button>

      <div className="mb-3 flex-1">
        <p className="font-bold text-sm truncate text-foreground">{p.display_name || p.username}</p>
      </div>

      <button
        onClick={onDm}
        className="w-full py-2.5 rounded-full bg-black/80 dark:bg-white/90 text-white dark:text-black text-xs font-bold active:scale-95 transition mb-2 backdrop-blur-sm"
      >
        محادثة
      </button>

      <div className="w-full flex gap-2">
        <button
          onClick={onBlock}
          className="flex-1 h-9 rounded-full bg-black/10 dark:bg-white/10 backdrop-blur-sm text-foreground flex items-center justify-center active:scale-95 transition border border-white/10"
        >
          <Ban className="w-4 h-4" />
        </button>
        <button
          onClick={onRemove}
          className="flex-1 h-9 rounded-full bg-black/10 dark:bg-white/10 backdrop-blur-sm text-foreground flex items-center justify-center active:scale-95 transition border border-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// كرت الطلبات الجديد - بلا كرت ولا حدود، سطر شفاف فقط
function RequestRow({ p, onAccept, onReject, onCancel, type }: {
  p: Profile;
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  type: "incoming" | "outgoing";
}) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-3 py-2">
      <button
        onClick={() => navigate(`/u/${p.id}`)}
        className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center font-bold text-lg active:scale-95 transition shrink-0 overflow-hidden"
      >
        {p.avatar_url? (
          <img src={p.avatar_url} alt={p.display_name || p.username} className="w-full h-full object-cover" />
        ) : (
          (p.display_name || p.username).charAt(0).toUpperCase()
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate">{p.display_name || p.username}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {type === "incoming"? (
            <>
              <UserCheck className="w-3 h-3 text-foreground/60 shrink-0" />
              <span className="text-xs text-muted-foreground">طلب صداقة وارد</span>
            </>
          ) : (
            <>
              <Clock className="w-3 h-3 text-foreground/60 shrink-0" />
              <span className="text-xs text-muted-foreground">طلب صداقة صادر</span>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2 shrink-0">
        {type === "incoming"? (
          <>
            <button
              onClick={onAccept}
              className="px-4 py-2 rounded-full bg-foreground text-background text-xs font-bold active:scale-95 transition"
            >
              قبول
            </button>
            <button
              onClick={onReject}
              className="px-4 py-2 rounded-full bg-black/10 dark:bg-white/10 text-foreground text-xs font-bold active:scale-95 transition"
            >
              رفض
            </button>
          </>
        ) : (
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-full bg-black/10 dark:bg-white/10 text-foreground text-xs font-bold active:scale-95 transition"
          >
            إلغاء الطلب
          </button>
        )}
      </div>
    </div>
  );
}

function BlockedCard({ p, onUnblock }: { p: Profile; onUnblock: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl rounded-2xl p-4 flex flex-col items-center text-center shadow-lg border border-white/20 dark:border-white/10">
      <button
        onClick={() => navigate(`/u/${p.id}`)}
        className="w-16 h-16 rounded-full bg-red-500/20 backdrop-blur-md flex items-center justify-center font-bold text-lg text-red-600 dark:text-red-400 mb-3 shadow-inner active:scale-95 transition border border-red-500/30 overflow-hidden"
      >
        {p.avatar_url? (
          <img src={p.avatar_url} alt={p.display_name || p.username} className="w-full h-full object-cover" />
        ) : (
          (p.display_name || p.username).charAt(0).toUpperCase()
        )}
      </button>

      <div className="mb-3 flex-1">
        <p className="font-bold text-sm truncate text-foreground">{p.display_name || p.username}</p>
        <span className="text-[9px] bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full mt-1 inline-block">محظور</span>
      </div>

      <button
        onClick={onUnblock}
        className="w-full py-2.5 rounded-full bg-black/80 dark:bg-white/90 text-white dark:text-black text-xs font-bold active:scale-95 transition backdrop-blur-sm"
      >
        إلغاء الحظر
      </button>
    </div>
  );
}

function SearchCard({ p, onAdd }: { p: Profile; onAdd: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl rounded-2xl p-4 flex flex-col items-center text-center shadow-lg border border-white/20 dark:border-white/10">
      <button
        onClick={() => navigate(`/u/${p.id}`)}
        className="w-16 h-16 rounded-full bg-white/20 dark:bg-black/20 backdrop-blur-md flex items-center justify-center font-bold text-lg mb-3 shadow-inner active:scale-95 transition border border-white/30 overflow-hidden"
      >
        {p.avatar_url? (
          <img src={p.avatar_url} alt={p.display_name || p.username} className="w-full h-full object-cover" />
        ) : (
          (p.display_name || p.username).charAt(0).toUpperCase()
        )}
      </button>

      <div className="mb-3 flex-1">
        <p className="font-bold text-sm truncate text-foreground">{p.display_name || p.username}</p>
      </div>

      <button
        onClick={onAdd}
        className="w-full py-2.5 rounded-full bg-black/80 dark:bg-white/90 text-white dark:text-black flex items-center justify-center gap-1 text-xs font-bold active:scale-95 transition backdrop-blur-sm"
      >
        <UserPlus className="w-4 h-4" /> إضافة
      </button>
    </div>
  );
}

function Empty({ msg, fullWidth = false }: { msg: string; fullWidth?: boolean }) {
  return (
    <div className={fullWidth? "text-center text-muted-foreground text-sm py-8" : "col-span-2 text-center text-muted-foreground text-sm py-8"}>
      {msg}
    </div>
  );
}