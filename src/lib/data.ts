import { supabase } from './supabase';
import type { Sheet, SheetRow, NewSheet, NewSheetRow, Business, UserProfile } from './types';

export async function listBusinesses(): Promise<Business[]> {
  const { data, error } = await supabase.from('businesses').select('*').order('name');
  if (error) throw error;
  return (data ?? []) as Business[];
}

export async function createBusiness(b: Partial<Business>): Promise<Business> {
  const { data, error } = await supabase.from('businesses').insert(b).select().single();
  if (error) throw error;
  return data as Business;
}

export async function updateBusiness(id: string, patch: Partial<Business>): Promise<Business> {
  const { data, error } = await supabase.from('businesses').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Business;
}

export async function deleteBusiness(id: string): Promise<void> {
  const { error } = await supabase.from('businesses').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchBusiness(businessId: string): Promise<Business | null> {
  const { data, error } = await supabase.from('businesses').select('*').eq('id', businessId).maybeSingle();
  if (error) throw error;
  return data as Business | null;
}

export async function listUserProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase.from('user_profiles').select('*').order('created_at');
  if (error) throw error;
  return (data ?? []) as UserProfile[];
}

export interface CreateUserParams {
  user_id: string;
  password: string;
  full_name?: string;
  business_id: string;
  role?: 'admin' | 'member';
}

export interface UpdateUserParams {
  user_id: string;
  full_name?: string;
  business_id?: string;
  role?: 'admin' | 'member';
  disabled?: boolean;
  password?: string;
}

async function callUserFunction(method: 'POST' | 'PUT', body: object): Promise<Record<string, unknown>> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;
  const { data: session } = await supabase.auth.getSession();
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.session?.access_token ?? ''}`,
      Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to update user');
  return result.user as Record<string, unknown>;
}

export async function createUser(params: CreateUserParams): Promise<{ id: string; user_id: string }> {
  return callUserFunction('POST', params) as Promise<{ id: string; user_id: string }>;
}

export async function updateUser(params: UpdateUserParams): Promise<{ id: string }> {
  return callUserFunction('PUT', params) as Promise<{ id: string }>;
}

export async function updateUserProfile(id: string, patch: Partial<UserProfile>): Promise<void> {
  const { error } = await supabase.from('user_profiles').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteUserProfile(id: string): Promise<void> {
  const { error } = await supabase.from('user_profiles').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchSheet(id: string): Promise<{ sheet: Sheet; rows: SheetRow[] } | null> {
  const { data: sheet, error: se } = await supabase
    .from('sheets')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (se) throw se;
  if (!sheet) return null;
  const { data: rows, error: re } = await supabase
    .from('sheet_rows')
    .select('*')
    .eq('sheet_id', id)
    .order('serial', { ascending: true });
  if (re) throw re;
  return { sheet: sheet as Sheet, rows: (rows ?? []) as SheetRow[] };
}

export async function listSheets(businessId: string, opts?: {
  search?: string;
  material?: string;
  status?: string;
  limit?: number;
}): Promise<Sheet[]> {
  let q = supabase.from('sheets').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
  if (opts?.search) {
    q = q.or(`customer_name.ilike.%${opts.search}%,sheet_number.ilike.%${opts.search}%`);
  }
  if (opts?.material && opts.material !== 'all') q = q.eq('material_type', opts.material);
  if (opts?.status && opts.status !== 'all') q = q.eq('status', opts.status);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Sheet[];
}

export async function countSheets(businessId: string): Promise<number> {
  const { count, error } = await supabase
    .from('sheets')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId);
  if (error) throw error;
  return count ?? 0;
}

export async function nextSheetSequence(businessId: string, prefix: string, date = new Date()): Promise<number> {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  const datePart = `${dd}-${mm}-${yyyy}`;
  const pattern = `${prefix}${datePart}-`;

  const { data, error } = await supabase
    .from('sheets')
    .select('sheet_number')
    .eq('business_id', businessId)
    .like('sheet_number', `${pattern}%`);

  if (error) throw error;

  let max = 0;
  for (const row of data ?? []) {
    const m = /(\d{4})$/.exec(row.sheet_number as string);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return max;
}

export async function insertSheet(sheet: NewSheet, rows: NewSheetRow[]): Promise<Sheet> {
  const { data, error } = await supabase.from('sheets').insert(sheet).select().single();
  if (error) throw error;
  const created = data as Sheet;

  if (rows.length > 0) {
    const withSheet = rows.map((r) => ({ ...r, sheet_id: created.id }));
    const { error: re } = await supabase.from('sheet_rows').insert(withSheet);
    if (re) {
      await supabase.from('sheets').delete().eq('id', created.id);
      throw re;
    }
  }
  return created;
}

export async function updateSheet(
  id: string,
  sheet: Partial<NewSheet>,
  rows: NewSheetRow[],
): Promise<Sheet> {
  const { data, error } = await supabase
    .from('sheets')
    .update(sheet)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  const updated = data as Sheet;

  const { error: de } = await supabase.from('sheet_rows').delete().eq('sheet_id', id);
  if (de) throw de;

  if (rows.length > 0) {
    const withSheet = rows.map((r) => ({ ...r, sheet_id: id }));
    const { error: re } = await supabase.from('sheet_rows').insert(withSheet);
    if (re) throw re;
  }
  return updated;
}

export async function deleteSheet(id: string): Promise<void> {
  const { error } = await supabase.from('sheets').delete().eq('id', id);
  if (error) throw error;
}

export async function duplicateSheet(id: string, newSheetNumber: string): Promise<Sheet> {
  const existing = await fetchSheet(id);
  if (!existing) throw new Error('Sheet not found');
  const { sheet, rows } = existing;
  const copy: NewSheet = {
    business_id: sheet.business_id,
    sheet_number: newSheetNumber,
    date: sheet.date,
    customer_name: sheet.customer_name + ' (copy)',
    phone: sheet.phone,
    material_type: sheet.material_type,
    unit: sheet.unit,
    project_name: sheet.project_name,
    notes: sheet.notes,
    status: 'draft',
    show_business_name: sheet.show_business_name,
    total_quantity: sheet.total_quantity,
    total_area_sqft: sheet.total_area_sqft,
    area_display_unit: sheet.area_display_unit,
  };
  const newRows: NewSheetRow[] = rows.map((r) => ({
    serial: r.serial,
    piece_no: r.piece_no,
    length: r.length,
    width: r.width,
    height: r.height,
    quantity: r.quantity,
    unit: r.unit,
    area_sqft: r.area_sqft,
    remarks: r.remarks,
  }));
  return insertSheet(copy, newRows);
}

export async function exportAllData(businessId: string): Promise<{ sheets: Sheet[]; rows: SheetRow[]; business: Business | null }> {
  const [business, sheetsRes, rowsRes] = await Promise.all([
    fetchBusiness(businessId),
    supabase.from('sheets').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
    supabase.from('sheet_rows').select('*').eq('sheet.business_id', businessId),
  ]);
  if (sheetsRes.error) throw sheetsRes.error;
  if (rowsRes.error) throw rowsRes.error;
  return {
    business,
    sheets: (sheetsRes.data ?? []) as Sheet[],
    rows: (rowsRes.data ?? []) as SheetRow[],
  };
}

export interface ImportPayload {
  sheets: Sheet[];
  rows: SheetRow[];
  business?: Business | null;
}

export async function importData(payload: ImportPayload, targetBusinessId: string): Promise<{ sheets: number; rows: number }> {
  let sheetCount = 0;
  let rowCount = 0;

  if (payload.business) {
    const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = payload.business;
    void _id; void _ca; void _ua;
    await updateBusiness(targetBusinessId, rest);
  }

  for (const s of payload.sheets) {
    const { id, created_at, updated_at, business_id: _bid, ...rest } = s;
    void created_at; void updated_at; void _bid;
    const sheetRows = payload.rows.filter((r) => r.sheet_id === id);
    const { data: created, error } = await supabase
      .from('sheets')
      .insert({ ...rest, business_id: targetBusinessId })
      .select()
      .single();
    if (error) throw error;
    sheetCount++;

    if (sheetRows.length > 0) {
      const mapped = sheetRows.map((r) => {
        const { id: _rid, sheet_id: _sid, ...rrest } = r;
        void _rid; void _sid;
        return { ...rrest, sheet_id: created.id };
      });
      const { error: re } = await supabase.from('sheet_rows').insert(mapped);
      if (re) throw re;
      rowCount += mapped.length;
    }
  }

  return { sheets: sheetCount, rows: rowCount };
}