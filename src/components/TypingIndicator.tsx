// ====================================================================
// TypingIndicator - مؤشر "يكتب الآن..." مع نقاط متحركة
// ====================================================================

interface Props {
  names: string[];
}

export default function TypingIndicator({ names }: Props) {
  if (names.length === 0) return null;
  const text =
    names.length === 1
      ? `${names[0]} يكتب الآن`
      : names.length === 2
        ? `${names[0]} و ${names[1]} يكتبان`
        : `${names.length} أشخاص يكتبون`;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground anim-fade-in">
      <span className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
      </span>
      <span>{text}...</span>
    </div>
  );
}
