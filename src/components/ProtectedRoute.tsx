// ====================================================================
// ProtectedRoute - حماية صارمة:
// - يجب أن يكون مسجل دخول
// - requireAdmin: يجب أن يكون له دور 'admin' في user_roles
// - requireAdmin يحجب الدخول كلياً ولا يظهر شيء للمستخدم العادي
// ====================================================================

import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ShieldAlert } from "lucide-react";

interface Props {
  children: ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: Props) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;

  if (requireAdmin && !isAdmin) {
    // لا نعرض المسار، ولا حتى رسالة تكشف وجوده
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <ShieldAlert className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">الصفحة غير متاحة</p>
        <Navigate to="/chat" replace />
      </div>
    );
  }

  return <>{children}</>;
}
