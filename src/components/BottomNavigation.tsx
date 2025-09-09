import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Plus, User, Hash, Bell } from 'lucide-react';
import { motion } from 'framer-motion';

const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { icon: Home, label: 'Home', path: '/app' },
    { icon: Hash, label: 'Challenges', path: '/app/challenges' },
    { icon: Plus, label: 'Upload', path: '/app/upload' },
    { icon: Bell, label: 'Notifications', path: '/app/notifications' },
    { icon: User, label: 'Profile', path: '/app/profile' }
  ];

  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app' || location.pathname === '/app/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-lg border-t border-gray-800 z-50">
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);
          
          return (
            <motion.button
              key={tab.path}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-colors ${
                active ? 'text-orange-500' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label === 'Upload' ? (
                <div className={`p-3 rounded-full ${active ? 'bg-orange-500' : 'bg-gray-800'}`}>
                  <Icon className={`w-6 h-6 ${active ? 'text-white' : 'text-gray-400'}`} />
                </div>
              ) : (
                <Icon className="w-6 h-6" />
              )}
              <span className="text-xs mt-1 font-medium">{tab.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;
