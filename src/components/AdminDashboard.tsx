import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Flag, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  AlertTriangle, 
  BarChart3, 
  Users, 
  Video,
  ExternalLink,
  ChevronDown,
  Search,
  Filter
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './ToastContainer';
import PremiumBackground from './PremiumBackground';

interface Report {
  id: string;
  reporter_id: string;
  video_id: string;
  reason: string;
  details: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
  video?: {
    title: string;
    thumbnail_url: string;
    user_id: string;
  };
}

const AdminDashboard: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved'>('all');
  const { showToast } = useToast();

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('reports')
        .select(`
          *,
          video:videos(title, thumbnail_url, user_id)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports(data || []);
    } catch (err: any) {
      showToast('error', 'Failed to fetch reports: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (reportId: string, status: 'reviewed' | 'resolved', videoId?: string, deleteVideo = false) => {
    try {
      // 1. Update report status
      const { error: reportError } = await supabase
        .from('reports')
        .update({ status })
        .eq('id', reportId);

      if (reportError) throw reportError;

      // 2. delete video if requested
      if (deleteVideo && videoId) {
        const { error: videoError } = await supabase
          .from('videos')
          .delete()
          .eq('id', videoId);
        
        if (videoError) throw videoError;
        showToast('success', 'Video removed and report resolved');
      } else {
        showToast('success', `Report marked as ${status}`);
      }

      fetchReports();
    } catch (err: any) {
      showToast('error', 'Action failed: ' + err.message);
    }
  };

  return (
    <PremiumBackground>
      <div className="min-h-screen text-white p-6 pb-24">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center border border-orange-500/30">
                  <Shield className="w-6 h-6 text-orange-500" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
              </div>
              <p className="text-gray-400">Manage community reports and platform safety</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex">
                {(['all', 'pending', 'reviewed', 'resolved'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filter === f ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
              <div className="flex items-center gap-3 text-orange-500 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-widest">Active Reports</span>
              </div>
              <div className="text-4xl font-bold">{reports.filter(r => r.status === 'pending').length}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
              <div className="flex items-center gap-3 text-blue-500 mb-2">
                <Video className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-widest">Flagged Content</span>
              </div>
              <div className="text-4xl font-bold">{reports.length}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
              <div className="flex items-center gap-3 text-green-500 mb-2">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-widest">Resolved Today</span>
              </div>
              <div className="text-4xl font-bold">{reports.filter(r => r.status === 'resolved').length}</div>
            </div>
          </div>

          {/* Reports List */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-white/10 bg-white/5">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Flag className="w-5 h-5 text-orange-500" />
                Content Moderation Queue
              </h2>
            </div>

            <div className="divide-y divide-white/5">
              {isLoading ? (
                <div className="p-20 flex flex-col items-center justify-center">
                  <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                  <p className="text-gray-400">Loading reports...</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="p-20 text-center">
                  <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">All Clear!</h3>
                  <p className="text-gray-400">There are no reports requiring your attention right now.</p>
                </div>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="p-6 hover:bg-white/5 transition-colors group">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Video Preview */}
                      <div className="w-full md:w-32 h-48 md:h-40 bg-gray-800 rounded-xl overflow-hidden flex-shrink-0 relative">
                        {report.video?.thumbnail_url ? (
                          <img src={report.video.thumbnail_url} alt="Thumbnail" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="w-8 h-8 text-gray-600" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] uppercase font-bold text-orange-500 border border-orange-500/30">
                          {report.status}
                        </div>
                      </div>

                      {/* Report Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold mb-1">{report.video?.title || 'Unknown Video'}</h3>
                            <p className="text-sm text-gray-400 mb-2">Reported on {new Date(report.created_at).toLocaleDateString()}</p>
                            <div className="inline-block bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                              Reason: {report.reason}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                             <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all">
                               <ExternalLink className="w-5 h-5 text-gray-400" />
                             </button>
                          </div>
                        </div>

                        <div className="bg-black/20 p-4 rounded-xl mb-6 italic text-gray-300 text-sm border border-white/5">
                          "{report.details || 'No additional details provided.'}"
                        </div>

                        <div className="flex flex-wrap gap-3">
                          {report.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => handleAction(report.id, 'reviewed')}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                              >
                                <XCircle className="w-4 h-4" /> Dismiss Report
                              </button>
                              <button 
                                onClick={() => handleAction(report.id, 'resolved', report.video_id, true)}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-500/20"
                              >
                                <Trash2 className="w-4 h-4" /> Remove Video
                              </button>
                            </>
                          )}
                          {report.status !== 'resolved' && (
                            <button 
                              onClick={() => handleAction(report.id, 'resolved')}
                              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                            >
                              <CheckCircle className="w-4 h-4" /> Mark Resolved
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </PremiumBackground>
  );
};

const Loader2 = ({ className, ...props }: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default AdminDashboard;
