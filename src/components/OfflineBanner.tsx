import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OfflineBannerProps {
  isOnline: boolean;
}

const OfflineBanner = ({ isOnline }: OfflineBannerProps) => {
  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-red-500/90 backdrop-blur-md text-white py-3 px-4 text-center flex items-center justify-center gap-2"
          dir="rtl"
        >
          <WifiOff size={18} />
          <span className="text-sm font-medium">لا يوجد اتصال بالإنترنت. بعض الميزات قد لا تعمل</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineBanner;
