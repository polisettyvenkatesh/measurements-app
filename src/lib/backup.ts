import { exportAllData, importData, type ImportPayload } from './data';
import type { SheetRow } from './types';

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stamp(): string {
  const d = new Date();
  return (
    `${d.getFullYear()}` +
    `${String(d.getMonth() + 1).padStart(2, '0')}` +
    `${String(d.getDate()).padStart(2, '0')}` +
    `-` +
    `${String(d.getHours()).padStart(2, '0')}` +
    `${String(d.getMinutes()).padStart(2, '0')}`
  );
}

export async function exportJSON(businessId: string): Promise<void> {
  const data = await exportAllData(businessId);
  download(
    `measurement-backup-${stamp()}.json`,
    JSON.stringify(data, null, 2),
    'application/json',
  );
}

export async function exportCSV(businessId: string): Promise<void> {
  const { sheets, rows } = await exportAllData(businessId);
  const rowsBySheet = new Map<string, SheetRow[]>();
  for (const r of rows) {
    const arr = rowsBySheet.get(r.sheet_id) ?? [];
    arr.push(r);
    rowsBySheet.set(r.sheet_id, arr);
  }

  const header = [
    'sheet_number', 'date', 'customer_name', 'phone', 'material_type',
    'project_name', 'unit', 'status', 'serial', 'piece_no',
    'length', 'width', 'height', 'quantity', 'row_unit', 'area_sqft', 'remarks',
  ];

  const lines: string[] = [header.join(',')];

  const esc = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  for (const s of sheets) {
    const sheetRows = rowsBySheet.get(s.id) ?? [];
    if (sheetRows.length === 0) {
      lines.push(
        [s.sheet_number, s.date, s.customer_name, s.phone ?? '', s.material_type,
         s.project_name ?? '', s.unit, s.status, '', '', '', '', '', '', '', '', '']
          .map(esc).join(','),
      );
    } else {
      for (const r of sheetRows) {
        lines.push(
          [s.sheet_number, s.date, s.customer_name, s.phone ?? '', s.material_type,
           s.project_name ?? '', s.unit, s.status,
           r.serial, r.piece_no ?? '', r.length, r.width, r.height, r.quantity,
           r.unit, r.area_sqft, r.remarks ?? '']
            .map(esc).join(','),
        );
      }
    }
  }

  download(`measurement-backup-${stamp()}.csv`, lines.join('\n'), 'text/csv');
}

export async function importJSON(file: File, businessId: string): Promise<{ sheets: number; rows: number }> {
  const text = await file.text();
  let parsed: ImportPayload;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON. Please select a JSON backup file.');
  }
  if (!parsed || !Array.isArray(parsed.sheets)) {
    throw new Error('The JSON file does not contain the expected backup format (missing "sheets" array).');
  }
  return importData(parsed, businessId);
}