import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Phone, PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff, 
    Camera, Maximize2, Minimize2, RefreshCw, User, Shield 
} from 'lucide-react';
import Peer from 'simple-peer';
import { supabase } from '../lib/supabase';
import { useApp } from '../hooks/useApp';

interface VideoCallProps {
    recipientId: string;
    isIncoming?: boolean;
    initialOffer?: any;
    onClose: () => void;
}

export const VideoCall: React.FC<VideoCallProps> = ({ 
    recipientId, 
    isIncoming = false, 
    initialOffer = null,
    onClose 
}) => {
    const { user } = useApp();
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isSwapped, setIsSwapped] = useState(false);
    const [callStarted, setCallStarted] = useState(false);
    const [cameraMode, setCameraMode] = useState<'user' | 'environment'>('user');

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const peerRef = useRef<Peer.Instance | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const channelRef = useRef<any>(null);

    // ─── WebRTC Handshake ────────────────────────────────────────────────────────

    const initCall = useCallback(async (stream: MediaStream) => {
        const peer = new Peer({
            initiator: !isIncoming,
            trickle: false,
            stream
        });

        peer.on('signal', (data) => {
            channelRef.current?.send({
                type: 'broadcast',
                event: 'signal',
                payload: { 
                    signal: data, 
                    from: user?.id,
                    to: recipientId,
                    type: isIncoming ? 'answer' : 'offer'
                }
            });
        });

        peer.on('stream', (remoteStream) => {
            setRemoteStream(remoteStream);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
            }
        });

        peer.on('close', () => onClose());
        peer.on('error', (err) => {
            console.error('Peer error:', err);
            onClose();
        });

        if (isIncoming && initialOffer) {
            peer.signal(initialOffer);
        }

        peerRef.current = peer;
    }, [isIncoming, initialOffer, recipientId, user?.id, onClose]);

    useEffect(() => {
        const startMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: cameraMode },
                    audio: true
                });
                setLocalStream(stream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
                
                // Set up signaling channel
                const channelId = `call_${[user?.id, recipientId].sort().join('_')}`;
                channelRef.current = supabase.channel(channelId);
                
                channelRef.current
                    .on('broadcast', { event: 'signal' }, ({ payload }: any) => {
                        if (payload.to === user?.id) {
                            peerRef.current?.signal(payload.signal);
                        }
                    })
                    .on('broadcast', { event: 'end' }, () => {
                        onClose();
                    })
                    .subscribe((status: string) => {
                        if (status === 'SUBSCRIBED') {
                            initCall(stream);
                        }
                    });

                setCallStarted(true);

                // Trigger push notification for outgoing call
                if (!isIncoming) {
                    try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session) {
                             await fetch('/api/notifications/call', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${session.access_token}`
                                },
                                body: JSON.stringify({
                                    recipientId,
                                    callerName: user?.username || 'Someone',
                                    callType: 'video'
                                })
                            });
                        }
                    } catch (err) {
                        console.warn('Notification failed:', err);
                    }
                }
            } catch (err) {
                console.error('Media error:', err);
                onClose();
            }
        };

        startMedia();

        return () => {
            localStream?.getTracks().forEach(track => track.stop());
            peerRef.current?.destroy();
            channelRef.current?.unsubscribe();
        };
    }, [cameraMode]); // Re-init on camera flip

    // ─── Handlers ───────────────────────────────────────────────────────────────

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
            setIsVideoOff(!isVideoOff);
        }
    };

    const flipCamera = () => {
        setCameraMode(prev => prev === 'user' ? 'environment' : 'user');
        // useEffect will restart media with the new facingMode
    };

    const endCall = () => {
        channelRef.current?.send({
            type: 'broadcast',
            event: 'end',
            payload: { from: user?.id, to: recipientId }
        });
        onClose();
    };

    // ─── UI Render ──────────────────────────────────────────────────────────────

    return (
        <AnimatePresence>
            <motion.div
                initial={isMinimized ? { scale: 0.1, opacity: 0 } : { opacity: 0 }}
                animate={isMinimized ? { 
                    scale: 1, 
                    opacity: 1,
                    width: '160px',
                    height: '240px',
                    bottom: '100px',
                    right: '20px',
                    borderRadius: '24px',
                    position: 'fixed' as any
                } : { 
                    opacity: 1,
                    width: '100vw',
                    height: '100vh',
                    top: 0,
                    left: 0,
                    borderRadius: 0,
                    position: 'fixed' as any
                }}
                className={`z-[1000] overflow-hidden glass shadow-2xl transition-all duration-500 font-['Outfit']`}
                style={{ backgroundColor: '#050505' }}
            >
                {/* Main View (Remote or Local Swapped) */}
                <div className="absolute inset-0 bg-black">
                    <video
                        ref={isSwapped ? localVideoRef : remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                    {!remoteStream && !isIncoming && !isSwapped && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                            <div className="w-24 h-24 rounded-full glass flex items-center justify-center animate-pulse">
                                <User className="w-12 h-12 text-white/20" />
                            </div>
                            <p className="text-white/60 font-medium tracking-wide">Connecting to Secure Server...</p>
                        </div>
                    )}
                </div>

                {/* Picture-in-Picture (Local or Remote Swapped) */}
                <motion.div
                    drag={isMinimized}
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    onClick={() => setIsSwapped(!isSwapped)}
                    className={`absolute rounded-2xl overflow-hidden glass-light border-white/10 shadow-xl cursor-pointer hover:border-orange-500/50 transition-colors ${
                        isMinimized ? 'hidden' : 'top-10 right-6 w-32 h-44 z-20'
                    }`}
                >
                    <video
                        ref={isSwapped ? remoteVideoRef : localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 right-2 p-1 glass-light rounded-md">
                        <RefreshCw className="w-3 h-3 text-white/60" />
                    </div>
                </motion.div>

                {/* Call Controls */}
                {!isMinimized && (
                    <div className="absolute inset-x-0 bottom-12 z-30 flex flex-col items-center space-y-8 px-6">
                        <div className="flex items-center space-x-2 glass-light px-4 py-2 rounded-full border-white/5">
                            <Shield className="w-4 h-4 text-green-500" />
                            <span className="text-xs font-bold text-white/60 uppercase tracking-widest">End-to-End Encrypted</span>
                        </div>

                        <div className="flex items-center space-x-6">
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={toggleMute}
                                className={`p-5 rounded-full transition-all duration-300 ${isMuted ? 'bg-red-500 text-white' : 'glass-light text-white hover:bg-white/10'}`}
                            >
                                {isMuted ? <MicOff /> : <Mic />}
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.8 }}
                                onClick={endCall}
                                className="p-7 bg-red-600 text-white rounded-full shadow-2xl shadow-red-600/30 active:bg-red-700 transition-all border-4 border-black"
                            >
                                <PhoneOff className="w-8 h-8" />
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={toggleVideo}
                                className={`p-5 rounded-full transition-all duration-300 ${isVideoOff ? 'bg-red-500 text-white' : 'glass-light text-white hover:bg-white/10'}`}
                            >
                                {isVideoOff ? <VideoOff /> : <VideoIcon />}
                            </motion.button>
                        </div>

                        <div className="flex items-center space-x-4 w-full justify-center">
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={flipCamera}
                                className="p-4 glass-light text-white rounded-2xl flex-1 max-w-[100px] flex flex-col items-center space-y-1"
                            >
                                <Camera className="w-5 h-5 opacity-60" />
                                <span className="text-[10px] font-bold uppercase tracking-tighter opacity-40">Flip</span>
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setIsMinimized(true)}
                                className="p-4 glass-light text-white rounded-2xl flex-1 max-w-[100px] flex flex-col items-center space-y-1"
                            >
                                <Minimize2 className="w-5 h-5 opacity-60" />
                                <span className="text-[10px] font-bold uppercase tracking-tighter opacity-40">Minimize</span>
                            </motion.button>
                        </div>
                    </div>
                )}

                {/* Minimized Overlay Controls */}
                {isMinimized && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center group bg-black/40">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsMinimized(false)}
                            className="p-3 glass rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Maximize2 className="w-6 h-6" />
                        </motion.button>
                        <div className="absolute bottom-2 flex space-x-2">
                             <button onClick={endCall} className="p-2 bg-red-500/80 rounded-full text-white"><PhoneOff className="w-4 h-4" /></button>
                        </div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

export default VideoCall;
