import { useEffect, useRef, useState } from 'react';
import { Plus, Building2, Save, Trash2, Loader2, AlertCircle, Check, X, Ruler, Palette, Database, Download, Upload } from 'lucide-react';
import { listBusinesses, createBusiness, updateBusiness, deleteBusiness } from '@/lib/data';
import { useAuth } from '@/auth/AuthContext';
import { isSuperAdmin } from '@/lib/roles';
import { exportJSON, exportCSV, importJSON } from '@/lib/backup';
import type { Business, LengthUnit } from '@/lib/types';

const UNITS: LengthUnit[] = ['feet', 'inches', 'metres', 'centimetres', 'millimetres'];

export function AdminBusinesses() {
  const { profile } = useAuth();
  const superAdmin = profile ? isSuperAdmin(profile) : false;
  const myBusinessId = profile?.business_id ?? null;

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Business | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [backupFor, setBackupFor] = useState<Business | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listBusinesses();
      setBusinesses(superAdmin ? list : list.filter((b) => b.id === myBusinessId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleSave = async (b: Partial<Business> & { name: string }) => {
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await updateBusiness(editing.id, b);
      } else {
        await createBusiness(b);
      }
      setEditing(null);
      setCreating(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    try {
      await deleteBusiness(id);
      setConfirmDelete(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Businesses</h1>
          <p className="text-sm text-slate-500 mt-1">{superAdmin ? 'Manage business profiles, measurement defaults, report styling, and backups' : 'Manage your business profile, measurement defaults, report styling, and backups'}</p>
        </div>
        {superAdmin && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            <Plus size={18} /> Add Business
          </button>
        )}
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
      ) : businesses.length === 0 ? (
        <div className="text-sm text-slate-500 py-16 text-center border border-dashed border-slate-200 rounded-lg">
          No businesses yet. Create your first business to get started.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {businesses.map((b) => (
            <div key={b.id} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Building2 size={18} className="text-slate-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-900">{b.name}</div>
                    {b.address && <div className="text-xs text-slate-500">{b.address}</div>}
                  </div>
                </div>
              </div>
              {b.phone && <div className="text-xs text-slate-500 mt-2">{b.phone}</div>}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] uppercase font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{b.default_unit}</span>
                <span className="text-[10px] uppercase font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">Prefix: {b.sheet_number_prefix}</span>
                <span className="text-[10px] uppercase font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{b.report_font}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setEditing(b)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 border border-slate-300 text-slate-700 px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-50"
                >
                  <Save size={14} /> Edit
                </button>
                <button
                  onClick={() => setBackupFor(b)}
                  className="inline-flex items-center justify-center gap-1.5 border border-slate-300 text-slate-700 px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-50"
                >
                  <Database size={14} /> Data
                </button>
                {superAdmin && (
                  <button
                    onClick={() => setConfirmDelete(b.id)}
                    className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <BusinessModal
          business={editing}
          busy={busy}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={handleSave}
        />
      )}

      {backupFor && (
        <BackupModal
          business={backupFor}
          onClose={() => setBackupFor(null)}
          onError={(msg) => setError(msg)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-lg p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-900">Delete this business?</h3>
            <p className="text-sm text-slate-500 mt-1">This removes the business and all its sheets. This cannot be undone.</p>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setConfirmDelete(null)} className="px-3 py-2 text-sm rounded-lg border border-slate-300 hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={busy} className="px-3 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700">
                {busy ? <Loader2 size={14} className="animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm text-slate-900 bg-white';

function BusinessModal({
  business,
  busy,
  onClose,
  onSave,
}: {
  business: Business | null;
  busy: boolean;
  onClose: () => void;
  onSave: (b: Partial<Business> & { name: string }) => void;
}) {
  const [name, setName] = useState(business?.name ?? '');
  const [address, setAddress] = useState(business?.address ?? '');
  const [phone, setPhone] = useState(business?.phone ?? '');
  const [logoUrl, setLogoUrl] = useState(business?.logo_url ?? '');
  const [defaultUnit, setDefaultUnit] = useState<LengthUnit>(business?.default_unit ?? 'feet');
  const [decimalPrecision, setDecimalPrecision] = useState(business?.decimal_precision ?? 2);
  const [sheetNumberPrefix, setSheetNumberPrefix] = useState(business?.sheet_number_prefix ?? 'SHEET-');
  const [reportTitle, setReportTitle] = useState(business?.report_title ?? 'Measurement Sheet');
  const [reportAccentColor, setReportAccentColor] = useState(business?.report_accent_color ?? '#1e293b');
  const [reportTableTextColor, setReportTableTextColor] = useState(business?.report_table_text_color ?? '#1e293b');
  const [reportFont, setReportFont] = useState<Business['report_font']>(business?.report_font ?? 'helvetica');
  const [reportShowBorders, setReportShowBorders] = useState(business?.report_show_borders ?? true);

  const save = () => onSave({
    name: name.trim(),
    address,
    phone,
    logo_url: logoUrl,
    default_unit: defaultUnit,
    decimal_precision: decimalPrecision,
    sheet_number_prefix: sheetNumberPrefix,
    report_title: reportTitle,
    report_accent_color: reportAccentColor,
    report_table_text_color: reportTableTextColor,
    report_font: reportFont,
    report_show_borders: reportShowBorders,
  });

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-lg p-5 max-w-lg w-full my-8 max-h-[calc(100vh-4rem)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2">
          <h3 className="font-semibold text-slate-900">{business ? 'Edit Business' : 'New Business'}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Business name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Business name" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} placeholder="Address" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="Phone" inputMode="tel" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Logo URL (optional)</label>
              <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className={inputCls} placeholder="https://..." />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
              <Ruler size={15} /> Measurement defaults
            </h4>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Default unit</label>
                <select value={defaultUnit} onChange={(e) => setDefaultUnit(e.target.value as LengthUnit)} className={inputCls}>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Decimal precision</label>
                <select value={decimalPrecision} onChange={(e) => setDecimalPrecision(Number(e.target.value))} className={inputCls}>
                  {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Sheet-number prefix</label>
                <input value={sheetNumberPrefix} onChange={(e) => setSheetNumberPrefix(e.target.value)} className={inputCls} placeholder="SHEET-" />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
              <Palette size={15} /> Report styling
            </h4>
            <p className="text-xs text-slate-500 mb-3">Controls the look of the PDF report generated for each sheet.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Report title</label>
                <input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} className={inputCls} placeholder="Measurement Sheet" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Font family</label>
                <select value={reportFont} onChange={(e) => setReportFont(e.target.value as Business['report_font'])} className={inputCls}>
                  <option value="helvetica">Helvetica (sans-serif)</option>
                  <option value="times">Times (serif)</option>
                  <option value="courier">Courier (monospace)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Accent color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={reportAccentColor} onChange={(e) => setReportAccentColor(e.target.value)} className="w-10 h-9 rounded border border-slate-300 cursor-pointer bg-white p-0.5" />
                  <input value={reportAccentColor} onChange={(e) => setReportAccentColor(e.target.value)} className={inputCls} placeholder="#1e293b" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Table text color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={reportTableTextColor} onChange={(e) => setReportTableTextColor(e.target.value)} className="w-10 h-9 rounded border border-slate-300 cursor-pointer bg-white p-0.5" />
                  <input value={reportTableTextColor} onChange={(e) => setReportTableTextColor(e.target.value)} className={inputCls} placeholder="#1e293b" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 h-9">
                  <input type="checkbox" checked={reportShowBorders} onChange={(e) => setReportShowBorders(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                  <span className="text-sm text-slate-700">Show table cell borders in PDF reports</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5 sticky bottom-0 bg-white pt-3 border-t border-slate-100">
          <button onClick={onClose} className="px-3 py-2 text-sm rounded-lg border border-slate-300 hover:bg-slate-50">Cancel</button>
          <button
            onClick={save}
            disabled={busy || !name.trim()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {business ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BackupModal({
  business,
  onClose,
  onError,
}: {
  business: Business;
  onClose: () => void;
  onError: (msg: string) => void;
}) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const r = await importJSON(file, business.id);
      setResult(`Imported ${r.sheets} sheet(s) and ${r.rows} row(s).`);
      setTimeout(() => setResult(null), 5000);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Database size={18} /> {business.name} — Backup &amp; restore
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100"><X size={18} /></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Download a copy of all sheets, rows, and business settings for this business. JSON is best for full restore; CSV is spreadsheet-friendly.
        </p>
        {result && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-start gap-2 mb-3">
            <Check size={16} className="mt-0.5 flex-shrink-0" /> {result}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => exportJSON(business.id).catch((e) => onError(e.message))}
            className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
          >
            <Download size={16} /> Export JSON
          </button>
          <button
            onClick={() => exportCSV(business.id).catch((e) => onError(e.message))}
            className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Import JSON
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleImport} className="hidden" />
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Importing adds the backup's sheets as new entries into this business and restores its settings. Existing sheets are not overwritten.
        </p>
      </div>
    </div>
  );
}