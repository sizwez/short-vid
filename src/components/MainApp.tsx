import React, { Suspense, useState, useEffect, lazy } from 'react';
import { useLocation, Routes, Route, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNavigation from './BottomNavigation';
import ErrorBoundary from './ErrorBoundary';
import NetworkStatusBanner from './NetworkStatusBanner';
import VideoCall from './VideoCall';
import { supabase } from '../lib/supabase';
import { useApp } from '../hooks/useApp';
import { initializeFCMForUser } from '../lib/fcmService';
import { UploadProvider, useUpload } from '../context/UploadContext';

// Lazy loaded components for code splitting
const HomeFeed = lazy(() => import('./HomeFeed'));
const UploadFlow = lazy(() => import('./UploadFlow'));
// ... (rest of lazy imports)

const RouteFallback = () => (
// ... (omitted)
);

const CameraRecorderWrapper: React.FC = () => {
  const navigate = useNavigate();
  const { updateVideoData } = useUpload();

  const handleVideoRecorded = (file: File, previewUrl: string) => {
    updateVideoData({ file, previewUrl });
    navigate('/app/upload');
  };

  const handleClose = () => {
    navigate('/app');
  };

  return <CameraRecorder onVideoRecorded={handleVideoRecorded} onClose={handleClose} />;
};

const MainAppContent: React.FC = () => {
  const { user } = useApp();
  const location = useLocation();
  const [activeCall, setActiveCall] = useState<{
    recipientId: string;
    isIncoming: boolean;
    initialOffer?: any;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    initializeFCMForUser(user.id).catch(console.error);
    const channel = supabase.channel(`user_inbox:${user.id}`);
    channel
      .on('broadcast', { event: 'signal' }, ({ payload }: any) => {
        if (payload.to === user.id && payload.type === 'offer') {
          setActiveCall({
            recipientId: payload.from,
            isIncoming: true,
            initialOffer: payload.signal
          });
        }
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user]);

  const startCall = (recipientId: string) => {
    setActiveCall({ recipientId, isIncoming: false });
  };

  const routeSegments = location.pathname.replace('/app', '').split('/').filter(Boolean);
  const animationKey = routeSegments[0] || 'home';

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <NetworkStatusBanner />

      <main className="relative z-10 w-full min-h-screen">
        <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <AnimatePresence mode="wait">
              <motion.div
                key={animationKey}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="w-full min-h-screen"
              >
                <Routes location={location}>
                  <Route path="/" element={<HomeFeed onCallUser={startCall} />} />
                  <Route path="/video/:id" element={<VideoPlayer />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/upload/*" element={<UploadFlow />} />
                  <Route path="/profile/*" element={<Profile />} />
                  <Route path="/challenges/*" element={<Challenges />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/messages/*" element={<Messages onCallUser={startCall} />} />
                  <Route path="/settings/*" element={<Settings />} />
                  <Route path="/payment/*" element={<PaymentFlow />} />
                  <Route path="/creator-dashboard/*" element={<CreatorDashboard />} />
                  <Route path="/camera" element={<CameraRecorderWrapper />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </ErrorBoundary>

        {activeCall && (
          <VideoCall
            recipientId={activeCall.recipientId}
            isIncoming={activeCall.isIncoming}
            initialOffer={activeCall.initialOffer}
            onClose={() => setActiveCall(null)}
          />
        )}
      </main>

      <BottomNavigation />
    </div>
  );
};

const MainApp: React.FC = () => {
  return (
    <UploadProvider>
      <MainAppContent />
    </UploadProvider>
  );
};

export default MainApp;
