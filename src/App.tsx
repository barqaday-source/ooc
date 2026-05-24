import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { AppSettingsProvider } from "@/hooks/useAppSettings";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect } from "react";
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/navigation-bar';
import { Network } from '@capacitor/network';
import { toast } from "sonner";

import Index from "./pages/Index.tsx";
import Welcome from "./pages/Welcome.tsx";
import AuthPage from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import ChatList from "./pages/ChatList.tsx";
import ChatRoom from "./pages/ChatRoom.tsx";
import PrivateChat from "./pages/PrivateChat.tsx";
import Rooms from "./pages/Rooms.tsx";
import EditRoom from "./pages/EditRoom.tsx";
import RoomMembers from "./pages/RoomMembers.tsx";
import Profile from "./pages/Profile.tsx";
import Friends from "./pages/Friends.tsx";
import UserDashboard from "./pages/UserDashboard.tsx";
import Notifications from "./pages/Notifications.tsx";
import Privacy from "./pages/Privacy.tsx";
import UserProfile from "./pages/UserProfile.tsx";
import Admin from "./pages/Admin.tsx";
import AdminSettings from "./pages/AdminSettings.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60,
      gcTime: 1000 * 60 * 60,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

const AppContent = () => {
  useEffect(() => {
    // 1. تثبيت الشريط العلوي والسفلي
    const setupUI = async () => {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#B6D6FF' });
      await StatusBar.setOverlaysWebView({ overlay: false });
      await NavigationBar.setColor({ color: '#B6D6FF', darkButtons: true });
    };
    setupUI();

    // 2. إشعار النت الحقيقي
    const handler = Network.addListener('networkStatusChange', status => {
      if (!status.connected) {
        toast.error("⚠️ لا يوجد اتصال بالإنترنت", {
          duration: Infinity,
          id: 'no-internet'
        });
      } else {
        toast.dismiss('no-internet');
        toast.success("✅ تم استعادة الاتصال");
      }
    });

    return () => {
      handler.then(h => h.remove());
    };
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/chat" element={<ProtectedRoute><ChatList /></ProtectedRoute>} />
          <Route path="/chat/:roomId" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
          <Route path="/dm/:roomId" element={<ProtectedRoute><PrivateChat /></ProtectedRoute>} />
          <Route path="/rooms" element={<ProtectedRoute><Rooms /></ProtectedRoute>} />
          <Route path="/rooms/:roomId/edit" element={<ProtectedRoute><EditRoom /></ProtectedRoute>} />
          <Route path="/rooms/:roomId/members" element={<ProtectedRoute><RoomMembers /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/u/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AppSettingsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-center" dir="rtl" />
          <AppContent />
        </TooltipProvider>
      </AppSettingsProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
