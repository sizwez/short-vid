import React from 'react';
import { motion } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useApp } from '../hooks/useApp';

const NetworkStatusBanner: React.FC = () => {
  const { isOnline, pendingActions } = useApp();

  if (isOnline) return null;

  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -50, opacity: 0 }}
      className="fixed top-0 left-0 right-0 z-[60] bg-yellow-600 text-white py-2 px-4 flex items-center justify-center gap-2"
    >
      <WifiOff className="w-4 h-4" />
      <span className="text-sm font-medium">You're offline. Changes will sync when back online.</span>
      {pendingActions.length > 0 && (
        <span className="bg-yellow-800 px-2 py-0.5 rounded-full text-xs">
          {pendingActions.length} pending
        </span>
      )}
      <button 
        onClick={() => window.location.reload()}
        className="ml-2 p-1 hover:bg-yellow-800 rounded"
      >
        <RefreshCw className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

export default NetworkStatusBanner;