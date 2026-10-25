import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Save, FileDown, Plus, Copy, Trash2, Loader2, Check, AlertCircle, Download,
} from 'lucide-react';
import { navigate } from '@/lib/router';
import { fetchSheet, fetchBusiness, insertSheet, updateSheet, nextSheetSequence } from '@/lib/data';
import { calculateRow, calculateSheetTotals, formatNumber, roundDisplay, type LengthUnit, type MaterialType, type AreaUnit } from '@/lib/calc';
import { generateSheetNumber, type Sheet, type SheetRow, type Business } from '@/lib/types';
import { exportSheetPDF } from '@/lib/pdf';
import { useAuth } from '@/auth/AuthContext';

interface DraftRow {
  temp_id: string;
  serial: number;
  length: string;
  width: string;
  height: string;
  quantity: string;
  unit: LengthUnit;
}

const emptyRow = (serial: number, unit: LengthUnit): DraftRow => ({
  temp_id: Math.random().toString(36).slice(2),
  serial,
  length: '',
  width: '',
  height: '',
  quantity: '1',
  unit,
});

const UNITS: LengthUnit[] = ['feet', 'inches', 'metres', 'centimetres', 'millimetres'];
const MATERIALS: MaterialType[] = ['Granite', 'Block'];

export function SheetEditor({ sheetId }: { sheetId: string }) {
  const isNew = sheetId === 'new';
  const { profile } = useAuth();
  const businessId = profile?.business_id ?? null;

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null>(isNew ? null : sheetId);
  const [autoSaveReady, setAutoSaveReady] = useState(false);

  const [sheetNumber, setSheetNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [material, setMaterial] = useState<MaterialType>('Granite');
  const [unit, setUnit] = useState<LengthUnit>('feet');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('sqft');
  const [showBusinessName, setShowBusinessName] = useState<'yes' | 'no'>('yes');
  const [projectName, setProjectName] = useState('');
  const [rows, setRows] = useState<DraftRow[]>([emptyRow(1, 'feet')]);
  const [addCount, setAddCount] = useState(10);

  const saveTimer = useRef<number | undefined>(undefined);
  const autoSaveTimer = useRef<number | undefined>(undefined);
  const autoSaveSkip = useRef(true);
  const lengthRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());

  const focusLength = (tempId: string) => {
    const el = lengthRefs.current.get(tempId);
    if (el) {
      el.focus();
      const v = el.value;
      el.setSelectionRange(v.length, v.length);
    }
  };

  const handleEnterNextRow = (idx: number) => {
    if (idx < rows.length - 1) {
      focusLength(rows[idx + 1].temp_id);
    } else {
      const newTempId = Math.random().toString(36).slice(2);
      setRows((prev) => [...prev, { ...emptyRow(prev.length + 1, unit), temp_id: newTempId }]);
      setTimeout(() => {
        const el = lengthRefs.current.get(newTempId);
        el?.focus();
      }, 0);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!businessId) return;
      const b = await fetchBusiness(businessId).catch(() => null);
      if (!mounted) return;
      setBusiness(b);
      if (isNew) {
        setUnit(b?.default_unit ?? 'feet');
        setRows([emptyRow(1, b?.default_unit ?? 'feet')]);
        const prefix = b?.sheet_number_prefix ?? 'SHEET-';
        const sheetDate = new Date();
        const maxSeq = await nextSheetSequence(businessId, prefix, sheetDate).catch(() => 0);
        if (!mounted) return;
        setSheetNumber(generateSheetNumber(prefix, maxSeq, sheetDate));
      }
    })();
    if (!isNew) {
      void loadSheet(sheetId);
    } else {
      setAutoSaveReady(true);
    }
    return () => { mounted = false; };
  }, [sheetId, businessId]);

  const loadSheet = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSheet(id);
      if (!data) {
        setError('Sheet not found.');
        setLoading(false);
        return;
      }
      const { sheet, rows: dbRows } = data;
      setSheetNumber(sheet.sheet_number);
      setDate(sheet.date);
      setCustomerName(sheet.customer_name);
      setPhone(sheet.phone ?? '');
      setMaterial(sheet.material_type);
      setUnit(sheet.unit);
      setAreaUnit(sheet.area_display_unit);
      setShowBusinessName(sheet.show_business_name === false ? 'no' : 'yes');
      setProjectName(sheet.project_name ?? '');
      setRows(
        dbRows.length
          ? dbRows.map((r) => ({
              temp_id: r.id,
              serial: r.serial,
              length: r.length ? String(r.length) : '',
              width: r.width ? String(r.width) : '',
              height: r.height ? String(r.height) : '',
              quantity: String(r.quantity),
              unit: r.unit,
            }))
          : [emptyRow(1, sheet.unit)],
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sheet');
    } finally {
      setLoading(false);
      setAutoSaveReady(true);
    }
  };

  const totals = useMemo(() => {
    const inputs = rows.map((r) => ({
      length: Number(r.length) || 0,
      width: Number(r.width) || 0,
      height: Number(r.height) || 0,
      quantity: Math.round(Number(r.quantity) || 0),
      unit: r.unit,
    }));
    return calculateSheetTotals(inputs, material, areaUnit);
  }, [rows, material, areaUnit]);

  const precision = business?.decimal_precision ?? 2;

  const addRow = (count = 1) => {
    setRows((prev) => {
      const next = [...prev];
      for (let i = 0; i < count; i++) {
        next.push(emptyRow(next.length + 1, unit));
      }
      return next;
    });
  };

  const updateRow = (id: string, patch: Partial<DraftRow>) => {
    setRows((prev) => prev.map((r) => (r.temp_id === id ? { ...r, ...patch } : r)));
  };

  const duplicateRow = (id: string) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.temp_id === id);
      if (idx === -1) return prev;
      const copy = { ...prev[idx], temp_id: Math.random().toString(36).slice(2) };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return renumber(next);
    });
  };

  const deleteRow = (id: string) => {
    setRows((prev) => {
      if (prev.length === 1) return prev;
      const next = prev.filter((r) => r.temp_id !== id);
      return renumber(next.length ? next : [emptyRow(1, unit)]);
    });
  };

  const renumber = (arr: DraftRow[]): DraftRow[] => arr.map((r, i) => ({ ...r, serial: i + 1 }));

  const flashSaved = () => {
    setSaveState('saved');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => setSaveState('idle'), 2000);
  };

  const buildPayload = (status: 'draft' | 'saved') => {
    const inputs = rows.map((r) => ({
      length: Number(r.length) || 0,
      width: Number(r.width) || 0,
      height: Number(r.height) || 0,
      quantity: Math.round(Number(r.quantity) || 0),
      unit: r.unit,
    }));
    const t = calculateSheetTotals(inputs, material, areaUnit);
    const sheet = {
      business_id: businessId!,
      sheet_number: sheetNumber,
      date,
      customer_name: customerName.trim() || 'Untitled',
      phone: phone.trim() || null,
      material_type: material,
      unit,
      project_name: projectName.trim() || null,
      notes: null,
      status,
      show_business_name: showBusinessName === 'yes',
      total_quantity: t.totalQuantity,
      total_area_sqft: roundDisplay(t.totalArea, 4),
      area_display_unit: areaUnit,
    };
    const sheetRows = rows
      .map((r, i) => ({
        serial: i + 1,
        piece_no: null,
        length: Number(r.length) || 0,
        width: Number(r.width) || 0,
        height: Number(r.height) || 0,
        quantity: Math.round(Number(r.quantity) || 0),
        unit: r.unit,
        area_sqft: 0,
        remarks: null,
      }));
    return { sheet, rows: sheetRows };
  };

  const save = async (status: 'draft' | 'saved') => {
    if (status === 'saved' && !customerName.trim()) {
      setError('Customer name is required before saving.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { sheet, rows: payloadRows } = buildPayload(status);
      if (existingId) {
        await updateSheet(existingId, sheet, payloadRows);
      } else {
        const created = await insertSheet(sheet, payloadRows);
        setExistingId(created.id);
        window.history.replaceState(null, '', `#/sheet/${created.id}`);
      }
      flashSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      if (/duplicate key/i.test(msg)) {
        setError('Sheet number already exists. Try saving again.');
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!autoSaveReady || !sheetNumber) return;
    if (autoSaveSkip.current) {
      autoSaveSkip.current = false;
      return;
    }
    if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = window.setTimeout(() => {
      void save('draft');
    }, 3000);
    return () => {
      if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
    };
  }, [rows, customerName, phone, material, unit, areaUnit, projectName, date, sheetNumber, showBusinessName, autoSaveReady]);

  const handlePDF = () => {
    if (!existingId) {
      setError('Save the sheet first before downloading PDF.');
      return;
    }
    const snapshot: Sheet = {
      id: existingId,
      business_id: businessId!,
      sheet_number: sheetNumber,
      date,
      customer_name: customerName.trim() || 'Untitled',
      phone: phone.trim() || null,
      material_type: material,
      unit,
      project_name: projectName.trim() || null,
      notes: null,
      status: 'saved',
      show_business_name: showBusinessName === 'yes',
      total_quantity: totals.totalQuantity,
      total_area_sqft: roundDisplay(totals.totalArea, 4),
      area_display_unit: areaUnit,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const snapshotRows: SheetRow[] = rows.map((r, i) => {
      const calc = calculateRow(
        { length: Number(r.length) || 0, width: Number(r.width) || 0, height: Number(r.height) || 0, quantity: Math.round(Number(r.quantity) || 0), unit: r.unit },
        material,
        areaUnit,
      );
      return {
        id: r.temp_id,
        sheet_id: existingId,
        serial: i + 1,
        piece_no: null,
        length: Number(r.length) || 0,
        width: Number(r.width) || 0,
        height: Number(r.height) || 0,
        quantity: Math.round(Number(r.quantity) || 0),
        unit: r.unit,
        area_sqft: roundDisplay(calc.rowTotal, 4),
        remarks: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
    exportSheetPDF(snapshot, snapshotRows, business);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading sheet...
      </div>
    );
  }

  const areaUnitLabel = areaUnit === 'sqm' ? 'm²' : 'sq ft';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {isNew ? 'New Measurement Sheet' : 'Edit Measurement Sheet'}
            </h1>
            <div className="text-xs font-mono text-slate-500">{sheetNumber}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {saveState === 'saved' && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
              <Check size={14} /> Saved
            </span>
          )}
          <button
            onClick={handlePDF}
            disabled={saving}
            className="inline-flex items-center gap-1.5 border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
          >
            <FileDown size={16} /> PDF
          </button>
          <button
            onClick={() => save('draft')}
            disabled={saving}
            className="inline-flex items-center gap-1.5 border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save draft
          </button>
          <button
            onClick={() => save('saved')}
            disabled={saving}
            className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save sheet
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-4 md:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Sheet number">
          <input value={sheetNumber} onChange={(e) => setSheetNumber(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Customer / Party name" required>
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputCls} placeholder="Customer name" />
        </Field>
        <Field label="Material type">
          <select value={material} onChange={(e) => setMaterial(e.target.value as MaterialType)} className={inputCls}>
            {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Product name (optional)">
          <input value={projectName} onChange={(e) => setProjectName(e.target.value)} className={inputCls} placeholder="Product" />
        </Field>
        <Field label="Phone (optional)">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="Phone" inputMode="tel" />
        </Field>
        <Field label="Measurement unit">
          <select value={unit} onChange={(e) => setUnit(e.target.value as LengthUnit)} className={inputCls}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </Field>
        <Field label="Area display unit">
          <select value={areaUnit} onChange={(e) => setAreaUnit(e.target.value as AreaUnit)} className={inputCls}>
            <option value="sqft">Square feet (sq ft)</option>
            <option value="sqm">Square metres (m²)</option>
          </select>
        </Field>
        <Field label="Show business name in report">
          <select value={showBusinessName} onChange={(e) => setShowBusinessName(e.target.value as 'yes' | 'no')} className={inputCls}>
            <option value="yes">Yes (default)</option>
            <option value="no">No — hide business details</option>
          </select>
        </Field>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-700">Measurement rows</h2>
            <span className="text-xs text-slate-400">{rows.length} row{rows.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={addCount}
              onChange={(e) => setAddCount(Number(e.target.value))}
              className="px-2 py-1.5 rounded-md border border-slate-300 text-xs bg-white text-slate-700"
              title="Rows to add"
            >
              <option value={1}>+1</option>
              <option value={5}>+5</option>
              <option value={10}>+10</option>
              <option value={25}>+25</option>
              <option value={50}>+50</option>
              <option value={100}>+100</option>
            </select>
            <button onClick={() => addRow(addCount)} className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-800">
              <Plus size={14} /> Add {addCount} row{addCount > 1 ? 's' : ''}
            </button>
          </div>
        </div>

        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 w-10">#</th>
                <th className="px-3 py-2 text-center w-24">Length</th>
                <th className="px-3 py-2 text-center w-24">Width</th>
                {material === 'Block' && <th className="px-3 py-2 text-center w-24">Height</th>}
                <th className="px-3 py-2 text-center w-28">{material === 'Block' ? 'Volume (m³)' : `Area (${areaUnitLabel})`}</th>
                <th className="px-3 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, idx) => {
                const calc = calculateRow(
                  { length: Number(r.length) || 0, width: Number(r.width) || 0, height: Number(r.height) || 0, quantity: Math.round(Number(r.quantity) || 0), unit: r.unit },
                  material,
                  areaUnit,
                );
                return (
                  <tr key={r.temp_id} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 text-slate-500 text-center">{idx + 1}</td>
                    <td className="px-3 py-1.5">
                      <input
                        ref={(el) => { lengthRefs.current.set(r.temp_id, el); }}
                        value={r.length}
                        onChange={(e) => updateRow(r.temp_id, { length: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); focusLength(r.temp_id); } }}
                        className={cellInput + ' text-center'}
                        inputMode="decimal"
                        placeholder=""
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        value={r.width}
                        onChange={(e) => updateRow(r.temp_id, { width: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleEnterNextRow(idx); } }}
                        className={cellInput + ' text-center'}
                        inputMode="decimal"
                        placeholder=""
                      />
                    </td>
                    {material === 'Block' && (
                      <td className="px-3 py-1.5">
                        <input
                          value={r.height}
                          onChange={(e) => updateRow(r.temp_id, { height: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleEnterNextRow(idx); } }}
                          className={cellInput + ' text-center'}
                          inputMode="decimal"
                          placeholder=""
                        />
                      </td>
                    )}
                    <td className={`px-3 py-1.5 text-center font-mono text-xs ${calc.isValid ? 'text-slate-900' : 'text-slate-300'}`}>
                      {calc.isValid ? formatNumber(calc.rowTotal, precision) : '—'}
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => duplicateRow(r.temp_id)} className="p-1.5 rounded hover:bg-slate-200 text-slate-500" title="Duplicate">
                          <Copy size={14} />
                        </button>
                        <button onClick={() => deleteRow(r.temp_id)} className="p-1.5 rounded hover:bg-red-100 text-slate-500 hover:text-red-600" title="Delete">
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

        <div className="lg:hidden divide-y divide-slate-100">
          {rows.map((r, idx) => {
            const calc = calculateRow(
              { length: Number(r.length) || 0, width: Number(r.width) || 0, height: Number(r.height) || 0, quantity: Math.round(Number(r.quantity) || 0), unit: r.unit },
              material,
              areaUnit,
            );
            return (
              <div key={r.temp_id} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500">Row {idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => duplicateRow(r.temp_id)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><Copy size={14} /></button>
                    <button onClick={() => deleteRow(r.temp_id)} className="p-1.5 rounded hover:bg-red-50 text-slate-500 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MobileField label="Length"><input ref={(el) => { lengthRefs.current.set(r.temp_id, el); }} value={r.length} onChange={(e) => updateRow(r.temp_id, { length: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleEnterNextRow(idx); } }} className={mInput} inputMode="decimal" placeholder="" /></MobileField>
                  <MobileField label="Width"><input value={r.width} onChange={(e) => updateRow(r.temp_id, { width: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleEnterNextRow(idx); } }} className={mInput} inputMode="decimal" placeholder="" /></MobileField>
                  {material === 'Block' && (
                    <MobileField label="Height"><input value={r.height} onChange={(e) => updateRow(r.temp_id, { height: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleEnterNextRow(idx); } }} className={mInput} inputMode="decimal" placeholder="" /></MobileField>
                  )}
                </div>
                <div className="mt-2 text-right text-xs">
                  <span className="text-slate-400">{material === 'Block' ? 'Volume: ' : 'Area: '}</span>
                  <span className={`font-mono font-semibold ${calc.isValid ? 'text-slate-900' : 'text-slate-300'}`}>
                    {calc.isValid ? `${formatNumber(calc.rowTotal, precision)} ${material === 'Block' ? 'm³' : areaUnitLabel}` : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center gap-3 flex-wrap">
          <button onClick={() => addRow(addCount)} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900">
            <Plus size={16} /> Add {addCount} more row{addCount > 1 ? 's' : ''}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 md:p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryStat label="Total Rows" value={String(rows.length)} />
          <SummaryStat label="Valid Rows" value={`${totals.validRows}`} sub={totals.invalidRows > 0 ? `${totals.invalidRows} incomplete` : undefined} />
          <SummaryStat
            label={material === 'Block' ? 'Grand Total Volume' : 'Grand Total Area'}
            value={`${formatNumber(roundDisplay(totals.totalArea, precision), precision)} ${material === 'Block' ? 'm³' : areaUnitLabel}`}
            highlight
          />
          <SummaryStat label="Total Quantity" value={formatNumber(totals.totalQuantity, 0)} />
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 pb-2">
        <button onClick={() => navigate('/sheets')} className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1">
          <Download size={14} /> View all saved sheets
        </button>
        <div className="text-xs text-slate-400">Totals recalculate live and again on save.</div>
      </div>

      <div className="sticky bottom-4 z-10 bg-white border border-slate-200 rounded-lg shadow-sm px-4 py-3 flex items-center justify-end gap-2 flex-wrap">
        <button
          onClick={handlePDF}
          disabled={saving}
          className="inline-flex items-center gap-1.5 border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
        >
          <FileDown size={16} /> PDF
        </button>
        <button
          onClick={() => save('draft')}
          disabled={saving}
          className="inline-flex items-center gap-1.5 border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save draft
        </button>
        <button
          onClick={() => save('saved')}
          disabled={saving}
          className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save sheet
        </button>
      </div>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm text-slate-900 bg-white';
const cellInput = 'w-full px-2 py-1.5 rounded-md border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm text-slate-900 bg-white';
const mInput = 'w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-base text-slate-900 bg-white';

function Field({ label, children, required, full }: { label: string; children: React.ReactNode; required?: boolean; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2 lg:col-span-3' : ''}>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function MobileField({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="block text-[11px] font-medium text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function SummaryStat({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs text-slate-500 uppercase font-medium">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${highlight ? 'text-slate-900' : 'text-slate-700'}`}>{value}</div>
      {sub && <div className="text-xs text-amber-600 mt-0.5">{sub}</div>}
    </div>
  );
}