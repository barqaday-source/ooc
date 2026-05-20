// ====================================================================
// ThemeToggle - زر التبديل بين الوضع الليلي والنهاري (Glass Thick)
// ====================================================================

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  if (compact) {
    return (
      <button
        onClick={toggle}
        aria-label={isDark ? "وضع نهاري" : "وضع ليلي"}
        className="w-11 h-11 rounded-full glass-thick border border-white/40 flex items-center justify-center active:scale-90 transition shadow-glassy"
      >
        {isDark ? (
          <Sun className="w-[20px] h-[20px] text-yellow-300" strokeWidth={1.8} />
        ) : (
          <Moon className="w-[20px] h-[20px] text-foreground/85" strokeWidth={1.8} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="w-full flex items-center gap-3 p-4 rounded-full glass-thick border border-white/40 hover:bg-background/40 transition text-right shadow-glassy"
    >
      <span className="w-10 h-10 rounded-full glass flex items-center justify-center border border-white/40">
        {isDark ? (
          <Sun className="w-5 h-5 text-yellow-300" strokeWidth={1.8} />
        ) : (
          <Moon className="w-5 h-5 text-foreground/85" strokeWidth={1.8} />
        )}
      </span>
      <span className="font-bold">{isDark ? "الوضع النهاري" : "الوضع الليلي"}</span>
    </button>
  );
}
