import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';
import HomeFeed from './HomeFeed';
import UploadFlow from './UploadFlow';
import Profile from './Profile';
import Challenges from './Challenges';
import Notifications from './Notifications';
import Settings from './Settings';
import PaymentFlow from './PaymentFlow';
import CreatorDashboard from './CreatorDashboard';

const MainApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="pb-20">
        <Routes>
          <Route path="/" element={<HomeFeed />} />
          <Route path="/upload/*" element={<UploadFlow />} />
          <Route path="/profile/*" element={<Profile />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings/*" element={<Settings />} />
          <Route path="/payment/*" element={<PaymentFlow />} />
          <Route path="/creator-dashboard" element={<CreatorDashboard />} />
        </Routes>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default MainApp;
