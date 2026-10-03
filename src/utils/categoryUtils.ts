import { Category, Subcategory, Brand, Product } from '../types/erp';
import { INITIAL_SUBCATEGORIES } from '../data/initialData';

/**
 * Standardize category ID strings to canonical format:
 * CAT-HAIR, CAT-SKIN, CAT-BODY, CAT-TREATMENT, CAT-SUPPLEMENTS, CAT-ACCESSORIES
 * Legacy IDs:
 * CAT-SOAP -> CAT-BODY
 * CAT-FACEWASH -> CAT-SKIN
 * CAT-HAIROIL -> CAT-HAIR
 * CAT-SUNSCREEN -> CAT-SKIN
 * CAT-HAIRCARE -> CAT-HAIR
 * CAT-SKINCARE -> CAT-SKIN
 */
export const normalizeCategoryId = (rawCatId: string | undefined): string => {
  if (!rawCatId) return 'CAT-HAIR';
  const trimmed = rawCatId.trim();
  const lower = trimmed.toLowerCase();

  if (trimmed === 'CAT-HAIR' || trimmed === 'CAT-HAIRCARE' || trimmed === 'CAT-HAIROIL' || lower === 'hair care' || lower === 'haircare' || lower === 'hair products' || lower === 'hair') {
    return 'CAT-HAIR';
  }
  if (trimmed === 'CAT-SKIN' || trimmed === 'CAT-SKINCARE' || trimmed === 'CAT-FACEWASH' || trimmed === 'CAT-SUNSCREEN' || lower === 'skin care' || lower === 'skincare' || lower === 'skin products' || lower === 'skin') {
    return 'CAT-SKIN';
  }
  if (trimmed === 'CAT-BODY' || trimmed === 'CAT-SOAP' || lower === 'body care' || lower === 'body' || lower === 'soap' || lower === 'soaps') {
    return 'CAT-BODY';
  }
  if (trimmed === 'CAT-TREATMENT' || trimmed === 'CAT-TRT' || lower.includes('treatment') || lower.includes('professional')) {
    return 'CAT-TREATMENT';
  }
  if (trimmed === 'CAT-SUPPLEMENTS' || trimmed === 'CAT-SUP' || lower.includes('supplement') || lower.includes('wellness')) {
    return 'CAT-SUPPLEMENTS';
  }
  if (trimmed === 'CAT-ACCESSORIES' || trimmed === 'CAT-ACC' || lower.includes('accessor')) {
    return 'CAT-ACCESSORIES';
  }

  return trimmed;
};

/**
 * Resolves a Category object for a given product or category identifier
 */
export const resolveCategory = (
  productOrCatId: Product | string | undefined,
  categories: Category[]
): Category | undefined => {
  if (!productOrCatId) {
    return categories.find(c => c.categoryId === 'CAT-HAIR') || categories[0];
  }

  let rawId: string | undefined;
  if (typeof productOrCatId === 'object' && productOrCatId !== null) {
    // 1. If the product has a subcategoryId that belongs to a specific parent category,
    // that subcategory relationship is authoritative (e.g. Face Wash or Sunscreen ALWAYS belongs to Skin Care)
    if (productOrCatId.subcategoryId) {
      const subMatch = INITIAL_SUBCATEGORIES.find(s => s.subcategoryId === productOrCatId.subcategoryId) ||
                       INITIAL_SUBCATEGORIES.find(s => s.subcategoryName.toLowerCase() === productOrCatId.subcategoryId!.toLowerCase());
      if (subMatch?.categoryId) {
        rawId = subMatch.categoryId;
      }
    }

    // 2. If no subcategory match, check stable SKU prefix
    if (!rawId) {
      if (productOrCatId.productCode?.startsWith('PRD-SKIN-') || productOrCatId.productCode?.startsWith('PRD-SKN-')) {
        rawId = 'CAT-SKIN';
      } else if (productOrCatId.productCode?.startsWith('PRD-HAIR-')) {
        rawId = 'CAT-HAIR';
      } else if (productOrCatId.productCode?.startsWith('PRD-BODY-')) {
        rawId = 'CAT-BODY';
      } else if (productOrCatId.productCode?.startsWith('PRD-TRT-')) {
        rawId = 'CAT-TREATMENT';
      } else if (productOrCatId.productCode?.startsWith('PRD-SUP-')) {
        rawId = 'CAT-SUPPLEMENTS';
      } else if (productOrCatId.productCode?.startsWith('PRD-ACC-')) {
        rawId = 'CAT-ACCESSORIES';
      }
    }

    // 3. Fall back to product's categoryId
    if (!rawId) {
      rawId = productOrCatId.categoryId;
    }
  } else {
    rawId = productOrCatId;
  }

  if (!rawId) return categories[0];

  const normalizedId = normalizeCategoryId(rawId);
  const rawLower = rawId.trim().toLowerCase();

  // 1. Direct match by exact categoryId
  let match = categories.find(c => c.categoryId === rawId);
  if (match) return match;

  // 2. Direct match by normalized categoryId
  match = categories.find(c => c.categoryId === normalizedId);
  if (match) return match;

  // 3. Case-insensitive categoryId match
  match = categories.find(c => c.categoryId.toLowerCase() === rawLower);
  if (match) return match;

  // 4. Match by categoryName (exact or case-insensitive)
  match = categories.find(c => c.categoryName.toLowerCase() === rawLower);
  if (match) return match;

  // 5. Match by categoryCode
  match = categories.find(c => c.categoryCode && c.categoryCode.toLowerCase() === rawLower);
  if (match) return match;

  return categories.find(c => c.categoryId === normalizedId) || categories[0];
};

/**
 * Resolves a Subcategory object
 */
export const resolveSubcategory = (
  subcategoryIdOrProduct: Product | string | undefined,
  subcategories: Subcategory[]
): Subcategory | undefined => {
  if (!subcategoryIdOrProduct) return undefined;

  const rawSubId = typeof subcategoryIdOrProduct === 'object' && subcategoryIdOrProduct !== null
    ? subcategoryIdOrProduct.subcategoryId
    : subcategoryIdOrProduct;

  if (!rawSubId) return undefined;

  const rawTrimmed = rawSubId.trim();
  const rawLower = rawTrimmed.toLowerCase();

  // 1. Exact match by subcategoryId
  let match = subcategories.find(s => s.subcategoryId === rawTrimmed);
  if (match) return match;

  // 2. Case-insensitive subcategoryId match
  match = subcategories.find(s => s.subcategoryId.toLowerCase() === rawLower);
  if (match) return match;

  // 3. Match by subcategoryCode
  match = subcategories.find(s => s.subcategoryCode.toLowerCase() === rawLower);
  if (match) return match;

  // 4. Match by subcategoryName
  match = subcategories.find(s => s.subcategoryName.toLowerCase() === rawLower);
  if (match) return match;

  return undefined;
};

/**
 * Filter subcategories belonging to a specific category
 */
export const getSubcategoriesForCategory = (
  categoryId: string | undefined,
  subcategories: Subcategory[]
): Subcategory[] => {
  if (!categoryId || categoryId === 'ALL') return subcategories;
  const canonicalCatId = normalizeCategoryId(categoryId);
  return subcategories.filter(s => s.categoryId === canonicalCatId || s.categoryId === categoryId);
};

/**
 * Get category display name safely
 */
export const getCategoryDisplayName = (
  productOrCatId: Product | string | undefined,
  categories: Category[]
): string => {
  const cat = resolveCategory(productOrCatId, categories);
  return cat?.categoryName || 'General';
};

/**
 * Get subcategory display name safely
 */
export const getSubcategoryDisplayName = (
  productOrSubcatId: Product | string | undefined,
  subcategories: Subcategory[]
): string => {
  const sub = resolveSubcategory(productOrSubcatId, subcategories);
  return sub?.subcategoryName || 'Standard';
};

/**
 * Check if a product matches a category filter
 */
export const isProductInCategory = (
  product: Product,
  selectedCategory: string,
  categories: Category[]
): boolean => {
  if (!selectedCategory || selectedCategory === 'ALL') return true;

  const filterCanonical = normalizeCategoryId(selectedCategory);
  const resolvedCategory = resolveCategory(product, categories);
  const prodCanonical = normalizeCategoryId(resolvedCategory?.categoryId || product.categoryId);

  if (prodCanonical === filterCanonical) return true;
  if (product.categoryId === selectedCategory) return true;

  // Legacy mappings
  if (filterCanonical === 'CAT-BODY' && product.categoryId === 'CAT-SOAP') return true;
  if (filterCanonical === 'CAT-SKIN' && (product.categoryId === 'CAT-FACEWASH' || product.categoryId === 'CAT-SUNSCREEN')) return true;
  if (filterCanonical === 'CAT-HAIR' && product.categoryId === 'CAT-HAIROIL') return true;

  return false;
};

/**
 * Check if a product matches a subcategory filter
 */
export const isProductInSubcategory = (
  product: Product,
  selectedSubcategory: string
): boolean => {
  if (!selectedSubcategory || selectedSubcategory === 'ALL') return true;
  return product.subcategoryId === selectedSubcategory;
};

/**
 * Resolves Brand name safely
 */
export const getBrandDisplayName = (
  product: Product,
  brands: Brand[]
): string => {
  if (product.brandName) return product.brandName;
  if (product.brandId) {
    const b = brands.find(brand => brand.brandId === product.brandId);
    if (b) return b.brandName;
  }
  return 'In-House';
};

/**
 * Prefix for short, stable SKUs based on Main Category
 * PRD-HAIR-001, PRD-SKIN-001, PRD-BODY-001, PRD-TRT-001, PRD-SUP-001, PRD-ACC-001
 */
export const getCategoryPrefix = (catId: string): string => {
  const normalized = normalizeCategoryId(catId);
  switch (normalized) {
    case 'CAT-HAIR': return 'PRD-HAIR';
    case 'CAT-SKIN': return 'PRD-SKIN';
    case 'CAT-BODY': return 'PRD-BODY';
    case 'CAT-TREATMENT': return 'PRD-TRT';
    case 'CAT-SUPPLEMENTS': return 'PRD-SUP';
    case 'CAT-ACCESSORIES': return 'PRD-ACC';
    default: {
      const clean = catId.replace(/^CAT-/, '').replace(/[^A-Z0-9]/g, '').slice(0, 4).toUpperCase();
      return clean ? `PRD-${clean}` : 'PRD-GEN';
    }
  }
};

export const generateNextProductCode = (catId: string, currentProducts: Product[]): string => {
  const prefix = getCategoryPrefix(catId);
  const matchingCodes = currentProducts
    .map(p => p.productCode || '')
    .filter(code => code.startsWith(prefix));

  let maxNum = 0;
  matchingCodes.forEach(code => {
    const parts = code.split('-');
    const lastPart = parts[parts.length - 1];
    const num = parseInt(lastPart, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  });

  return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
};

/**
 * Migration helper: ONLY used during initial data loading or repairing legacy records.
 * NEVER used during normal product creation.
 */
export const inferLegacyCategoryAndSubcategory = (
  prod: Partial<Product>
): { categoryId: string; subcategoryId: string } => {
  const code = (prod.productCode || '').toUpperCase();
  const name = (prod.productName || '').toLowerCase();
  const rawCat = prod.categoryId || '';

  // 1. Direct legacy mapping from raw category
  if (rawCat === 'CAT-SOAP') {
    return { categoryId: 'CAT-BODY', subcategoryId: 'SUB-BODY-SOAP' };
  }
  if (rawCat === 'CAT-FACEWASH') {
    return { categoryId: 'CAT-SKIN', subcategoryId: 'SUB-SKIN-FACEWASH' };
  }
  if (rawCat === 'CAT-HAIROIL') {
    return { categoryId: 'CAT-HAIR', subcategoryId: 'SUB-HAIR-OIL' };
  }
  if (rawCat === 'CAT-SUNSCREEN') {
    return { categoryId: 'CAT-SKIN', subcategoryId: 'SUB-SKIN-SUNSCREEN' };
  }

  // 2. Hair care
  if (rawCat === 'CAT-HAIR' || code.startsWith('PRD-HAIR') || code.startsWith('PRD-OIL')) {
    if (name.includes('shampoo') || name.includes('wash') || name.includes('scalp solution')) {
      return { categoryId: 'CAT-HAIR', subcategoryId: 'SUB-HAIR-SHAMPOO' };
    }
    if (name.includes('oil') || code.includes('OIL')) {
      return { categoryId: 'CAT-HAIR', subcategoryId: 'SUB-HAIR-OIL' };
    }
    if (name.includes('serum') || name.includes('regrowth')) {
      return { categoryId: 'CAT-HAIR', subcategoryId: 'SUB-HAIR-SERUM' };
    }
    if (name.includes('conditioner')) {
      return { categoryId: 'CAT-HAIR', subcategoryId: 'SUB-HAIR-CONDITIONER' };
    }
    if (name.includes('mask')) {
      return { categoryId: 'CAT-HAIR', subcategoryId: 'SUB-HAIR-MASK' };
    }
    if (name.includes('mist') || name.includes('minoxidil') || name.includes('treatment')) {
      return { categoryId: 'CAT-HAIR', subcategoryId: 'SUB-HAIR-TREATMENT' };
    }
    if (name.includes('color') || name.includes('colour') || name.includes('dye')) {
      return { categoryId: 'CAT-HAIR', subcategoryId: 'SUB-HAIR-COLOR' };
    }
    if (name.includes('drop') || name.includes('gloss') || name.includes('wax')) {
      return { categoryId: 'CAT-HAIR', subcategoryId: 'SUB-HAIR-STYLING' };
    }
    return { categoryId: 'CAT-HAIR', subcategoryId: 'SUB-HAIR-OTHER' };
  }

  // 3. Body Care
  if (rawCat === 'CAT-BODY' || code.startsWith('PRD-SOP') || code.startsWith('PRD-BODY') || name.includes('soap') || name.includes('bar') || name.includes('syndet')) {
    return { categoryId: 'CAT-BODY', subcategoryId: 'SUB-BODY-SOAP' };
  }

  // 4. Treatment
  if (rawCat === 'CAT-TREATMENT' || code.startsWith('PRD-TRT') || name.includes('peel') || name.includes('clinic-use')) {
    return { categoryId: 'CAT-TREATMENT', subcategoryId: 'SUB-TRT-SKIN' };
  }

  // 5. Supplements
  if (rawCat === 'CAT-SUPPLEMENTS' || code.startsWith('PRD-SUP') || name.includes('capsule') || name.includes('tablet') || name.includes('biotin 10mg')) {
    return { categoryId: 'CAT-SUPPLEMENTS', subcategoryId: 'SUB-SUP-HAIR' };
  }

  // 6. Accessories
  if (rawCat === 'CAT-ACCESSORIES' || code.startsWith('PRD-ACC') || name.includes('comb') || name.includes('brush')) {
    return { categoryId: 'CAT-ACCESSORIES', subcategoryId: 'SUB-ACC-COMBS' };
  }

  // 7. Skin Care defaults
  if (name.includes('sunscreen') || name.includes('spf') || code.includes('SUN')) {
    return { categoryId: 'CAT-SKIN', subcategoryId: 'SUB-SKIN-SUNSCREEN' };
  }
  if (name.includes('facewash') || name.includes('face wash') || name.includes('cleanser') || code.includes('FCW')) {
    return { categoryId: 'CAT-SKIN', subcategoryId: 'SUB-SKIN-FACEWASH' };
  }
  if (name.includes('serum') || name.includes('niacinamide') || name.includes('hyaluronic') || name.includes('vitamin c')) {
    return { categoryId: 'CAT-SKIN', subcategoryId: 'SUB-SKIN-FACESERUM' };
  }
  if (name.includes('cream') || name.includes('ceramide') || name.includes('barrier')) {
    return { categoryId: 'CAT-SKIN', subcategoryId: 'SUB-SKIN-FACECREAM' };
  }

  return { categoryId: 'CAT-SKIN', subcategoryId: 'SUB-SKIN-OTHER' };
};
