import * as XLSX from 'xlsx';
import { Product, Category } from '../types/erp';

export interface ParsedExcelRow {
  rowIndex: number;
  rawProductCode: string;
  rawProductName: string;
  rawCategory: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  expiryDate: string;
  batchNumber?: string;
  locationCode?: string;
  matchedProduct: Product | null;
  status: 'VALID' | 'UNMATCHED_PRODUCT' | 'INVALID_QTY' | 'INVALID_DATE';
  message: string;
}

export interface ParsedOpeningStockResult {
  fileName: string;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  totalUnits: number;
  totalCostValuation: number;
  totalSellValuation: number;
  rows: ParsedExcelRow[];
}

/**
 * Downloads a pre-filled Excel (.xlsx) Template containing all active clinic products
 * with pre-populated codes, categories, cost prices, selling prices, and default expiry.
 */
export function downloadOpeningStockExcelTemplate(
  products: Product[],
  categories: Category[],
  targetBranchCode: string = 'HOS'
): void {
  // 1. Prepare Data Rows
  const rows = products
    .filter(p => p.isActive !== false)
    .map(p => {
      const cat = categories.find(c => c.categoryId === p.categoryId);
      return {
        'Product Code': p.productCode,
        'Product Name': p.productName,
        'Category': cat?.categoryName || 'General',
        'Opening Quantity': 0, // User fills this
        'Cost Price (₹)': p.costPrice || 0,
        'Selling Price (₹)': p.sellingPrice || Math.round((p.costPrice || 100) * 1.5),
        'Expiry Date (YYYY-MM-DD)': '2028-12-31',
        'Batch Number (Optional)': '', // Leave blank to auto-assign common batch
        'Branch Code': targetBranchCode
      };
    });

  // 2. Prepare Guidelines Sheet
  const instructions = [
    { 'Rule / Field': 'Product Code', 'Requirement & Format': 'Exact SKU Code (e.g. PRD-HAIR-001). Pre-filled for your convenience.' },
    { 'Rule / Field': 'Product Name', 'Requirement & Format': 'Official name of the formulation or retail SKU.' },
    { 'Rule / Field': 'Opening Quantity', 'Requirement & Format': 'Mandatory positive integer (e.g. 50). Do NOT leave as 0 if stocking.' },
    { 'Rule / Field': 'Cost Price (₹)', 'Requirement & Format': 'Purchase cost per unit before tax or landed cost.' },
    { 'Rule / Field': 'Selling Price (₹)', 'Requirement & Format': 'Active POS & Online Store retail rate for this batch.' },
    { 'Rule / Field': 'Expiry Date', 'Requirement & Format': 'Format: YYYY-MM-DD (e.g. 2028-12-31). Must be in the future.' },
    { 'Rule / Field': 'Batch Number', 'Requirement & Format': 'Optional. If left blank, the system automatically assigns the common opening batch (e.g. OPEN-HOS-0004).' },
    { 'Rule / Field': 'Branch Code', 'Requirement & Format': 'HOS for Hospete Clinic, HUB for Hubballi Clinic.' }
  ];

  const workbook = XLSX.utils.book_new();

  // Create Worksheets
  const wsData = XLSX.utils.json_to_sheet(rows);
  const wsInstructions = XLSX.utils.json_to_sheet(instructions);

  // Set column widths for comfortable reading
  wsData['!cols'] = [
    { wch: 18 }, // Product Code
    { wch: 42 }, // Product Name
    { wch: 22 }, // Category
    { wch: 18 }, // Opening Quantity
    { wch: 16 }, // Cost Price
    { wch: 16 }, // Selling Price
    { wch: 24 }, // Expiry Date
    { wch: 24 }, // Batch Number
    { wch: 14 }  // Branch Code
  ];

  wsInstructions['!cols'] = [
    { wch: 22 },
    { wch: 80 }
  ];

  XLSX.utils.book_append_sheet(workbook, wsData, 'Opening_Stock_Entry');
  XLSX.utils.book_append_sheet(workbook, wsInstructions, 'Instructions');

  // Trigger browser download
  XLSX.writeFile(workbook, `ClinicRX_Opening_Stock_Template_${targetBranchCode}.xlsx`);
}

/**
 * Downloads a lightweight CSV Template for simple spreadsheet editors
 */
export function downloadOpeningStockCSVTemplate(
  products: Product[],
  targetBranchCode: string = 'HOS'
): void {
  const headers = [
    'Product Code',
    'Product Name',
    'Opening Quantity',
    'Cost Price (INR)',
    'Selling Price (INR)',
    'Expiry Date (YYYY-MM-DD)',
    'Batch Number (Optional)',
    'Branch Code'
  ];

  const rows = products
    .filter(p => p.isActive !== false)
    .map(p => [
      `"${p.productCode}"`,
      `"${p.productName.replace(/"/g, '""')}"`,
      '0',
      `${p.costPrice || 0}`,
      `${p.sellingPrice || Math.round((p.costPrice || 100) * 1.5)}`,
      '2028-12-31',
      '""',
      `"${targetBranchCode}"`
    ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `ClinicRX_Opening_Stock_Template_${targetBranchCode}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Intelligent Column Finder
 * Detects headers regardless of capitalization, punctuation, or variations
 */
function findColumnKey(row: Record<string, any>, candidates: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const directMatch = keys.find(k => k.trim().toLowerCase() === candidate.toLowerCase());
    if (directMatch) return directMatch;
  }
  for (const candidate of candidates) {
    const partialMatch = keys.find(k => k.trim().toLowerCase().includes(candidate.toLowerCase()));
    if (partialMatch) return partialMatch;
  }
  return undefined;
}

/**
 * Parses an uploaded Excel (.xlsx, .xls) or CSV (.csv) file
 * and validates every row against the clinic product catalog.
 */
export async function parseOpeningStockExcelFile(
  file: File,
  products: Product[]
): Promise<ParsedOpeningStockResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });

  // Use the first sheet or the sheet named 'Opening_Stock_Entry'
  const sheetName = workbook.SheetNames.includes('Opening_Stock_Entry') 
    ? 'Opening_Stock_Entry' 
    : workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error('No valid worksheet found in the uploaded workbook.');
  }

  // Convert to JSON objects
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rawRows.length === 0) {
    throw new Error('The uploaded file is empty. Please ensure rows exist below the header row.');
  }

  const parsedRows: ParsedExcelRow[] = [];
  let totalUnits = 0;
  let totalCostValuation = 0;
  let totalSellValuation = 0;
  let validCount = 0;
  let invalidCount = 0;

  // Clean lookup index for fast SKU and name matching
  const productByCode = new Map<string, Product>();
  const productByName = new Map<string, Product>();

  products.forEach(p => {
    if (p.productCode) productByCode.set(p.productCode.trim().toLowerCase(), p);
    if (p.productName) productByName.set(p.productName.trim().toLowerCase(), p);
  });

  rawRows.forEach((row, idx) => {
    // 1. Column Resolution
    const codeKey = findColumnKey(row, ['product code', 'productcode', 'code', 'sku', 'barcode', 'item code']);
    const nameKey = findColumnKey(row, ['product name', 'productname', 'name', 'product', 'item', 'description']);
    const categoryKey = findColumnKey(row, ['category', 'category name', 'cat']);
    const qtyKey = findColumnKey(row, ['opening quantity', 'quantity', 'qty', 'units', 'stock', 'opening stock', 'count']);
    const costKey = findColumnKey(row, ['cost price', 'cost', 'purchase price', 'purchase rate', 'cp', 'costprice']);
    const sellKey = findColumnKey(row, ['selling price', 'selling', 'mrp', 'sale price', 'sp', 'sellingprice', 'rate']);
    const expKey = findColumnKey(row, ['expiry date', 'expiry', 'exp date', 'expdate', 'expiration', 'validity']);
    const batchKey = findColumnKey(row, ['batch number', 'batch', 'batch no', 'batchno', 'lot']);
    const locKey = findColumnKey(row, ['branch code', 'location', 'branch', 'clinic', 'location code']);

    const rawProductCode = String(codeKey ? row[codeKey] : '').trim();
    const rawProductName = String(nameKey ? row[nameKey] : '').trim();
    const rawCategory = String(categoryKey ? row[categoryKey] : '').trim();
    const rawBatchNumber = String(batchKey ? row[batchKey] : '').trim();
    const rawLocationCode = String(locKey ? row[locKey] : '').trim();

    // 2. Numeric parsing
    const rawQtyVal = qtyKey ? row[qtyKey] : 0;
    const quantity = parseInt(String(rawQtyVal).replace(/[^\d.-]/g, ''), 10) || 0;

    // Date formatting (handle JS Date object from XLSX or string)
    let expiryDate = '2028-12-31';
    if (expKey && row[expKey]) {
      const expVal = row[expKey];
      if (expVal instanceof Date) {
        expiryDate = expVal.toISOString().split('T')[0];
      } else {
        const strVal = String(expVal).trim();
        // Match YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
        if (/^\d{4}-\d{2}-\d{2}$/.test(strVal)) {
          expiryDate = strVal;
        } else if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(strVal)) {
          const parts = strVal.split(/[-/]/);
          expiryDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
    }

    // 3. Product Catalog Matching
    let matched: Product | null = null;
    if (rawProductCode) {
      matched = productByCode.get(rawProductCode.toLowerCase()) || null;
    }
    if (!matched && rawProductName) {
      matched = productByName.get(rawProductName.toLowerCase()) || null;
      if (!matched) {
        // Substring / fuzzy match
        const pLower = rawProductName.toLowerCase();
        matched = products.find(p => 
          p.productName.toLowerCase().includes(pLower) || 
          pLower.includes(p.productName.toLowerCase())
        ) || null;
      }
    }

    // Resolve prices (fallback to catalog defaults if empty or 0)
    const costPrice = (costKey && !isNaN(parseFloat(String(row[costKey]))))
      ? parseFloat(String(row[costKey]))
      : (matched?.costPrice || 0);

    const sellingPrice = (sellKey && !isNaN(parseFloat(String(row[sellKey]))))
      ? parseFloat(String(row[sellKey]))
      : (matched?.sellingPrice || Math.round(costPrice * 1.5));

    // 4. Validation & Status assignment
    let status: ParsedExcelRow['status'] = 'VALID';
    let message = 'Ready to inward';

    if (!matched) {
      status = 'UNMATCHED_PRODUCT';
      message = `Product "${rawProductCode || rawProductName}" not found in catalog.`;
      invalidCount++;
    } else if (quantity <= 0) {
      status = 'INVALID_QTY';
      message = 'Opening quantity must be greater than zero.';
      invalidCount++;
    } else {
      validCount++;
      totalUnits += quantity;
      totalCostValuation += quantity * costPrice;
      totalSellValuation += quantity * sellingPrice;
    }

    parsedRows.push({
      rowIndex: idx + 2, // 1-indexed, skipping header row
      rawProductCode,
      rawProductName: rawProductName || matched?.productName || 'Unknown Product',
      rawCategory,
      quantity,
      costPrice,
      sellingPrice,
      expiryDate,
      batchNumber: rawBatchNumber,
      locationCode: rawLocationCode,
      matchedProduct: matched,
      status,
      message
    });
  });

  return {
    fileName: file.name,
    totalRows: rawRows.length,
    validCount,
    invalidCount,
    totalUnits,
    totalCostValuation,
    totalSellValuation,
    rows: parsedRows
  };
}
