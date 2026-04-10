import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Plus, User, Compass, Bell } from 'lucide-react';
import { motion } from 'framer-motion';

const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { icon: Home, label: 'Home', path: '/app' },
    { icon: Compass, label: 'Discover', path: '/app/search' },
    { icon: Plus, label: 'Create', path: '/app/upload' },
    { icon: Bell, label: 'Inbox', path: '/app/notifications' },
    { icon: User, label: 'Profile', path: '/app/profile' }
  ];

  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app' || location.pathname === '/app/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/5 z-50">
      <div className="flex items-center justify-around py-2 px-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);

          return (
            <motion.button
              key={tab.path}
              whileTap={{ scale: 0.92 }}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center py-2 px-2 rounded-2xl transition-all duration-300 ${
                active 
                  ? 'text-white' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label === 'Create' ? (
                <div className={`relative p-3 rounded-full transition-all duration-300 ${
                  active 
                    ? 'bg-gradient-to-br from-pink-500 to-purple-600 shadow-lg shadow-purple-500/25' 
                    : 'bg-gray-800'
                }`}>
                  <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} />
                </div>
              ) : (
                <motion.div
                  animate={{ scale: active ? 1.1 : 1 }}
                  className="p-1"
                >
                  <Icon className={`w-6 h-6 transition-all duration-300 ${
                    active ? 'drop-shadow-lg' : ''
                  }`} />
                </motion.div>
              )}
              <span className={`text-[11px] mt-1 font-medium transition-colors duration-300 ${
                active ? 'text-white' : 'text-gray-500'
              }`}>
                {tab.label}
              </span>
              {active && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute -bottom-1 w-1 h-1 bg-white rounded-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(BottomNavigation);
