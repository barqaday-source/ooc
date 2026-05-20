// ====================================================================
// AdminBadge - شارة تمييز الأدمن (تظهر بجانب اسم المستخدم)
// ====================================================================

import { Shield } from "lucide-react";

export default function AdminBadge({ size = "xs" }: { size?: "xs" | "sm" }) {
  const cls = size === "xs"
    ? "text-[8px] px-1 py-[1px] gap-0.5"
    : "text-[10px] px-1.5 py-0.5 gap-1";
  const icon = size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3";
  return (
    <span className={`inline-flex items-center bg-foreground text-background rounded-md font-bold ${cls}`}>
      <Shield className={icon} />
      ADMIN
    </span>
  );
}
