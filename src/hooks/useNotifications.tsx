// ====================================================================
// useNotifications - إشعارات الرسائل + ردود البلاغات + تخزين في جدول notifications
// ====================================================================

import { useEffect, useRef } from "react";
import { supabase, type Message } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function useNotifications(activeRoomId: string | null) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user || channelRef.current) return;

    const channel = supabase.channel(`notifications:${user.id}`, {
      config: { broadcast: { self: false } },
    });

    // 1. إشعارات الرسائل الجديدة
    channel
  .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `user_id=neq.${user.id}`
        },
        async (payload) => {
          const msg = payload.new as Message;

          // لو الغرفة مفتوحة، لا ترسل إشعار
          if (msg.room_id === activeRoomId) return;

          // جلب بيانات المرسل والغرفة
          const [{ data: profile }, { data: room }] = await Promise.all([
            supabase.from("profiles").select("display_name, username, avatar_url").eq("id", msg.user_id).maybeSingle(),
            supabase.from("rooms").select("name, is_dm").eq("id", msg.room_id).maybeSingle()
          ]);

          const sender = profile?.display_name || profile?.username || "صديق";
          const isText = msg.message_type === 'text' ||!msg.message_type;

          // تحقق هل هذا رد على رسالتي
          let notifType = 'message';
          let title = `💬 ${sender}`;
          let body = '';

          if (msg.reply_to_id) {
            const { data: parentMsg } = await supabase
          .from("messages")
          .select("user_id")
          .eq("id", msg.reply_to_id)
          .maybeSingle();

            if (parentMsg?.user_id === user.id) {
              notifType = 'message_reply';
              title = `↩︎ ${sender} رد عليك`;
            }
          }

          if (room?.is_dm) {
            body = isText? msg.content.slice(0, 60) + (msg.content.length > 60? '...' : '') : "📷 أرسل وسائط";
          } else {
            body = `في ${room?.name || 'غرفة'}: ${isText? msg.content.slice(0, 50) + (msg.content.length > 50? '...' : '') : "📷 وسائط"}`;
          }

          // تخزين الإشعار
          const { error } = await supabase.from("notifications").insert({
            user_id: user.id,
            type: notifType,
            title,
            body,
            link: `/chat/${msg.room_id}`,
            metadata: {
              message_id: msg.id,
              room_id: msg.room_id,
              sender_id: msg.user_id,
              sender_avatar: profile?.avatar_url
            }
          });

          if (error) console.error('Failed to save notification:', error);

          // Toast فوري
          toast(title, {
            description: body,
            duration: 5000,
            action: {
              label: "عرض",
              onClick: () => navigate(`/chat/${msg.room_id}`),
            },
          });
        },
      );

    // 2. إشعارات ردود الأدمن على البلاغات + تحذير/حظر
    channel
  .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const notif = payload.new as any;

          // بس الإشعارات الجديدة من نوع report_response أو warning أو ban
          if (['report_response', 'warning', 'ban'].includes(notif.type)) {
            toast(notif.title, {
              description: notif.body,
              duration: 8000,
              action: notif.link? {
                label: "عرض",
                onClick: () => navigate(notif.link),
              } : undefined,
            });
          }
        }
      )
  .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Notifications channel ready for user: ${user.id}`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('Notifications channel error');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, navigate, activeRoomId]);

  const activeRoomRef = useRef(activeRoomId);
  useEffect(() => {
    activeRoomRef.current = activeRoomId;
  }, [activeRoomId]);
}