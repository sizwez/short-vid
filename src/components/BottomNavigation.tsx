import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Plus, User, Compass, Bell, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { icon: Home, label: 'Home', path: '/app' },
    { icon: Users, label: 'Friends', path: '/app/friends' },
    { icon: Compass, label: 'Explore', path: '/app/search' },
    { icon: Plus, label: '', path: '/app/upload' },
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
    <div className="fixed bottom-0 left-0 right-0 z-50 h-32 nav-grounding pointer-events-none flex items-end pb-8">
      <div className="relative w-[92%] max-w-lg mx-auto pointer-events-auto">
        <div className="glass rounded-[32px] px-6 py-2 flex items-center justify-between shadow-2xl relative">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);

            if (tab.icon === Plus) {
              return (
                <div key="create-container" className="relative">
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-0 -mt-10 bg-pink-500 rounded-full blur-xl"
                  />
                  <motion.button
                    key="create"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate(tab.path)}
                    className="relative -mt-10 bg-gradient-to-br from-pink-500 to-orange-500 p-4 rounded-full shadow-lg shadow-pink-500/40 border-4 border-black/80 z-10"
                  >
                    <Plus className="w-6 h-6 text-white" />
                  </motion.button>
                </div>
              );
            }

            return (
              <motion.button
                key={tab.path}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center justify-center p-2 relative group"
              >
                <div className={`p-1 transition-all duration-300 ${active ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>
                  <Icon
                    className={`w-6 h-6 transition-all duration-300 ${active ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'group-hover:scale-110'}`}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </div>

                {tab.label && (
                  <span className={`text-[10px] font-bold mt-0.5 tracking-wide transition-all duration-300 ${active ? 'opacity-100 translate-y-0 text-white' : 'opacity-0 translate-y-1 text-gray-500'
                    }`}>
                    {tab.label}
                  </span>
                )}

                {active && (
                  <motion.div
                    layoutId="navIndicator"
                    className="absolute -bottom-1 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default React.memo(BottomNavigation);
