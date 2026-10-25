import { useEffect, useState } from 'react';
import { Plus, Users, Trash2, Loader2, AlertCircle, X, Check, UserCog, Save, Power, PowerOff, ShieldCheck } from 'lucide-react';
import { listBusinesses, listUserProfiles, createUser, updateUser, deleteUserProfile } from '@/lib/data';
import { useAuth } from '@/auth/AuthContext';
import { roleTitle, isSuperAdmin } from '@/lib/roles';
import { passwordStrength } from '@/lib/password';
import { PasswordField } from '@/components/PasswordField';
import type { Business, UserProfile } from '@/lib/types';

export function AdminUsers() {
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const superAdmin = profile ? isSuperAdmin(profile) : false;
  const myBusinessId = profile?.business_id ?? null;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, bizList] = await Promise.all([listUserProfiles(), listBusinesses()]);
      const scopedProfiles = superAdmin ? list : list.filter((p) => p.business_id === myBusinessId);
      const scopedBiz = superAdmin ? bizList : bizList.filter((b) => b.id === myBusinessId);
      setProfiles(scopedProfiles);
      setBusinesses(scopedBiz);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [superAdmin, myBusinessId]);

  const bizName = (id: string | null) => businesses.find((b) => b.id === id)?.name ?? '—';

  const handleCreate = async (params: { user_id: string; password: string; full_name: string; business_id: string; role: 'admin' | 'member' }) => {
    setBusy(true);
    setError(null);
    try {
      await createUser(params);
      setCreating(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async (params: { user_id: string; full_name?: string; business_id?: string; role?: 'admin' | 'member'; disabled?: boolean; password?: string }) => {
    setBusy(true);
    setError(null);
    try {
      await updateUser(params);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleDisabled = async (p: UserProfile) => {
    setBusy(true);
    setError(null);
    try {
      await updateUser({ user_id: p.id, disabled: !p.disabled });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    try {
      await deleteUserProfile(id);
      setConfirmDelete(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const canEdit = (p: UserProfile) => superAdmin || !(p.role === 'admin' && !p.business_id);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500 mt-1">
            {superAdmin ? 'Create and manage user accounts across all businesses' : 'Manage users in your business'}
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800"
        >
          <Plus size={18} /> Add User
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-sm text-slate-500 py-16 text-center border border-dashed border-slate-200 rounded-lg">
          No users yet.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Name</th>
                <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">User ID</th>
                {superAdmin && <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Business</th>}
                <th className="text-left px-4 py-2.5 font-medium">Role</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-right px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map((p) => {
                const title = roleTitle(p);
                const editable = canEdit(p);
                return (
                  <tr key={p.id} className={`hover:bg-slate-50 ${p.disabled ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                          {p.role === 'admin' ? <UserCog size={16} className="text-slate-700" /> : <Users size={16} className="text-slate-500" />}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{p.full_name || 'Unnamed'}</div>
                          <div className="text-xs text-slate-400 font-mono">{p.login_id || p.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell font-mono text-xs text-slate-600">{p.login_id || '—'}</td>
                    {superAdmin && <td className="px-4 py-2.5 hidden sm:table-cell">{bizName(p.business_id)}</td>}
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${
                        title === 'Super Admin' ? 'text-violet-700 bg-violet-100'
                        : title === 'Business Admin' ? 'text-blue-700 bg-blue-100'
                        : 'text-slate-600 bg-slate-100'
                      }`}>
                        {title === 'Super Admin' && <ShieldCheck size={10} />}
                        {title}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                        p.disabled ? 'text-red-700 bg-red-100' : 'text-emerald-700 bg-emerald-100'
                      }`}>{p.disabled ? 'Disabled' : 'Active'}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => setEditing(p)}
                          disabled={!editable}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
                          title={editable ? 'Edit' : 'Only a Super Admin can edit this user'}
                        >
                          <Save size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleDisabled(p)}
                          disabled={busy || !editable}
                          className={`p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed ${p.disabled ? 'text-emerald-600 hover:text-emerald-700' : 'text-amber-600 hover:text-amber-700'}`}
                          title={editable ? (p.disabled ? 'Enable' : 'Disable') : 'Only a Super Admin can change this user'}
                        >
                          {p.disabled ? <Power size={14} /> : <PowerOff size={14} />}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(p.id)}
                          disabled={!editable}
                          className="p-1.5 rounded hover:bg-red-100 text-slate-600 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          title={editable ? 'Remove' : 'Only a Super Admin can remove this user'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <CreateUserModal businesses={businesses} busy={busy} superAdmin={superAdmin} defaultBusinessId={myBusinessId} onClose={() => setCreating(false)} onCreate={handleCreate} />
      )}

      {editing && (
        <EditUserModal
          user={editing}
          businesses={businesses}
          busy={busy}
          superAdmin={superAdmin}
          onClose={() => setEditing(null)}
          onSave={handleUpdate}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-lg p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-900">Remove this user?</h3>
            <p className="text-sm text-slate-500 mt-1">This removes the user profile. They will no longer be able to sign in.</p>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setConfirmDelete(null)} className="px-3 py-2 text-sm rounded-lg border border-slate-300 hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={busy} className="px-3 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700">
                {busy ? <Loader2 size={14} className="animate-spin" /> : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm text-slate-900 bg-white';

function CreateUserModal({
  businesses,
  busy,
  superAdmin,
  defaultBusinessId,
  onClose,
  onCreate,
}: {
  businesses: Business[];
  busy: boolean;
  superAdmin: boolean;
  defaultBusinessId: string | null;
  onClose: () => void;
  onCreate: (params: { user_id: string; password: string; full_name: string; business_id: string; role: 'admin' | 'member' }) => void;
}) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessId, setBusinessId] = useState(defaultBusinessId ?? businesses[0]?.id ?? '');
  const [role, setRole] = useState<'admin' | 'member'>('member');

  const roleOptions: { value: 'admin' | 'member'; label: string }[] = superAdmin
    ? [
        { value: 'member', label: 'User (sees only their business)' },
        { value: 'admin', label: 'Business Admin (manages own business and users)' },
      ]
    : [{ value: 'member', label: 'User (sees only their business)' }];

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Create New User</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">User ID *</label>
            <input type="text" value={userId} onChange={(e) => setUserId(e.target.value)} className={inputCls} placeholder="Enter a user ID" />
          </div>
          <PasswordField value={password} onChange={setPassword} label="Password" required placeholder="Set a password" autoComplete="new-password" />
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Business *</label>
            <select value={businessId} onChange={(e) => setBusinessId(e.target.value)} className={inputCls} disabled={!superAdmin}>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'member')} className={inputCls}>
              {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-2 text-sm rounded-lg border border-slate-300 hover:bg-slate-50">Cancel</button>
          <button
            onClick={() => onCreate({ user_id: userId.trim(), password, full_name: fullName.trim(), business_id: businessId, role })}
            disabled={busy || !userId.trim() || !passwordStrength(password).valid || !businessId}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Create User
          </button>
        </div>
      </div>
    </div>
  );
}

function EditUserModal({
  user,
  businesses,
  busy,
  superAdmin,
  onClose,
  onSave,
}: {
  user: UserProfile;
  businesses: Business[];
  busy: boolean;
  superAdmin: boolean;
  onClose: () => void;
  onSave: (params: { user_id: string; full_name?: string; business_id?: string; role?: 'admin' | 'member'; disabled?: boolean; password?: string }) => void;
}) {
  const [fullName, setFullName] = useState(user.full_name);
  const [businessId, setBusinessId] = useState(user.business_id ?? businesses[0]?.id ?? '');
  const [role, setRole] = useState<'admin' | 'member'>(user.role);
  const [disabled, setDisabled] = useState(user.disabled);
  const [password, setPassword] = useState('');

  const targetIsSuperAdmin = user.role === 'admin' && !user.business_id;
  const roleOptions: { value: 'admin' | 'member'; label: string }[] = superAdmin
    ? [
        { value: 'member', label: 'User (sees only their business)' },
        { value: 'admin', label: 'Business Admin (manages own business and users)' },
      ]
    : [{ value: 'member', label: 'User (sees only their business)' }];

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Edit User</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Current User ID</label>
            <input type="text" value={user.login_id ?? ''} readOnly className={`${inputCls} bg-slate-50 text-slate-500 font-mono`} placeholder="No login ID set" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Business</label>
            <select value={businessId} onChange={(e) => setBusinessId(e.target.value)} className={inputCls} disabled={!superAdmin}>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'member')} className={inputCls} disabled={!superAdmin || targetIsSuperAdmin}>
              {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {targetIsSuperAdmin && <p className="text-xs text-slate-400 mt-1">Super Admin role cannot be changed.</p>}
          </div>
          <div>
            <label className="flex items-center gap-2 h-9">
              <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900" disabled={targetIsSuperAdmin} />
              <span className="text-sm text-slate-700">Disabled (user cannot sign in)</span>
            </label>
          </div>
          <PasswordField value={password} onChange={setPassword} label="New password (leave blank to keep current)" placeholder="Enter new password to reset" autoComplete="new-password" />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-2 text-sm rounded-lg border border-slate-300 hover:bg-slate-50">Cancel</button>
          <button
            onClick={() => onSave({
              user_id: user.id,
              full_name: fullName.trim(),
              business_id: businessId,
              role,
              disabled,
              ...(password ? { password } : {}),
            })}
            disabled={busy || (!!password && !passwordStrength(password).valid)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}