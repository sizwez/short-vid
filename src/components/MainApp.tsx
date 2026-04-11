import { useLocation, Routes, Route, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNavigation from './BottomNavigation';
import ErrorBoundary from './ErrorBoundary';
import NetworkStatusBanner from './NetworkStatusBanner';
import VideoCall from './VideoCall';
import { supabase } from '../lib/supabase';
import { useApp } from '../hooks/useApp';
import { initializeFCMForUser } from '../lib/fcmService';

// Lazy loaded components for code splitting
const HomeFeed = React.lazy(() => import('./HomeFeed'));
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
  const { user } = useApp();
  const location = useLocation();
  const [activeCall, setActiveCall] = React.useState<{
    recipientId: string;
    isIncoming: boolean;
    initialOffer?: any;
  } | null>(null);

  React.useEffect(() => {
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

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <NetworkStatusBanner />
      
      <main className="relative z-10 w-full min-h-screen">
        <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
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

export default MainApp;
