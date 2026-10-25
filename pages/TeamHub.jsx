import { useState, useEffect, useCallback } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { 
  Building2, 
  Users, 
  Plus, 
  Key, 
  Copy, 
  RefreshCw, 
  LogOut, 
  UserMinus, 
  UserCheck, 
  Clock, 
  Check, 
  X, 
  Send,
  Shield,
  Eye,
  FileText,
  Info,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../components/ui/Modal';

export default function TeamHub() {
  const { activeWorkspaceId, activeWorkspaceRole, workspaces, fetchWorkspaces, setActiveWorkspaceId } = useWorkspaceStore();
  const showToast = useToast();

  const [activeTab, setActiveTab] = useState('members');
  const [createName, setCreateName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [members, setMembers] = useState([]);
  const [pendingPosts, setPendingPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || { name: 'Personal Workspace', id: 'personal', role: 'admin' };
  const isAdmin = activeWorkspaceId !== 'personal' && activeWorkspaceRole === 'admin';

  // Fetch members for active Team Workspace
  const fetchMembers = useCallback(async () => {
    if (activeWorkspaceId === 'personal') return;
    try {
      const res = await api.getMembers(activeWorkspaceId);
      setMembers(res.members || []);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }, [activeWorkspaceId, showToast]);

  // Fetch pending posts
  const fetchPendingPosts = useCallback(async () => {
    try {
      const res = await api.getPosts();
      // Scoped posts returned will be filtered by activeWorkspaceFilter on backend.
      // We filter by pending_approval just in case
      const postsList = Array.isArray(res.posts) ? res.posts : (res.post ? [res.post] : []);
      const pending = postsList.filter(p => p.status === 'pending_approval');
      setPendingPosts(pending);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }, [showToast]);

  useEffect(() => {
    if (activeWorkspaceId !== 'personal') {
      fetchMembers();
      fetchPendingPosts();
    } else {
      setMembers([]);
      setPendingPosts([]);
    }
  }, [activeWorkspaceId, fetchMembers, fetchPendingPosts]);

  // Copy invite code to clipboard
  const handleCopyInvite = () => {
    if (activeWorkspace.inviteCode) {
      navigator.clipboard.writeText(activeWorkspace.inviteCode);
      setIsCopied(true);
      showToast('Invite code copied to clipboard!', 'success');
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Create workspace
  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setLoading(true);
    try {
      const res = await api.createOrg(createName);
      showToast(`Workspace "${res.organization.name}" created!`, 'success');
      setCreateName('');
      await fetchWorkspaces();
      setActiveWorkspaceId(res.organization._id);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Join workspace
  const handleJoinWorkspace = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setLoading(true);
    try {
      const res = await api.joinOrg(inviteCode);
      showToast(`Successfully joined "${res.organization.name}"!`, 'success');
      setInviteCode('');
      await fetchWorkspaces();
      setActiveWorkspaceId(res.organization._id);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Leave workspace
  const handleLeaveWorkspace = async () => {
    if (activeWorkspaceId === 'personal') return;
    try {
      await api.leaveOrg(activeWorkspaceId);
      showToast('Successfully left the workspace.', 'success');
      setActiveWorkspaceId('personal');
      await fetchWorkspaces();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Delete workspace confirmation
  const confirmDeleteWorkspace = async () => {
    if (activeWorkspaceId === 'personal') return;
    try {
      await api.deleteOrg(activeWorkspaceId);
      showToast('Workspace deleted successfully.', 'success');
      setActiveWorkspaceId('personal');
      await fetchWorkspaces();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  // Regenerate Invite Code
  const handleRegenInvite = async () => {
    try {
      const res = await api.regenerateInviteCode(activeWorkspaceId);
      showToast('Invite code regenerated!', 'success');
      await fetchWorkspaces();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Change member role
  const handleRoleChange = async (memberUserId, newRole) => {
    try {
      await api.updateMemberRole(activeWorkspaceId, memberUserId, newRole);
      showToast('Member role updated successfully!', 'success');
      await fetchMembers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Remove member confirmation
  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      await api.removeMember(activeWorkspaceId, memberToRemove.userId);
      showToast('Member removed from workspace.', 'success');
      await fetchMembers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setMemberToRemove(null);
    }
  };

  // Post approval operations
  const handleApprove = async (postId) => {
    try {
      await api.approvePost(postId);
      showToast('Post approved successfully!', 'success');
      fetchPendingPosts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleReject = async (postId) => {
    try {
      await api.rejectPost(postId);
      showToast('Post rejected (returned to drafts).', 'info');
      fetchPendingPosts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Tooltip Popover */}
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-slate-800">Team Hub</h2>
        <div className="relative group">
          <button className="text-slate-400 hover:text-indigo-600 transition-all p-1 rounded-full hover:bg-slate-100 flex items-center justify-center">
            <Info size={16} />
          </button>
          
          {/* Hover Tooltip Popover */}
          <div className="absolute left-0 mt-2 w-80 bg-white p-5 rounded-2xl border border-slate-150 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 space-y-4">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Shield size={16} className="text-indigo-500" />
              <span>Workspace Roles Info</span>
            </h4>
            <div className="space-y-3.5 text-xs text-slate-600">
              <div className="space-y-1">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <span>👑</span> Admin
                </span>
                <p className="text-[11px] leading-relaxed text-slate-400 text-left">
                  Full workspace access. Can connect accounts, configure APIs, manage members, and publish/schedule posts directly.
                </p>
              </div>
              <div className="border-t border-slate-100 pt-3 space-y-1">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <span>✍</span> Editor
                </span>
                <p className="text-[11px] leading-relaxed text-slate-400 text-left">
                  Can draft and schedule posts. Scheduled posts must be approved by an Admin before publishing. Cannot manage accounts or members.
                </p>
              </div>
              <div className="border-t border-slate-100 pt-3 space-y-1">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <span>👁</span> Viewer
                </span>
                <p className="text-[11px] leading-relaxed text-slate-400 text-left">
                  Read-only access. Can view active posts, calendar, and analytics metrics. Cannot create, edit, schedule posts, or connect accounts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher for Team Workspaces */}
      {activeWorkspaceId !== 'personal' && (
        <div className="flex gap-1 sm:gap-2 border-b border-slate-100 pb-px overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-shrink-0 pb-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'members'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Users size={16} />
              <span className="whitespace-nowrap">Workspace Members</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`flex-shrink-0 pb-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'approvals'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Clock size={16} />
              <span className="whitespace-nowrap">Approval Queue</span>
              {pendingPosts.length > 0 && (
                <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {pendingPosts.length}
                </span>
              )}
            </div>
          </button>
        </div>
      )}

      {/* PERSONAL WORKSPACE VIEW */}
      {activeWorkspaceId === 'personal' && (
        <div className="space-y-6">
          <div className="p-8 rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-2xl font-bold">Collaborate in Team Workspaces</h2>
              <p className="text-indigo-100 max-w-xl text-sm">
                You are currently in your Personal Workspace. To coordinate social accounts, draft posts, and access shared brand voices with colleagues, create a new Team Workspace or join an existing one.
              </p>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
              <Building2 size={48} className="text-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create Workspace Form */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Create Workspace</h3>
                  <p className="text-xs text-slate-400">Start a new space for your brand</p>
                </div>
              </div>
              <form onSubmit={handleCreateWorkspace} className="space-y-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Workspace Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp Media"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    disabled={loading}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !createName.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>Create Workspace</span>
                </button>
              </form>
            </div>

            {/* Join Workspace Form */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Key size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Join Workspace</h3>
                  <p className="text-xs text-slate-400">Join a team space with an invite code</p>
                </div>
              </div>
              <form onSubmit={handleJoinWorkspace} className="space-y-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Invite Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="6-character code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    disabled={loading}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 tracking-wider text-center font-mono font-bold"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || inviteCode.trim().length !== 6}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>Join Workspace</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TEAM WORKSPACE MEMBERS VIEW */}
      {activeWorkspaceId !== 'personal' && activeTab === 'members' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workspace Info Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 lg:col-span-1 h-fit">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">{activeWorkspace.name}</h3>
              <p className="text-xs text-slate-400">Workspace Management Hub</p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
              <span className="text-xs font-semibold text-slate-400 block">Workspace Invite Code</span>
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2 font-mono text-base font-bold text-slate-800 tracking-wider">
                <span>{activeWorkspace.inviteCode || '------'}</span>
                <div className="flex gap-1">
                  <button
                    onClick={handleCopyInvite}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded"
                    title="Copy Invite Code"
                  >
                    {isCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                  {activeWorkspaceRole === 'admin' && (
                    <button
                      onClick={handleRegenInvite}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded"
                      title="Regenerate Invite Code"
                    >
                      <RefreshCw size={16} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Share this code with teammates to grant them access to this workspace.
              </p>
            </div>

            <div className="pt-2">
              {isAdmin ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full border border-red-200 hover:bg-red-50 text-red-600 py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Trash2 size={16} />
                  <span>Delete Workspace</span>
                </button>
              ) : (
                <button
                  onClick={handleLeaveWorkspace}
                  className="w-full border border-red-200 hover:bg-red-50 text-red-600 py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <LogOut size={16} />
                  <span>Leave Workspace</span>
                </button>
              )}
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Workspace Members</h3>
              <p className="text-xs text-slate-400">View and manage users associated with this workspace</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-2">Member</th>
                    <th className="py-3 px-2">Email</th>
                    <th className="py-3 px-2">Role</th>
                    {activeWorkspaceRole === 'admin' && <th className="py-3 px-2 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {members.map((m) => {
                    const isSelf = m.userId === localStorage.getItem('scripta_user_id'); // We'll look at the user object
                    return (
                      <tr key={m.userId} className="text-sm hover:bg-slate-50/50">
                        <td className="py-3.5 px-2 font-medium text-slate-800">
                          {m.name || 'Member'}
                        </td>
                        <td className="py-3.5 px-2 text-slate-500">{m.email}</td>
                        <td className="py-3.5 px-2">
                          {activeWorkspaceRole === 'admin' ? (
                            <select
                              value={m.role}
                              onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="admin">Admin</option>
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          ) : (
                            <span className="capitalize text-xs font-semibold px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg inline-block">
                              {m.role}
                            </span>
                          )}
                        </td>
                        {activeWorkspaceRole === 'admin' && (
                          <td className="py-3.5 px-2 text-right">
                            {m.role !== 'admin' && (
                              <button
                                onClick={() => setMemberToRemove(m)}
                                title="Remove member"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                              >
                                <UserMinus size={16} />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TEAM WORKSPACE APPROVALS VIEW */}
      {activeWorkspaceId !== 'personal' && activeTab === 'approvals' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Editorial Approvals Queue</h3>
            <p className="text-xs text-slate-400">
              Posts drafted and scheduled by Editors require Admin approval before being scheduled or published.
            </p>
          </div>

          {pendingPosts.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
                <FileText size={24} />
              </div>
              <p className="text-sm font-medium">No posts currently awaiting approval</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingPosts.map((post) => (
                <div key={post._id} className="border border-slate-100 rounded-xl p-5 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="capitalize bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-md">
                        {post.platform}
                      </span>
                      {post.scheduled_at && (
                        <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                          <Clock size={12} />
                          <span>{new Date(post.scheduled_at).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-4">
                      {post.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100/80 pt-3">
                    <span className="text-[10px] text-slate-400 font-medium">
                      ID: {post._id.slice(0, 8)}...
                    </span>

                    {activeWorkspaceRole === 'admin' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(post._id)}
                          className="bg-white border border-red-200 text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                        >
                          <X size={12} />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleApprove(post._id)}
                          className="bg-green-600 text-white hover:bg-green-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                        >
                          <Check size={12} />
                          <span>Approve</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-amber-500 bg-amber-50 px-2.5 py-1 border border-amber-100 rounded-lg flex items-center gap-1">
                        <Clock size={12} />
                        <span>Awaiting Admin Review</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Remove Member Confirmation Modal */}
      <Modal
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        title="Remove Workspace Member"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to remove <span className="font-semibold text-slate-800">{memberToRemove?.name || 'this member'}</span> from the workspace?
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setMemberToRemove(null)}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-xl transition-all border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmRemoveMember}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all"
            >
              Remove
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Workspace Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Workspace"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this workspace? This action is permanent and will delete all associated data.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-xl transition-all border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteWorkspace}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
