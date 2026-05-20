// ====================================================================
// UserAvatar - صورة المستخدم مع fallback لحرف الاسم + مؤشر أونلاين
// ====================================================================

interface Props {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
  ring?: boolean;
}

const SIZES = {
  sm: { box: "w-8 h-8 rounded-full text-xs",    dot: "w-2 h-2"   },
  md: { box: "w-12 h-12 rounded-full text-sm",  dot: "w-2.5 h-2.5" },
  lg: { box: "w-16 h-16 rounded-full text-lg", dot: "w-3 h-3"   },
  xl: { box: "w-28 h-28 rounded-full text-3xl", dot: "w-4 h-4" },
};

export default function UserAvatar({ src, name, size = "md", online, ring }: Props) {
  const s = SIZES[size];
  const initial = (name || "؟").charAt(0).toUpperCase();

  return (
    <div className="relative shrink-0 inline-block">
      {src ? (
        <img
          src={src}
          alt={name || ""}
          className={`${s.box} object-cover ${ring ? "ring-2 ring-card" : ""}`}
        />
      ) : (
        <div
          className={`${s.box} bg-primary text-primary-foreground flex items-center justify-center font-bold ${
            ring ? "ring-2 ring-card" : ""
          }`}
        >
          {initial}
        </div>
      )}
      {online && (
        <span
          className={`absolute -bottom-0.5 -left-0.5 ${s.dot} rounded-full bg-success border-2 border-card`}
          aria-label="متصل الآن"
        />
      )}
    </div>
  );
}
