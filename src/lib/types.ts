import type { MaterialType, LengthUnit, AreaUnit } from './calc';

export interface SheetRow {
  id: string;
  sheet_id: string;
  serial: number;
  piece_no: string | null;
  length: number;
  width: number;
  height: number;
  quantity: number;
  unit: LengthUnit;
  area_sqft: number;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sheet {
  id: string;
  business_id: string;
  sheet_number: string;
  date: string;
  customer_name: string;
  phone: string | null;
  material_type: MaterialType;
  unit: LengthUnit;
  project_name: string | null;
  notes: string | null;
  status: 'draft' | 'saved';
  show_business_name: boolean;
  total_quantity: number;
  total_area_sqft: number;
  area_display_unit: AreaUnit;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  name: string;
  address: string;
  phone: string;
  logo_url: string;
  default_unit: LengthUnit;
  decimal_precision: number;
  sheet_number_prefix: string;
  report_accent_color: string;
  report_table_text_color: string;
  report_font: 'helvetica' | 'times' | 'courier';
  report_show_borders: boolean;
  report_title: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  business_id: string | null;
  role: 'admin' | 'member';
  full_name: string;
  disabled: boolean;
  login_id: string | null;
  created_at: string;
}

export type { LengthUnit, MaterialType, AreaUnit } from './calc';

export type NewSheet = Omit<Sheet, 'id' | 'created_by' | 'created_at' | 'updated_at'>;
export type NewSheetRow = Omit<SheetRow, 'id' | 'created_at' | 'updated_at' | 'sheet_id'> & {
  sheet_id?: string;
  temp_id?: string;
};

export function generateSheetNumber(prefix: string, counter = 0, date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  const seq = String(counter + 1).padStart(4, '0');
  return `${prefix}${dd}-${mm}-${yyyy}-${seq}`;
}

export function extractSheetSequence(sheetNumber: string): number {
  const m = /(\d{4})$/.exec(sheetNumber);
  return m ? parseInt(m[1], 10) : 0;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}