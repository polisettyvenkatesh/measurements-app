import { useEffect, useState } from 'react';
import { Search, FileDown, Copy, Trash2, FilePlus2, Loader2, Filter, AlertCircle } from 'lucide-react';
import { navigate } from '@/lib/router';
import { listSheets, deleteSheet, duplicateSheet, fetchBusiness, nextSheetSequence, fetchSheet } from '@/lib/data';
import { exportSheetPDF } from '@/lib/pdf';
import type { Sheet, Business } from '@/lib/types';
import { formatDate, generateSheetNumber } from '@/lib/types';
import { useAuth } from '@/auth/AuthContext';

export function SavedSheets() {
  const { profile } = useAuth();
  const businessId = profile?.business_id ?? null;

  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [search, setSearch] = useState('');
  const [material, setMaterial] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!businessId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [list, b] = await Promise.all([
        listSheets(businessId, { search, material, status: statusFilter }),
        fetchBusiness(businessId).catch(() => null),
      ]);
      setSheets(list);
      setBusiness(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [material, statusFilter, businessId]);

  useEffect(() => {
    const t = setTimeout(() => { void load(); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const onDuplicate = async (s: Sheet) => {
    setBusyId(s.id);
    try {
      const prefix = business?.sheet_number_prefix ?? 'SHEET-';
      const sheetDate = new Date(s.date);
      const maxSeq = businessId ? await nextSheetSequence(businessId, prefix, sheetDate).catch(() => 0) : 0;
      const newNo = generateSheetNumber(prefix, maxSeq, sheetDate);
      await duplicateSheet(s.id, newNo);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Duplicate failed');
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (id: string) => {
    setBusyId(id);
    try {
      await deleteSheet(id);
      setConfirmId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  const onPDF = async (s: Sheet) => {
    setBusyId(s.id);
    try {
      const data = await fetchSheet(s.id);
      if (data) exportSheetPDF(data.sheet, data.rows, business);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Saved Sheets</h1>
          <p className="text-sm text-slate-500 mt-1">Search, filter, edit, duplicate or download</p>
        </div>
        <button onClick={() => navigate('/sheet/new')} className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800">
          <FilePlus2 size={18} /> New Sheet
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sheet number or customer..."
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select value={material} onChange={(e) => setMaterial(e.target.value)} className="pl-9 pr-8 py-2 rounded-lg border border-slate-300 text-sm bg-white">
              <option value="all">All materials</option>
              <option value="Granite">Granite</option>
              <option value="Block">Block</option>
            </select>
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
            <option value="all">All status</option>
            <option value="saved">Saved</option>
            <option value="draft">Drafts</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
        </div>
      ) : sheets.length === 0 ? (
        <div className="text-sm text-slate-500 py-16 text-center border border-dashed border-slate-200 rounded-lg">
          No sheets match your filters.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Sheet No.</th>
                <th className="text-left px-4 py-2.5 font-medium">Customer</th>
                <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Material</th>
                <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Date</th>
                <th className="text-right px-4 py-2.5 font-medium hidden sm:table-cell">Total Area</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-right px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sheets.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <button onClick={() => navigate(`/sheet/${s.id}`)} className="font-mono text-xs text-slate-900 hover:underline">
                      {s.sheet_number}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900 truncate max-w-[160px]">{s.customer_name}</td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">{s.material_type}</td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-slate-500">{formatDate(s.date)}</td>
                  <td className="px-4 py-2.5 hidden sm:table-cell text-right font-mono text-xs">{s.total_area_sqft} {s.area_display_unit === 'sqm' ? 'm²' : 'sqft'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                      s.status === 'draft' ? 'text-amber-700 bg-amber-100' : 'text-emerald-700 bg-emerald-100'
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onPDF(s)} disabled={busyId === s.id} className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="PDF">
                        {busyId === s.id ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                      </button>
                      <button onClick={() => onDuplicate(s)} disabled={busyId === s.id} className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="Duplicate">
                        <Copy size={14} />
                      </button>
                      <button onClick={() => setConfirmId(s.id)} disabled={busyId === s.id} className="p-1.5 rounded hover:bg-red-100 text-slate-600 hover:text-red-600" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmId && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setConfirmId(null)}>
          <div className="bg-white rounded-lg p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-900">Delete this sheet?</h3>
            <p className="text-sm text-slate-500 mt-1">This permanently removes the sheet and all its measurement rows. This cannot be undone.</p>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setConfirmId(null)} className="px-3 py-2 text-sm rounded-lg border border-slate-300 hover:bg-slate-50">Cancel</button>
              <button onClick={() => onDelete(confirmId)} className="px-3 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}