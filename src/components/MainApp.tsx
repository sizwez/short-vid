import React, { Suspense } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';
import HomeFeed from './HomeFeed';
import ErrorBoundary from './ErrorBoundary';
import NetworkStatusBanner from './NetworkStatusBanner';

// Lazy loaded components for code splitting
const UploadFlow = React.lazy(() => import('./UploadFlow'));
const Profile = React.lazy(() => import('./Profile'));
const Challenges = React.lazy(() => import('./Challenges'));
const Notifications = React.lazy(() => import('./Notifications'));
const Settings = React.lazy(() => import('./Settings'));
const PaymentFlow = React.lazy(() => import('./PaymentFlow'));
const CreatorDashboard = React.lazy(() => import('./CreatorDashboard'));
const Search = React.lazy(() => import('./Search'));
const Messages = React.lazy(() => import('./Messages'));
const VideoPlayer = React.lazy(() => import('./VideoPlayer'));
const CameraRecorder = React.lazy(() => import('./CameraRecorder'));

// Reusable Suspense fallback UI for lazy routes wrapper
const RouteFallback = () => (
  <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
    <div className="w-10 h-10 rounded-full border-4 border-orange-500 border-t-transparent animate-spin opacity-50" />
  </div>
);

const CameraRecorderWrapper: React.FC = () => {
  const navigate = useNavigate();
  
  const handleVideoRecorded = (file: File, previewUrl: string) => {
    navigate('/app/upload', { state: { file, previewUrl } });
  };
  
  const handleClose = () => {
    navigate('/app');
  };
  
  return <CameraRecorder onVideoRecorded={handleVideoRecorded} onClose={handleClose} />;
};

const MainApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <NetworkStatusBanner />
      <div className="pb-20 pt-10">
        <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomeFeed />} />
              <Route path="/video/:id" element={<VideoPlayer />} />
              <Route path="/search" element={<Search />} />
              <Route path="/upload/*" element={<UploadFlow />} />
              <Route path="/profile/*" element={<Profile />} />
              <Route path="/challenges" element={<Challenges />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/messages/*" element={<Messages />} />
              <Route path="/settings/*" element={<Settings />} />
              <Route path="/payment/*" element={<PaymentFlow />} />
              <Route path="/creator-dashboard" element={<CreatorDashboard />} />
              <Route path="/camera" element={<CameraRecorderWrapper />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default MainApp;
