import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Trash2, Edit2, Calendar, RefreshCw } from 'lucide-react';
import { getDrafts, deleteDraft } from './compose/composeApi';
import { useNavigate } from 'react-router-dom';
import ConfirmButton from '../components/ConfirmButton';
import { useToast } from '../components/Toast';
import { useWorkspaceStore } from '../store/workspaceStore';

export default function Drafts() {
  const { activeWorkspaceRole } = useWorkspaceStore();

  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const showToast = useToast();
  const navigate = useNavigate();

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDrafts();
      setDrafts(res.posts || []);
    } catch (err) {
      showToast('Failed to load drafts', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const handleDelete = async (id) => {
    try {
      await deleteDraft(id);
      showToast('Draft deleted', 'success');
      fetchDrafts();
    } catch (err) {
      showToast('Failed to delete draft', 'error');
    }
  };

  const handleEdit = (draft) => {
    sessionStorage.setItem('scripta_draft_recovery', JSON.stringify(draft));
    navigate('/compose', { state: { draftId: draft._id } });
  };

  const handleClearAll = async () => {
    if (drafts.length === 0) return;
    try {
      setLoading(true);
      await Promise.all(drafts.map(draft => deleteDraft(draft._id)));
      showToast(`Cleared all drafts`, 'success');
      fetchDrafts();
    } catch (err) {
      showToast('Failed to clear some drafts', 'error');
      fetchDrafts();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Drafts
          </h2>
          <p className="text-slate-500 text-sm">Manage your unfinished posts</p>
        </div>
        
        <div className="flex items-center gap-2">
          {drafts.length > 0 && activeWorkspaceRole !== 'viewer' && (
            <ConfirmButton
              onConfirm={handleClearAll}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 font-bold text-xs shadow-sm transition-all cursor-pointer"
              confirmClassName="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 border border-rose-600 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              confirmLabel="Delete all drafts?"
            >
              <Trash2 size={14} />
              <span>Clear All</span>
            </ConfirmButton>
          )}
          <button
            onClick={fetchDrafts}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative min-h-[400px]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 backdrop-blur-sm z-10 rounded-2xl border border-slate-100">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
              <span className="text-slate-500 font-medium animate-pulse">Loading drafts...</span>
            </div>
          </div>
        ) : drafts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center h-[400px]">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <FileText size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No drafts found</h3>
            <p className="text-slate-500 max-w-sm mb-6">
              You don't have any saved drafts. Start composing a new post to see it here.
            </p>
            {activeWorkspaceRole !== 'viewer' && (
              <button
                onClick={() => navigate('/compose')}
                className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
              >
                Compose a Post
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {drafts.map((draft) => (
                <motion.div
                  key={draft._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg transition-all flex flex-col relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex-1 mb-4">
                    <p className="text-slate-700 line-clamp-4 text-sm leading-relaxed whitespace-pre-wrap">
                      {draft.content || <span className="text-slate-400 italic">No content</span>}
                    </p>
                  </div>

                  {draft.media_path && (
                    <div className="mb-4 aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative">
                      {draft.media_type?.startsWith('video') ? (
                        <video src={draft.media_path} className="w-full h-full object-cover" />
                      ) : (
                        <img src={draft.media_path} alt="Draft media" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                    </div>
                  )}

                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar size={12} />
                        <span>Last edited {new Date(draft.updated_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {draft.platforms?.map(p => (
                          <span key={p} className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {activeWorkspaceRole !== 'viewer' ? (
                        <>
                          <button
                            onClick={() => handleEdit(draft)}
                            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Edit Draft"
                          >
                            <Edit2 size={16} />
                          </button>
                          <ConfirmButton
                            onConfirm={() => handleDelete(draft._id)}
                            title="Delete Draft"
                            description="Are you sure you want to delete this draft?"
                            confirmText="Delete"
                            variant="danger"
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </ConfirmButton>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 italic font-semibold px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg">
                          Read-Only
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
