export type LengthUnit = 'feet' | 'inches' | 'metres' | 'centimetres' | 'millimetres';
export type MaterialType = 'Granite' | 'Block';
export type AreaUnit = 'sqft' | 'sqm';

export const METRES_PER_UNIT: Record<LengthUnit, number> = {
  feet: 0.3048,
  inches: 0.0254,
  metres: 1,
  centimetres: 0.01,
  millimetres: 0.001,
};

export const SQM_PER_AREA_UNIT: Record<AreaUnit, number> = {
  sqft: 10.7639104,
  sqm: 1,
};

export interface DimensionInput {
  length: number;
  width: number;
  height?: number;
  quantity: number;
  unit: LengthUnit;
}

export interface RowCalc {
  areaPerPiece: number;
  rowTotal: number;
  isVolume: boolean;
  isValid: boolean;
  error?: string;
}

export interface SheetTotals {
  totalQuantity: number;
  totalArea: number;
  validRows: number;
  invalidRows: number;
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

export function validateDimension(value: number, allowZero = true): boolean {
  if (!isFiniteNumber(value)) return false;
  if (value < 0) return false;
  if (!allowZero && value <= 0) return false;
  return true;
}

export function convertLength(value: number, from: LengthUnit, to: LengthUnit): number {
  const inMetres = value * METRES_PER_UNIT[from];
  return inMetres / METRES_PER_UNIT[to];
}

export function convertArea(value: number, from: AreaUnit, to: AreaUnit): number {
  const inSqm = value / SQM_PER_AREA_UNIT[from];
  return inSqm * SQM_PER_AREA_UNIT[to];
}

export function sqmToAreaUnit(sqm: number, areaUnit: AreaUnit): number {
  return sqm * SQM_PER_AREA_UNIT[areaUnit];
}

export function calculateRow(
  input: DimensionInput,
  material: MaterialType,
  areaUnit: AreaUnit,
): RowCalc {
  const { length, width, height = 0, quantity, unit } = input;

  if (!isFiniteNumber(length) || !isFiniteNumber(width) || !isFiniteNumber(quantity)) {
    return { areaPerPiece: 0, rowTotal: 0, isVolume: false, isValid: false, error: 'Invalid number' };
  }
  if (length < 0 || width < 0 || height < 0) {
    return { areaPerPiece: 0, rowTotal: 0, isVolume: false, isValid: false, error: 'Negative dimension' };
  }
  if (length === 0 || width === 0) {
    return { areaPerPiece: 0, rowTotal: 0, isVolume: false, isValid: false, error: 'Zero dimension' };
  }
  if (material === 'Block' && height === 0) {
    return { areaPerPiece: 0, rowTotal: 0, isVolume: true, isValid: false, error: 'Block requires height' };
  }
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
    return { areaPerPiece: 0, rowTotal: 0, isVolume: false, isValid: false, error: 'Invalid quantity' };
  }

  const lenM = length * METRES_PER_UNIT[unit];
  const widM = width * METRES_PER_UNIT[unit];
  const hgtM = (height || 0) * METRES_PER_UNIT[unit];

  if (material === 'Block') {
    const volM3 = lenM * widM * hgtM;
    const perPiece = volM3;
    return {
      areaPerPiece: perPiece,
      rowTotal: perPiece * quantity,
      isVolume: true,
      isValid: true,
    };
  }

  const areaM2 = lenM * widM;
  const perPiece = sqmToAreaUnit(areaM2, areaUnit);
  return {
    areaPerPiece: perPiece,
    rowTotal: perPiece * quantity,
    isVolume: false,
    isValid: true,
  };
}

export function calculateSheetTotals(
  rows: DimensionInput[],
  material: MaterialType,
  areaUnit: AreaUnit,
): SheetTotals {
  let totalArea = 0;
  let totalQuantity = 0;
  let validRows = 0;
  let invalidRows = 0;

  for (const row of rows) {
    const calc = calculateRow(row, material, areaUnit);
    if (calc.isValid) {
      totalArea += calc.rowTotal;
      totalQuantity += row.quantity;
      validRows += 1;
    } else {
      invalidRows += 1;
    }
  }

  return { totalArea, totalQuantity, validRows, invalidRows };
}

export function roundDisplay(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function formatNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '0';
  return value.toFixed(decimals);
}

export function feetInchesToDecimalFeet(feet: number, inches: number): number {
  return feet + inches / 12;
}