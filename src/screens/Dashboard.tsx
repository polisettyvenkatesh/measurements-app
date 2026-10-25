import { useEffect, useState } from 'react';
import { FilePlus2, Search, FileText, FileEdit, Loader2, Building2, Users, ArrowRight } from 'lucide-react';
import { navigate } from '@/lib/router';
import { listSheets, countSheets } from '@/lib/data';
import type { Sheet } from '@/lib/types';
import { formatDate } from '@/lib/types';
import { useAuth } from '@/auth/AuthContext';
import { roleTitle } from '@/lib/roles';

export function Dashboard() {
  const { profile } = useAuth();
  const businessId = profile?.business_id ?? null;

  const [recent, setRecent] = useState<Sheet[]>([]);
  const [drafts, setDrafts] = useState<Sheet[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!businessId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [recentList, draftList, count] = await Promise.all([
        listSheets(businessId, { limit: 10 }),
        listSheets(businessId, { status: 'draft', limit: 5 }),
        countSheets(businessId),
      ]);
      setRecent(recentList);
      setDrafts(draftList);
      setTotal(count);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sheets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [businessId]);

  const filtered = search.trim()
    ? recent.filter(
        (s) =>
          s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
          s.sheet_number.toLowerCase().includes(search.toLowerCase()),
      )
    : recent;

  if (!businessId && profile) {
    if (profile.role === 'admin') {
      const title = roleTitle(profile);
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{title} Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Onboard businesses and users to get started</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/admin/businesses')}
              className="text-left bg-white border border-slate-200 rounded-xl p-6 hover:border-slate-400 hover:shadow-sm transition group"
            >
              <div className="w-11 h-11 rounded-lg bg-slate-900 flex items-center justify-center mb-3">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-semibold text-slate-900">Add a Business</h2>
                <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition" />
              </div>
              <p className="text-sm text-slate-500 mt-1">Create business profiles with name, address, phone, and logo.</p>
            </button>
            <button
              onClick={() => navigate('/admin/users')}
              className="text-left bg-white border border-slate-200 rounded-xl p-6 hover:border-slate-400 hover:shadow-sm transition group"
            >
              <div className="w-11 h-11 rounded-lg bg-slate-900 flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-semibold text-slate-900">Add Users</h2>
                <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition" />
              </div>
              <p className="text-sm text-slate-500 mt-1">Create user accounts and assign them to a business.</p>
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <div className="text-sm text-slate-500 py-16 text-center border border-dashed border-slate-200 rounded-lg">
          Your account is not linked to a business yet. Please contact an administrator.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Create, edit and manage measurement sheets</p>
        </div>
        <button
          onClick={() => navigate('/sheet/new')}
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 whitespace-nowrap"
        >
          <FilePlus2 size={18} />
          <span className="hidden sm:inline">New Sheet</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Sheets" value={total} />
        <StatCard label="Recent" value={recent.length} />
        <StatCard label="Drafts" value={drafts.length} />
        <StatCard label="Materials" value={2} hint="Granite / Block" />
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by sheet number or customer name..."
          className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm"
        />
      </div>

      {drafts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileEdit size={16} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-700">Quick access to drafts</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {drafts.map((d) => (
              <button
                key={d.id}
                onClick={() => navigate(`/sheet/${d.id}`)}
                className="text-left bg-amber-50 border border-amber-200 rounded-lg p-3 hover:border-amber-400 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-amber-800">{d.sheet_number}</span>
                  <span className="text-[10px] uppercase font-semibold text-amber-700 bg-amber-200/60 px-1.5 py-0.5 rounded">Draft</span>
                </div>
                <div className="font-medium text-slate-900 text-sm mt-1 truncate">{d.customer_name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{d.material_type} · {formatDate(d.date)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileText size={16} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Recent sheets</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-slate-500 py-8 text-center border border-dashed border-slate-200 rounded-lg">
            No sheets found. Create your first measurement sheet.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Sheet No.</th>
                  <th className="text-left px-4 py-2.5 font-medium">Customer</th>
                  <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Material</th>
                  <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/sheet/${s.id}`)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs">{s.sheet_number}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-900 truncate max-w-[160px]">{s.customer_name}</td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">{s.material_type}</td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-slate-500">{formatDate(s.date)}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                          s.status === 'draft'
                            ? 'text-amber-700 bg-amber-100'
                            : 'text-emerald-700 bg-emerald-100'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="text-xs text-slate-500 uppercase font-medium">{label}</div>
      <div className="text-2xl font-semibold text-slate-900 mt-1">{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
}