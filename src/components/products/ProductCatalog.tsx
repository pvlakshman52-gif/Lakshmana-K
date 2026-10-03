import React, { useState, useMemo, useRef } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Product, ProductType, Category } from '../../types/erp';
import { ProductIcon } from '../common/ProductIcon';
import { ProductImageHoverPreview } from '../common/ProductImageHoverPreview';
import { 
  Plus, 
  Search, 
  Edit2, 
  AlertCircle, 
  CheckCircle, 
  Package, 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  X, 
  Check, 
  CheckCircle2, 
  Layers, 
  Sparkles,
  Lock,
  MapPin,
  History,
  RotateCw,
  FileText,
  FolderPlus,
  Building2,
  FileCheck2,
  FolderTree,
  ListTree
} from 'lucide-react';
import { PriceHistoryModal } from './PriceHistoryModal';
import { OpeningStockModal } from '../inventory/OpeningStockModal';
import { CategoryManagementModal } from './CategoryManagementModal';
import { BrandManagementModal } from './BrandManagementModal';
import { ProductClassificationModal } from './ProductClassificationModal';
import {
  resolveCategory,
  resolveSubcategory,
  getCategoryDisplayName,
  isProductInCategory,
  normalizeCategoryId,
  inferLegacyCategoryAndSubcategory
} from '../../utils/categoryUtils';
import { INITIAL_CATEGORIES, INITIAL_SUBCATEGORIES } from '../../data/initialData';

const CLINICAL_PRESETS = [
  { 
    name: 'Serum Bottle', 
    front: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80',
    back: 'https://images.unsplash.com/photo-1608248597359-bb43e26461a2?auto=format&fit=crop&w=600&q=80'
  },
  { 
    name: 'Cream Jar', 
    front: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80',
    back: 'https://images.unsplash.com/photo-1556228722-d0b5de70b774?auto=format&fit=crop&w=600&q=80'
  },
  { 
    name: 'Sunscreen Tube', 
    front: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=600&q=80',
    back: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80'
  },
  { 
    name: 'Scalp Hair Oil', 
    front: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=600&q=80',
    back: 'https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=600&q=80'
  },
  { 
    name: 'Syndet Soap', 
    front: 'https://images.unsplash.com/photo-1607006314644-b2585f672c84?auto=format&fit=crop&w=600&q=80',
    back: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=600&q=80'
  }
];

const getCategoryPrefix = (catId: string): string => {
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

const generateNextProductCode = (catId: string, currentProducts: Product[]): string => {
  const prefix = getCategoryPrefix(catId);
  const matchingCodes = currentProducts
    .map(p => p.productCode)
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

  const nextNum = maxNum + 1;
  return `${prefix}-${String(nextNum).padStart(3, '0')}`;
};

const CLINICAL_PRODUCT_TEMPLATES = [
  {
    name: 'Minoxidil 5% + Finasteride 0.1% Scalp Solution',
    categoryId: 'CAT-HAIR',
    volumeSize: '60ml Dropper',
    costPrice: 420,
    sellingPrice: 890,
    description: 'Targeted hair follicle stimulant for androgenetic alopecia.'
  },
  {
    name: 'Biotin & Keratin Intensive Hair Rescue Mask',
    categoryId: 'CAT-HAIR',
    volumeSize: '200g Tub',
    costPrice: 280,
    sellingPrice: 650,
    description: 'Deep conditioning protein treatment for brittle hair shafts.'
  },
  {
    name: 'Niacinamide 10% + Zinc 1% Clarifying Serum',
    categoryId: 'CAT-SKIN',
    volumeSize: '30ml Dropper',
    costPrice: 210,
    sellingPrice: 499,
    description: 'Sebum control and redness reduction barrier booster.'
  },
  {
    name: 'Retinol 0.5% in Squalane Cellular Repair Night Elixir',
    categoryId: 'CAT-SKIN',
    volumeSize: '30ml Dropper',
    costPrice: 340,
    sellingPrice: 780,
    description: 'Cell turnover accelerator for fine lines and post-acne marks.'
  },
  {
    name: 'Ceramide NP + Oat Extract Deep Barrier Cream',
    categoryId: 'CAT-SKIN',
    volumeSize: '100g Tube',
    costPrice: 260,
    sellingPrice: 580,
    description: 'Intense lipid restoration for irritated and peeling skin.'
  },
  {
    name: 'Kojic Acid 2% + Glutathione Skin Brightening Bar',
    categoryId: 'CAT-SOAP',
    volumeSize: '100g Bar',
    costPrice: 90,
    sellingPrice: 220,
    description: 'Syndet cleansing bar targeting melasma and hyperpigmentation.'
  },
  {
    name: 'Chlorhexidine 1% + Tea Tree Antiseptic Bath Cake',
    categoryId: 'CAT-BODY',
    volumeSize: '100g Bar',
    costPrice: 85,
    sellingPrice: 195,
    description: 'Antibacterial cleansing syndet for folliculitis prevention.'
  },
  {
    name: 'Mandelic Acid 5% Ultra-Gentle Foaming Face Wash',
    categoryId: 'CAT-SKIN',
    volumeSize: '150ml Pump',
    costPrice: 190,
    sellingPrice: 430,
    description: 'Micro-exfoliating cleanser for hyperpigmentation and sensitive skin.'
  },
  {
    name: 'Centella Asiatica Soothing Gel Cleanser',
    categoryId: 'CAT-SKIN',
    volumeSize: '150ml Pump',
    costPrice: 170,
    sellingPrice: 380,
    description: 'Calming daily gentle wash for inflamed or post-laser skin.'
  },
  {
    name: 'Almond & Rosemary Root Densifying Hair Oil',
    categoryId: 'CAT-HAIR',
    volumeSize: '100ml Glass',
    costPrice: 240,
    sellingPrice: 490,
    description: 'Cold-pressed carrier oil with therapeutic rosemary extract.'
  },
  {
    name: 'Invisible Matte Mineral Sunscreen Gel SPF 50+ PA++++',
    categoryId: 'CAT-SKIN',
    volumeSize: '50g Tube',
    costPrice: 330,
    sellingPrice: 720,
    description: 'Non-greasy, non-comedogenic broad spectrum clinical sunscreen.'
  }
];

export const ProductCatalog: React.FC = () => {
  const { 
    products, 
    categories, 
    subcategories,
    brands,
    batches, 
    locations, 
    selectedLocationId, 
    priceHistory,
    batchPricingMode,
    getProductPriceResolution,
    generateNextOpeningBatchNumber,
    addProduct, 
    updateProduct, 
    deleteProduct, 
    updateStockBatch, 
    addStockBatch 
  } = useClinic();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOpeningStockOpen, setIsOpeningStockOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isPriceHistoryOpen, setIsPriceHistoryOpen] = useState(false);
  const [priceHistoryProdId, setPriceHistoryProdId] = useState<string | undefined>(undefined);
  const [priceChangeReason, setPriceChangeReason] = useState<string>('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isClassificationModalOpen, setIsClassificationModalOpen] = useState(false);

  // Form states
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState('CAT-HAIR');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [brandId, setBrandId] = useState('BRD-DERMACLINIX');
  const [productType, setProductType] = useState<ProductType>('Retail Product');
  const [hsnCode, setHsnCode] = useState('33059011');
  const [gstRate, setGstRate] = useState<number>(18);
  const [costPrice, setCostPrice] = useState(250);
  const [sellingPrice, setSellingPrice] = useState(500);
  const [reorderLevel, setReorderLevel] = useState(15);
  const [volumeSize, setVolumeSize] = useState('100ml');
  const [description, setDescription] = useState('');
  const [imagePath, setImagePath] = useState<string>('');
  const [backImagePath, setBackImagePath] = useState<string>('');
  const [ingredients, setIngredients] = useState<string>('');
  const [directions, setDirections] = useState<string>('');
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [activeImageTab, setActiveImageTab] = useState<'front' | 'back'>('front');
  const [formValidationError, setFormValidationError] = useState<string | null>(null);

  // Initial stock for new product SKU
  const [openingQuantity, setOpeningQuantity] = useState<number>(20);
  const [openingLocationId, setOpeningLocationId] = useState<string>('LOC-HOS');
  const [openingBatchNumber, setOpeningBatchNumber] = useState<string>('');
  const [openingExpiryDate, setOpeningExpiryDate] = useState<string>('2028-12-31');

  // Product template selection
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number>(-1);

  // Direct Stock editing for existing product SKU
  const [editStockLocationId, setEditStockLocationId] = useState<string>('LOC-HOS');
  const [editStockQuantity, setEditStockQuantity] = useState<number>(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [onlyLocationProducts, setOnlyLocationProducts] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backFileInputRef = useRef<HTMLInputElement>(null);

  // Calculate live stock across locations
  const stockByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    batches.forEach(b => {
      if (b && b.productId && (selectedLocationId === 'ALL' || b.locationId === selectedLocationId)) {
        map[b.productId] = (map[b.productId] || 0) + (b.currentQuantity || 0);
      }
    });
    return map;
  }, [batches, selectedLocationId]);

  // Set of product IDs assigned or stocked in the selected location
  const locationProductIds = useMemo(() => {
    if (selectedLocationId === 'ALL') return null;
    const ids = new Set<string>();
    batches.forEach(b => {
      if (b && b.productId && b.locationId === selectedLocationId) {
        ids.add(b.productId);
      }
    });
    return ids;
  }, [batches, selectedLocationId]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // When a specific location is selected (e.g. Hubballi or Hospete), show only location-wise products
      if (selectedLocationId !== 'ALL' && onlyLocationProducts && locationProductIds) {
        if (!locationProductIds.has(p.productId)) return false;
      }
      if (selectedCategory !== 'ALL') {
        if (!isProductInCategory(p, selectedCategory, categories)) return false;
      }
      if (selectedSubcategory !== 'ALL') {
        if (p.subcategoryId !== selectedSubcategory) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.productName.toLowerCase().includes(q) ||
          p.productCode.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.brandName || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, selectedCategory, selectedSubcategory, searchQuery, selectedLocationId, onlyLocationProducts, locationProductIds, categories]);

  const openNewModal = () => {
    const defaultLoc = selectedLocationId === 'ALL' ? 'LOC-HOS' : selectedLocationId;
    const initialCat = selectedCategory !== 'ALL' ? normalizeCategoryId(selectedCategory) : (categories[0]?.categoryId || 'CAT-HAIR');
    const autoCode = generateNextProductCode(initialCat, products);
    const validSubs = subcategories.filter(s => s.categoryId === initialCat && s.isActive !== false);
    const initialSub = (selectedSubcategory !== 'ALL' && validSubs.some(s => s.subcategoryId === selectedSubcategory))
      ? selectedSubcategory
      : (validSubs[0]?.subcategoryId || '');

    setEditingProduct(null);
    setSelectedTemplateIndex(-1);
    setProductCode(autoCode);
    setProductName('');
    setCategoryId(initialCat);
    setSubcategoryId(initialSub);
    setBrandId(brands[0]?.brandId || 'BRD-DERMACLINIX');
    setProductType('Retail Product');
    setHsnCode('33059011');
    setGstRate(18);
    setCostPrice(250);
    setSellingPrice(500);
    setReorderLevel(15);
    setVolumeSize('100ml');
    setDescription('');
    setImagePath('');
    setBackImagePath('');
    setIngredients('');
    setDirections('');
    setActiveImageTab('front');
    setShowImageUploader(true); // Always show upload option for new products
    setFormValidationError(null);

    setOpeningQuantity(25);
    setOpeningLocationId(defaultLoc);
    setOpeningBatchNumber(generateNextOpeningBatchNumber(defaultLoc));
    setOpeningExpiryDate('2028-12-31');

    setShowDeleteConfirm(false);
    setIsModalOpen(true);
  };

  const handleTemplateSelect = (idx: number) => {
    setSelectedTemplateIndex(idx);
    if (idx === -1) {
      const code = generateNextProductCode(categoryId, products);
      setProductCode(code);
      return;
    }
    const t = CLINICAL_PRODUCT_TEMPLATES[idx];
    if (t) {
      setProductName(t.name);
      const targetCat = normalizeCategoryId(t.categoryId);
      setCategoryId(targetCat);
      const validSubs = subcategories.filter(s => s.categoryId === targetCat && s.isActive !== false);
      if (validSubs.length > 0) {
        setSubcategoryId(validSubs[0].subcategoryId);
      }
      setVolumeSize(t.volumeSize);
      setCostPrice(t.costPrice);
      setSellingPrice(t.sellingPrice);
      setDescription(t.description);
      // Automatically generate sequential product code based on product selection
      const nextCode = generateNextProductCode(targetCat, products);
      setProductCode(nextCode);

      // Auto-populate matching clinical preset front and back images
      const matchingPreset = CLINICAL_PRESETS.find(p => p.name.toLowerCase().includes('bottle') && t.volumeSize.includes('Dropper'))
        || CLINICAL_PRESETS[idx % CLINICAL_PRESETS.length];
      if (matchingPreset) {
        setImagePath(matchingPreset.front);
        setBackImagePath(matchingPreset.back);
      }
    }
  };

  // Canonical distinct categories for the modal dropdown (guarantees no duplicate Hair Care or unnormalized IDs)
  const modalCategories = useMemo(() => {
    const map = new Map<string, Category>();

    // 1. Add canonical standard categories first in guaranteed order
    INITIAL_CATEGORIES.forEach(c => {
      map.set(c.categoryId, c);
    });

    // 2. Add or update with categories from context
    categories.forEach(c => {
      const canonicalId = normalizeCategoryId(c.categoryId);
      if (map.has(canonicalId)) {
        const existing = map.get(canonicalId)!;
        map.set(canonicalId, {
          ...existing,
          isActive: c.isActive !== false
        });
      } else {
        map.set(canonicalId, {
          ...c,
          categoryId: canonicalId
        });
      }
    });

    return Array.from(map.values()).filter(c => c.isActive !== false || c.categoryId === categoryId);
  }, [categories, categoryId]);

  // Memoized available subcategories for current modal categoryId (User fix: ensure subcategory ALWAYS shows in edit modal)
  const modalSubcategories = useMemo(() => {
    const targetCat = normalizeCategoryId(categoryId);
    const allSubs = subcategories && subcategories.length > 0 ? subcategories : INITIAL_SUBCATEGORIES;

    let filtered = allSubs.filter(s => {
      const sCatNorm = normalizeCategoryId(s.categoryId);
      const isCatMatch = sCatNorm === targetCat || s.categoryId === categoryId || s.categoryId === targetCat;
      const isCurrentSelected = Boolean(subcategoryId && s.subcategoryId === subcategoryId);
      return isCatMatch && (s.isActive !== false || isCurrentSelected);
    });

    // Fallback to INITIAL_SUBCATEGORIES if state is empty or missing items for this category
    if (filtered.length === 0) {
      filtered = INITIAL_SUBCATEGORIES.filter(s => {
        const sCatNorm = normalizeCategoryId(s.categoryId);
        return sCatNorm === targetCat || s.categoryId === categoryId || s.categoryId === targetCat;
      });
    }

    // Fallback general option if a custom category has no subcategories created yet
    if (filtered.length === 0) {
      const catObj = categories.find(c => c.categoryId === categoryId || normalizeCategoryId(c.categoryId) === targetCat);
      const catName = catObj?.categoryName || 'General';
      filtered = [
        {
          subcategoryId: `SUB-${targetCat.replace(/^CAT-/, '')}-GEN`,
          subcategoryCode: 'GEN',
          categoryId: categoryId,
          subcategoryName: `General ${catName}`,
          description: `Standard ${catName} formulations`,
          isActive: true,
          createdDate: new Date().toISOString()
        }
      ];
    }

    // If product has a subcategoryId assigned that wasn't in filtered, include it so it displays selected!
    if (subcategoryId && !filtered.some(s => s.subcategoryId === subcategoryId)) {
      const existingSub = allSubs.find(s => s.subcategoryId === subcategoryId) ||
                          INITIAL_SUBCATEGORIES.find(s => s.subcategoryId === subcategoryId);
      if (existingSub) {
        filtered = [existingSub, ...filtered];
      } else {
        filtered = [
          {
            subcategoryId: subcategoryId,
            subcategoryCode: 'SUB',
            categoryId: categoryId,
            subcategoryName: subcategoryId,
            isActive: true,
            createdDate: new Date().toISOString()
          },
          ...filtered
        ];
      }
    }

    return filtered;
  }, [categoryId, subcategories, subcategoryId, categories]);

  const handleCategoryChange = (newCatId: string) => {
    const normalized = normalizeCategoryId(newCatId);
    setCategoryId(normalized);
    const allSubs = subcategories && subcategories.length > 0 ? subcategories : INITIAL_SUBCATEGORIES;
    const matchingSubs = allSubs.filter(s => {
      const sCatNorm = normalizeCategoryId(s.categoryId);
      return (sCatNorm === normalized || s.categoryId === normalized || s.categoryId === newCatId) && 
        s.isActive !== false;
    });

    // If current subcategory already belongs to this newly selected category, keep it!
    const currentBelongs = matchingSubs.some(s => s.subcategoryId === subcategoryId);
    if (!currentBelongs) {
      if (matchingSubs.length > 0) {
        setSubcategoryId(matchingSubs[0].subcategoryId);
      } else {
        const fallbackSubs = INITIAL_SUBCATEGORIES.filter(s => normalizeCategoryId(s.categoryId) === normalized);
        if (fallbackSubs.length > 0) {
          setSubcategoryId(fallbackSubs[0].subcategoryId);
        } else {
          setSubcategoryId('');
        }
      }
    }

    if (!editingProduct) {
      // Automatically regenerate code based on newly selected product category
      const nextCode = generateNextProductCode(normalized, products);
      setProductCode(nextCode);
    }
  };

  // Synchronize category automatically when user selects a subcategory
  const handleSubcategoryChange = (newSubId: string) => {
    setSubcategoryId(newSubId);
    if (!newSubId) return;

    const allSubs = subcategories && subcategories.length > 0 ? subcategories : INITIAL_SUBCATEGORIES;
    const subMatch = allSubs.find(s => s.subcategoryId === newSubId);
    if (subMatch?.categoryId) {
      const parentCat = normalizeCategoryId(subMatch.categoryId);
      if (parentCat && parentCat !== categoryId) {
        setCategoryId(parentCat);
        if (!editingProduct) {
          const nextCode = generateNextProductCode(parentCat, products);
          setProductCode(nextCode);
        }
      }
    }
  };

  const openEditModal = (p: Product) => {
    const defaultLoc = selectedLocationId === 'ALL' ? 'LOC-HOS' : selectedLocationId;
    const curStock = batches
      .filter(b => b.productId === p.productId && b.locationId === defaultLoc)
      .reduce((sum, b) => sum + b.currentQuantity, 0);

    const resolvedCat = normalizeCategoryId(p.categoryId);
    const allSubs = subcategories && subcategories.length > 0 ? subcategories : INITIAL_SUBCATEGORIES;

    // Intelligently resolve the subcategory for this product so it ALWAYS shows in the editing screen!
    let targetSubId = '';

    // 1. Direct match by subcategoryId in context or initial data
    if (p.subcategoryId) {
      const match = allSubs.find(s => s.subcategoryId === p.subcategoryId) ||
                    INITIAL_SUBCATEGORIES.find(s => s.subcategoryId === p.subcategoryId);
      if (match) {
        targetSubId = match.subcategoryId;
      } else {
        // Try matching by subcategoryName or subcategoryCode
        const matchByName = allSubs.find(s => 
          s.subcategoryName.toLowerCase() === p.subcategoryId!.toLowerCase() ||
          s.subcategoryCode.toLowerCase() === p.subcategoryId!.toLowerCase()
        ) || INITIAL_SUBCATEGORIES.find(s => 
          s.subcategoryName.toLowerCase() === p.subcategoryId!.toLowerCase() ||
          s.subcategoryCode.toLowerCase() === p.subcategoryId!.toLowerCase()
        );
        if (matchByName) {
          targetSubId = matchByName.subcategoryId;
        }
      }
    }

    // 2. Try resolveSubcategory
    if (!targetSubId) {
      const resolved = resolveSubcategory(p, allSubs) || resolveSubcategory(p, INITIAL_SUBCATEGORIES);
      if (resolved) {
        targetSubId = resolved.subcategoryId;
      }
    }

    // 3. Try legacy inference helper
    if (!targetSubId) {
      const inferred = inferLegacyCategoryAndSubcategory(p);
      if (inferred.subcategoryId) {
        const inferredMatch = allSubs.find(s => s.subcategoryId === inferred.subcategoryId) ||
                             INITIAL_SUBCATEGORIES.find(s => s.subcategoryId === inferred.subcategoryId);
        if (inferredMatch) {
          targetSubId = inferredMatch.subcategoryId;
        }
      }
    }

    // 4. If still empty, auto-select first available subcategory for this category so it is NEVER blank
    if (!targetSubId) {
      const catSubs = allSubs.filter(s => {
        const sCatNorm = normalizeCategoryId(s.categoryId);
        return (sCatNorm === resolvedCat || s.categoryId === resolvedCat) && s.isActive !== false;
      });
      if (catSubs.length > 0) {
        targetSubId = catSubs[0].subcategoryId;
      } else {
        const fallbackSubs = INITIAL_SUBCATEGORIES.filter(s => 
          normalizeCategoryId(s.categoryId) === resolvedCat
        );
        if (fallbackSubs.length > 0) {
          targetSubId = fallbackSubs[0].subcategoryId;
        }
      }
    }

    // 5. Authoritatively synchronize category from subcategory / SKU prefix
    // (Prevents Skin Care products like Sunscreen / Face Wash showing as Hair Care)
    let finalCat = resolvedCat;
    const subMatch = allSubs.find(s => s.subcategoryId === targetSubId);
    if (subMatch?.categoryId) {
      finalCat = normalizeCategoryId(subMatch.categoryId);
    } else if (p.productCode?.startsWith('PRD-SKIN-') || p.productCode?.startsWith('PRD-SKN-')) {
      finalCat = 'CAT-SKIN';
    } else if (p.productCode?.startsWith('PRD-HAIR-')) {
      finalCat = 'CAT-HAIR';
    } else if (p.productCode?.startsWith('PRD-BODY-')) {
      finalCat = 'CAT-BODY';
    } else if (p.productCode?.startsWith('PRD-TRT-')) {
      finalCat = 'CAT-TREATMENT';
    } else if (p.productCode?.startsWith('PRD-SUP-')) {
      finalCat = 'CAT-SUPPLEMENTS';
    } else if (p.productCode?.startsWith('PRD-ACC-')) {
      finalCat = 'CAT-ACCESSORIES';
    }

    setEditingProduct(p);
    setProductCode(p.productCode);
    setProductName(p.productName);
    setCategoryId(finalCat);
    setSubcategoryId(targetSubId);
    setBrandId(p.brandId || brands[0]?.brandId || 'BRD-DERMACLINIX');
    setProductType(p.productType || 'Retail Product');
    setHsnCode(p.hsnCode || '33059011');
    setGstRate(p.gstRate ?? 18);
    setCostPrice(p.costPrice);
    setSellingPrice(p.sellingPrice);
    setReorderLevel(p.reorderLevel);
    setVolumeSize(p.volumeSize);
    setDescription(p.description);
    setImagePath(p.imagePath || '');
    setBackImagePath(p.backImagePath || '');
    setIngredients(p.ingredients || '');
    setDirections(p.directions || '');
    setActiveImageTab('front');
    setShowImageUploader(false); // Retain existing image automatically
    setFormValidationError(null);

    setEditStockLocationId(defaultLoc);
    setEditStockQuantity(curStock);
    setPriceChangeReason('');
    setShowDeleteConfirm(false);
    setIsModalOpen(true);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('Front image file size exceeds 3MB. Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImagePath(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBackImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('Back view image file size exceeds 3MB. Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBackImagePath(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEditLocationChange = (locId: string) => {
    setEditStockLocationId(locId);
    if (editingProduct) {
      const curStock = batches
        .filter(b => b.productId === editingProduct.productId && b.locationId === locId)
        .reduce((sum, b) => sum + b.currentQuantity, 0);
      setEditStockQuantity(curStock);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidationError(null);

    if (!productName.trim() || !productCode.trim()) {
      setFormValidationError('Product name and code are required.');
      return;
    }

    const finalCatId = normalizeCategoryId(categoryId);
    if (!finalCatId) {
      setFormValidationError('⚠️ Category is required.');
      return;
    }
    if (!subcategoryId) {
      setFormValidationError('⚠️ Category and Subcategory are required. Please select a valid subcategory.');
      return;
    }

    const matchedBrand = brands.find(b => b.brandId === brandId);
    const resolvedBrandName = matchedBrand?.brandName || 'DermaClinix';

    if (editingProduct) {
      // 1. Update product master record (productCode is preserved from original, immutable in edit)
      updateProduct({
        ...editingProduct,
        productCode: editingProduct.productCode,
        productName: productName.trim(),
        categoryId: finalCatId,
        subcategoryId: subcategoryId,
        brandId: brandId || undefined,
        brandName: resolvedBrandName,
        productType: productType || 'Retail Product',
        hsnCode: hsnCode.trim() || undefined,
        gstRate: Number(gstRate) || 0,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        reorderLevel: Number(reorderLevel),
        volumeSize: volumeSize.trim(),
        description: description.trim(),
        imagePath: imagePath || editingProduct.imagePath,
        backImagePath: backImagePath || editingProduct.backImagePath,
        ingredients: ingredients.trim() || undefined,
        directions: directions.trim() || undefined
      }, priceChangeReason);

      // 2. Direct quantity editing: ALWAYS update stock quantity for the selected clinic location
      const targetLocId = editStockLocationId;
      const targetQty = Math.max(0, Number(editStockQuantity));
      const prodBatches = batches.filter(
        b => b.productId === editingProduct.productId && b.locationId === targetLocId
      );
      const currentLocTotal = prodBatches.reduce((sum, b) => sum + b.currentQuantity, 0);

      if (targetQty !== currentLocTotal) {
        if (prodBatches.length > 0) {
          // Update the primary batch quantity to reconcile to the user's entered quantity
          const primaryBatch = prodBatches[0];
          const otherBatchesQty = prodBatches.slice(1).reduce((sum, b) => sum + b.currentQuantity, 0);
          const newPrimaryQty = Math.max(0, targetQty - otherBatchesQty);
          updateStockBatch(
            primaryBatch.batchId,
            { currentQuantity: newPrimaryQty },
            'Direct Quantity Update via Product Master Edit'
          );
        } else if (targetQty > 0) {
          // If no batch existed at this clinic location, create an inward batch
          const loc = locations.find(l => l.locationId === targetLocId);
          addStockBatch({
            productId: editingProduct.productId,
            locationId: targetLocId,
            batchNumber: `${loc?.locationCode || 'HOS'}-B${new Date().getFullYear()}-01`,
            expiryDate: '2028-12-31',
            purchaseDate: new Date().toISOString().split('T')[0],
            purchaseInvoiceNo: 'CATALOG-EDIT-STOCK',
            supplierName: 'Physical Stock Count Reconciliation',
            quantityReceived: targetQty,
            currentQuantity: targetQty,
            costPrice: Number(costPrice),
            sellingPrice: Number(sellingPrice)
          });
        }
      }
    } else {
      // Create new Product with initial opening stock & multi-view images
      addProduct(
        {
          productCode: productCode.trim(),
          productName: productName.trim(),
          categoryId: finalCatId,
          subcategoryId: subcategoryId,
          brandId: brandId || undefined,
          brandName: resolvedBrandName,
          productType: productType || 'Retail Product',
          hsnCode: hsnCode.trim() || undefined,
          gstRate: Number(gstRate) || 0,
          costPrice: Number(costPrice),
          sellingPrice: Number(sellingPrice),
          reorderLevel: Number(reorderLevel),
          volumeSize: volumeSize.trim(),
          description: description.trim(),
          imagePath: imagePath || undefined,
          backImagePath: backImagePath || undefined,
          ingredients: ingredients.trim() || undefined,
          directions: directions.trim() || undefined,
          isActive: true
        },
        openingQuantity > 0
          ? {
              quantity: Number(openingQuantity),
              locationId: openingLocationId,
              batchNumber: openingBatchNumber.trim(),
              expiryDate: openingExpiryDate
            }
          : undefined
      );
    }

    setIsModalOpen(false);
  };

  const handleDeleteProduct = () => {
    if (editingProduct) {
      deleteProduct(editingProduct.productId);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Products & Formulary Master
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dermatological SKUs, pricing structures, initial stock quantities, image assets, and profit margins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsClassificationModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            title="Product Classification Matrix & Taxonomy Preview"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-teal-600" />
            <span>Product Classification</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBrandModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            title="Maintain Clinical Brands & Manufacturers"
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Brand Master</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            title="Add or Manage Categories & Subcategories"
          >
            <FolderTree className="w-3.5 h-3.5 text-teal-700" />
            <span>Category & Subcategories</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPriceHistoryProdId(undefined);
              setIsPriceHistoryOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
            title="View Product Price Revisions & Historical Batch Preservations"
          >
            <History className="w-3.5 h-3.5 text-teal-600" />
            <span>Price History</span>
            {priceHistory.length > 0 && (
              <span className="bg-teal-100 text-teal-800 text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold">
                {priceHistory.length}
              </span>
            )}
          </button>

          <button
            onClick={openNewModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-700 text-white rounded-lg text-xs font-semibold hover:bg-teal-800 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-2">
        <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by code, product name, ingredients, brand..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          {/* Categories Filter (Tier 1) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-full sm:w-auto overflow-x-auto text-xs">
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSelectedSubcategory('ALL');
              }}
              className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Categories ({products.length})
            </button>
            {categories
              .filter(c => c.isActive !== false || products.some(p => isProductInCategory(p, c.categoryId, categories)))
              .map(c => {
                const count = products.filter(p => isProductInCategory(p, c.categoryId, categories)).length;

                return (
                  <button
                    key={c.categoryId}
                    onClick={() => {
                      setSelectedCategory(c.categoryId);
                      setSelectedSubcategory('ALL');
                    }}
                    className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategory === c.categoryId ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {c.categoryName} ({count})
                    {c.isActive === false && (
                      <span className="ml-1 text-[9px] text-slate-400 font-normal">(Inactive)</span>
                    )}
                  </button>
                );
              })}
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-2.5 py-1 text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded-md font-semibold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
              title="Create New Clinical Category"
            >
              <Plus className="w-3 h-3" />
              <span>Category</span>
            </button>
          </div>
        </div>

        {/* Subcategories Filter (Tier 2: User Requirement 5) */}
        {selectedCategory !== 'ALL' && (
          <div className="bg-teal-50/80 border border-teal-200/90 p-2 rounded-xl flex items-center gap-1.5 overflow-x-auto text-xs animate-in fade-in">
            <span className="text-[11px] font-bold text-teal-950 px-2 flex items-center gap-1 shrink-0">
              <ListTree className="w-3.5 h-3.5 text-teal-700" />
              <span>Subcategories:</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedSubcategory('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-colors cursor-pointer text-xs ${
                selectedSubcategory === 'ALL'
                  ? 'bg-teal-700 text-white shadow-2xs font-bold'
                  : 'bg-white text-teal-900 border border-teal-200 hover:bg-teal-100'
              }`}
            >
              All {categories.find(c => c.categoryId === selectedCategory)?.categoryName} ({products.filter(p => isProductInCategory(p, selectedCategory, categories)).length})
            </button>
            {subcategories
              .filter(s => s.categoryId === selectedCategory && s.isActive !== false)
              .map(sub => {
                const count = products.filter(p => p.subcategoryId === sub.subcategoryId).length;
                return (
                  <button
                    key={sub.subcategoryId}
                    type="button"
                    onClick={() => setSelectedSubcategory(sub.subcategoryId)}
                    className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer text-xs ${
                      selectedSubcategory === sub.subcategoryId
                        ? 'bg-teal-700 text-white shadow-2xs font-bold'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-teal-50 hover:text-teal-900'
                    }`}
                  >
                    {sub.subcategoryName} ({count})
                  </button>
                );
              })}
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-2 py-0.5 text-teal-700 hover:text-teal-900 hover:bg-teal-100 rounded-md font-semibold whitespace-nowrap transition-colors text-[11px] flex items-center gap-1 cursor-pointer ml-auto"
              title="Add or edit subcategories"
            >
              <Plus className="w-3 h-3" />
              <span>Subcategory</span>
            </button>
          </div>
        )}
      </div>

      {/* Location Filter Indicator Banner when a specific clinic is active */}
      {selectedLocationId !== 'ALL' && (
        <div className="bg-teal-50/90 border border-teal-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-teal-600 text-white flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-teal-950">
                {locations.find(l => l.locationId === selectedLocationId)?.locationName} ({locations.find(l => l.locationId === selectedLocationId)?.locationCode})
              </span>
              <span className="text-teal-700 ml-2">
                — Showing {filteredProducts.length} location-wise products
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOnlyLocationProducts(!onlyLocationProducts)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors border ${
                onlyLocationProducts
                  ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                  : 'bg-white text-teal-800 border-teal-300 hover:bg-teal-50'
              }`}
            >
              {onlyLocationProducts
                ? `✓ Only ${locations.find(l => l.locationId === selectedLocationId)?.locationCode} Products`
                : `Showing All Company SKUs`}
            </button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Cost Price (₹)</th>
                <th className="py-3 px-4 text-right">
                  <div>Master Price (₹)</div>
                  <div className="text-[9px] text-slate-400 font-normal">Future Stock Default</div>
                </th>
                <th className="py-3 px-4 text-right">Margin %</th>
                <th className="py-3 px-4 text-center">Reorder Lvl</th>
                <th className="py-3 px-4 text-center">Live Stock</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(p => {
                const categoryDisplay = getCategoryDisplayName(p, categories);
                const currentStock = stockByProduct[p.productId] || 0;
                const isLowStock = currentStock <= p.reorderLevel;
                const marginPercent = ((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100;

                return (
                  <tr key={p.productId} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Product */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <ProductImageHoverPreview 
                          product={p}
                          className="w-11 h-11 rounded-lg shrink-0 border border-slate-200 bg-white p-0.5 shadow-2xs hover:border-teal-500 transition-colors" 
                          imageClassName="w-full h-full object-contain rounded-md"
                          categoryName={categoryDisplay}
                          stockQty={currentStock}
                          contextMode="catalog"
                          showQuickFlipBadge={false}
                          showClickHintBadge={false}
                        />
                        <div>
                          <div className="font-semibold text-slate-900 line-clamp-1">{p.productName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {p.productCode} · {p.volumeSize}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category & Subcategory */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200/90 whitespace-nowrap">
                          {categoryDisplay}
                        </span>
                        {p.subcategoryId && (
                          <div className="text-[11px] text-teal-800 font-semibold flex items-center gap-1">
                            <span className="text-slate-400">›</span>
                            <span>{subcategories.find(s => s.subcategoryId === p.subcategoryId)?.subcategoryName || p.subcategoryId}</span>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1.5">
                          <span className="font-medium text-slate-600">{p.brandName || 'DermaClinix'}</span>
                          {p.productType && (
                            <>
                              <span>·</span>
                              <span className="text-slate-500">{p.productType}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Cost */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      ₹{p.costPrice}
                    </td>

                    {/* Selling */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      <div className="font-semibold text-slate-900">
                        ₹{p.sellingPrice}
                      </div>
                      {(() => {
                        const priceRes = getProductPriceResolution(p, selectedLocationId === 'ALL' ? undefined : selectedLocationId);
                        if (priceRes.pricingSource === 'active_batch' && priceRes.activeBatch) {
                          return (
                            <div className="text-[10px] text-teal-800 font-sans font-medium flex items-center justify-end gap-1 mt-0.5" title={`Active Batch ${priceRes.activeBatch.batchNumber} Selling Price`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                              <span>Live Batch: ₹{priceRes.effectivePrice}</span>
                            </div>
                          );
                        }
                        return (
                          <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                            Master Default
                          </div>
                        );
                      })()}
                    </td>

                    {/* Margin */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      <span className="text-teal-700 font-bold bg-teal-50 px-1.5 py-0.5 rounded text-[11px]">
                        {marginPercent.toFixed(1)}%
                      </span>
                    </td>

                    {/* Reorder Level */}
                    <td className="py-3 px-4 text-center font-mono text-slate-500 tabular-nums">
                      {p.reorderLevel}
                    </td>

                    {/* Live Stock & Alert */}
                    <td className="py-3 px-4 text-center font-mono">
                      <div className="inline-flex items-center gap-1.5">
                        <span className={`font-bold tabular-nums text-xs ${isLowStock ? 'text-rose-600' : 'text-slate-800'}`}>
                          {currentStock}
                        </span>
                        {isLowStock && (
                          <span className="text-[10px] font-sans font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded" title="Stock below reorder level">
                            Low
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPriceHistoryProdId(p.productId);
                            setIsPriceHistoryOpen(true);
                          }}
                          className="px-2 py-1 text-[11px] text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded border border-slate-200 transition-colors flex items-center gap-1"
                          title="View Price Revision History for this SKU"
                        >
                          <History className="w-3 h-3 text-indigo-600" />
                          <span className="hidden sm:inline">Price Log</span>
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          className="px-2 py-1 text-[11px] text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded border border-slate-200 transition-colors flex items-center gap-1"
                          title="Edit Product, Price or Correct Stock"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-xs font-semibold text-slate-700">
                      No products currently assigned or stocked in {locations.find(l => l.locationId === selectedLocationId)?.locationName || 'this clinic'}.
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Click "+ Add New Product" to create and inward products for this clinic, or toggle "Showing All Company SKUs" above.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 max-w-xl w-full max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {editingProduct ? 'Edit Product SKU & Correct Details' : 'Add New Product SKU'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {editingProduct 
                    ? `Update product info, prices, photo, or correct stock counts` 
                    : `Define new SKU, initial opening stock quantity, and product photo`}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
              
              {/* Validation Warning */}
              {formValidationError && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-semibold">{formValidationError}</span>
                </div>
              )}

              {/* Product Selection / Formulation Preset dropdown (Only for new products) */}
              {!editingProduct && (
                <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-800 font-bold flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                      <span>Select Clinical Product Formulation (or Custom)</span>
                    </label>
                    <span className="text-[10px] text-teal-800 font-mono bg-white border border-teal-200 px-2 py-0.5 rounded font-semibold">
                      Auto-Generates Code
                    </span>
                  </div>
                  <select
                    value={selectedTemplateIndex}
                    onChange={e => handleTemplateSelect(Number(e.target.value))}
                    className="w-full p-2 border border-teal-300 rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-teal-500 font-medium text-xs cursor-pointer"
                  >
                    <option value={-1}>-- Custom Product Formulation (Enter details manually) --</option>
                    {CLINICAL_PRODUCT_TEMPLATES.map((tmpl, idx) => (
                      <option key={idx} value={idx}>
                        {tmpl.name} ({categories.find(c => c.categoryId === tmpl.categoryId)?.categoryName})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Selecting a product automatically generates its sequential product code and populates formulary parameters.
                  </p>
                </div>
              )}

              {/* Product Code */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-semibold flex items-center gap-1">
                    <span>Product SKU Code</span>
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                  </label>
                  <span className="text-[10px] text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded font-mono font-semibold">
                    Auto-Generated from Category · Stable SKU
                  </span>
                </div>
                <input
                  type="text"
                  required
                  disabled
                  readOnly
                  value={productCode}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs bg-slate-100 text-slate-800 font-bold cursor-not-allowed select-none shadow-2xs"
                  placeholder="PRD-..."
                />
              </div>

              {/* Category & Subcategory (Mandatory as per User Requirement 4) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-semibold">
                      Category <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-[11px] text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-0.5 cursor-pointer"
                      title="Manage categories"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Category</span>
                    </button>
                  </div>
                  <select
                    required
                    value={categoryId}
                    onChange={e => handleCategoryChange(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 bg-white font-medium focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    {modalCategories.map(c => (
                      <option key={c.categoryId} value={c.categoryId}>
                        {c.categoryName} {c.isActive === false ? ' (Inactive)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-semibold flex items-center gap-1">
                      <span>Subcategory</span>
                      <span className="text-rose-500">*</span>
                      {subcategoryId && (
                        <span className="text-[10px] text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200 font-mono font-semibold">
                          {modalSubcategories.find(s => s.subcategoryId === subcategoryId)?.subcategoryCode || 'ACTIVE'}
                        </span>
                      )}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-[11px] text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-0.5 cursor-pointer"
                      title="Manage subcategories"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Subcategory</span>
                    </button>
                  </div>
                  <select
                    required
                    value={subcategoryId}
                    onChange={e => handleSubcategoryChange(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 bg-white font-medium focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="">-- Select Subcategory (Required) --</option>
                    {modalSubcategories.map(s => (
                      <option key={s.subcategoryId} value={s.subcategoryId}>
                        {s.subcategoryName} {s.isActive === false ? ' (Inactive)' : ''}
                      </option>
                    ))}
                  </select>
                  {modalSubcategories.length === 0 && (
                    <p className="text-[10px] text-rose-500 mt-1">
                      No subcategories available. Click "+ Subcategory" to add one.
                    </p>
                  )}
                </div>
              </div>

              {/* Brand & Product Type (User Requirements 6 & 7) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-semibold">Brand Master</label>
                    <button
                      type="button"
                      onClick={() => setIsBrandModalOpen(true)}
                      className="text-[11px] text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-0.5 cursor-pointer"
                      title="Manage Brands"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Brand</span>
                    </button>
                  </div>
                  <select
                    value={brandId}
                    onChange={e => setBrandId(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 bg-white font-medium focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    {brands
                      .filter(b => b.isActive !== false || b.brandId === brandId)
                      .map(b => (
                        <option key={b.brandId} value={b.brandId}>
                          {b.brandName} {b.manufacturer ? `(${b.manufacturer})` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Product Type</label>
                  <select
                    value={productType}
                    onChange={e => setProductType(e.target.value as ProductType)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 bg-white font-medium focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="Retail Product">Retail Product</option>
                    <option value="Professional Product">Professional Product</option>
                    <option value="Treatment Product">Treatment Product</option>
                    <option value="Supplement">Supplement</option>
                    <option value="Accessory">Accessory</option>
                  </select>
                </div>
              </div>

              {/* Tax / GST Information (User Requirement 8) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">HSN / SAC Code</label>
                  <input
                    type="text"
                    value={hsnCode}
                    onChange={e => setHsnCode(e.target.value)}
                    placeholder="e.g. 33059011"
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs text-slate-900 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">GST Rate (%)</label>
                  <select
                    value={gstRate}
                    onChange={e => setGstRate(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value={0}>0% GST (Nil)</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST (Standard)</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 focus:ring-1 focus:ring-teal-500 font-medium"
                  placeholder="e.g. Trichology Peptide Hair Regrowth Serum"
                />
              </div>

              {/* Pricing & Reorder Level */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Cost Price (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={costPrice}
                    onChange={e => setCostPrice(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-900 focus:ring-1 focus:ring-teal-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Selling Price (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={sellingPrice}
                    onChange={e => setSellingPrice(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-900 focus:ring-1 focus:ring-teal-500 font-bold text-teal-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Reorder Level</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={reorderLevel}
                    onChange={e => setReorderLevel(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-900 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Batch Costing Notice when Master Price is updated */}
              {editingProduct && (editingProduct.costPrice !== costPrice || editingProduct.sellingPrice !== sellingPrice) && (
                <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl space-y-2.5 text-xs animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Batch-Wise Costing Notice: Existing Batches Protected</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Existing stock batches ({batches.filter(b => b.productId === editingProduct.productId).length} batch(es) on record) will strictly retain their original cost price (₹{editingProduct.costPrice}) and selling price (₹{editingProduct.sellingPrice}). New inward purchase orders will adopt this revised price (Cost: ₹{costPrice}, Selling: ₹{sellingPrice}). This price change will be logged in the <strong className="font-semibold text-amber-950">ProductPriceHistory</strong> audit table.
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-950 mb-1">
                      Reason for Price Revision (Saved to ProductPriceHistory table):
                    </label>
                    <input
                      type="text"
                      value={priceChangeReason}
                      onChange={e => setPriceChangeReason(e.target.value)}
                      placeholder="e.g. Raw material price escalation, vendor revised rate, formula upgrade"
                      className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Volume/Size & Description */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Volume / Size</label>
                  <input
                    type="text"
                    value={volumeSize}
                    onChange={e => setVolumeSize(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 focus:ring-1 focus:ring-teal-500"
                    placeholder="e.g. 50ml Pump, 100g Bar"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Clinical Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 focus:ring-1 focus:ring-teal-500"
                    placeholder="e.g. For post-procedure hydration"
                  />
                </div>
              </div>

              {/* ========================================================= */}
              {/* SECTION: QUANTITY MANAGEMENT & OPENING STOCK / CORRECTION */}
              {/* ========================================================= */}
              {!editingProduct ? (
                /* NEW PRODUCT: Opening Stock Quantity inputs */
                <div className="p-3.5 bg-teal-50/70 border border-teal-200/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-teal-900 text-xs">
                      <Package className="w-4 h-4 text-teal-700" />
                      <span>Initial Stock Quantity (Opening Inventory)</span>
                    </div>
                    <span className="text-[10px] text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded font-mono">
                      Inwards immediately
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-teal-900 font-semibold mb-1">
                        Opening Quantity (Units)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={openingQuantity}
                        onChange={e => setOpeningQuantity(Number(e.target.value))}
                        className="w-full p-2 bg-white border border-teal-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-1 focus:ring-teal-500"
                        placeholder="25"
                      />
                    </div>

                    <div>
                      <label className="block text-teal-900 font-semibold mb-1">
                        Receiving Clinic
                      </label>
                      <select
                        value={openingLocationId}
                        onChange={e => setOpeningLocationId(e.target.value)}
                        className="w-full p-2 bg-white border border-teal-300 rounded-lg text-slate-900 font-medium"
                      >
                        {locations.map(l => (
                          <option key={l.locationId} value={l.locationId}>
                            {l.locationCode} - {l.locationName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {openingQuantity > 0 && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-teal-800 text-[11px] font-semibold mb-1">
                          Opening Batch #
                        </label>
                        <input
                          type="text"
                          value={openingBatchNumber}
                          onChange={e => setOpeningBatchNumber(e.target.value)}
                          className="w-full p-1.5 bg-white border border-teal-200 rounded-md font-mono text-slate-900 text-xs"
                          placeholder="HOS-B2026-OPEN01"
                        />
                      </div>
                      <div>
                        <label className="block text-teal-800 text-[11px] font-semibold mb-1">
                          Batch Expiry Date
                        </label>
                        <input
                          type="date"
                          value={openingExpiryDate}
                          onChange={e => setOpeningExpiryDate(e.target.value)}
                          className="w-full p-1.5 bg-white border border-teal-200 rounded-md font-mono text-slate-900 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* EDITING PRODUCT: Stock Quantity directly editable */
                <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-teal-900 text-xs">
                      <Package className="w-4 h-4 text-teal-700" />
                      <span>Stock Quantity (Directly Editable)</span>
                    </div>
                    <span className="text-[10px] text-teal-800 bg-teal-100/90 px-2 py-0.5 rounded font-mono font-semibold">
                      Total live stock: {stockByProduct[editingProduct.productId] || 0} units
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-teal-900 font-semibold mb-1">
                        Clinic Location
                      </label>
                      <select
                        value={editStockLocationId}
                        onChange={e => handleEditLocationChange(e.target.value)}
                        className="w-full p-2 bg-white border border-teal-300 rounded-lg text-slate-900 font-medium focus:ring-1 focus:ring-teal-500"
                      >
                        {locations.map(l => (
                          <option key={l.locationId} value={l.locationId}>
                            {l.locationCode} - {l.locationName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-teal-900 font-semibold mb-1">
                        Stock Quantity in {locations.find(l => l.locationId === editStockLocationId)?.locationCode || 'Clinic'} (Units)
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={editStockQuantity}
                        onChange={e => setEditStockQuantity(Number(e.target.value))}
                        className="w-full p-2 bg-white border border-teal-400 rounded-lg font-mono font-bold text-teal-950 text-sm focus:ring-2 focus:ring-teal-500 shadow-2xs"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Fast clinic switcher pills */}
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-teal-800">
                    <span className="font-semibold">Quick switch clinic:</span>
                    {locations.map(loc => {
                      const locQty = batches
                        .filter(b => b.productId === editingProduct.productId && b.locationId === loc.locationId)
                        .reduce((sum, b) => sum + b.currentQuantity, 0);
                      const isSelected = loc.locationId === editStockLocationId;
                      return (
                        <button
                          key={loc.locationId}
                          type="button"
                          onClick={() => handleEditLocationChange(loc.locationId)}
                          className={`px-2.5 py-0.5 rounded border transition-colors flex items-center gap-1 text-[11px] ${
                            isSelected 
                              ? 'bg-teal-700 text-white border-teal-700 font-bold' 
                              : 'bg-white text-slate-700 border-teal-200 hover:border-teal-400'
                          }`}
                        >
                          <span>{loc.locationCode}:</span>
                          <span className="font-mono">{isSelected ? editStockQuantity : locQty}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* SECTION: MULTI-ANGLE PRODUCT IMAGERY & CLINICAL LABELING  */}
              {/* ========================================================= */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                    <ImageIcon className="w-4 h-4 text-teal-600" />
                    <span>Product Imagery & Angle Views (Front / Back)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {imagePath && (
                      <span className="text-[10px] text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3 h-3 text-teal-600" />
                        <span>Front Active</span>
                      </span>
                    )}
                    {backImagePath && (
                      <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                        <span>Back Active</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Paired Clinical Preset Picker (One-Click Front + Back setup) */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="text-[10px] font-semibold text-slate-600 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>One-Click Clinical Preset Pairs (Front & Back Views):</span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono">Sets both packaging & ingredients views</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {CLINICAL_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setImagePath(preset.front);
                          setBackImagePath(preset.back);
                          setShowImageUploader(false);
                        }}
                        className="p-1 rounded-lg border border-slate-200 hover:border-teal-500 bg-slate-50 hover:bg-teal-50/60 transition-all flex flex-col items-center text-center cursor-pointer group"
                      >
                        <div className="relative w-9 h-9 rounded-md overflow-hidden border border-slate-200 bg-white">
                          <img 
                            src={preset.front} 
                            alt={preset.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                          />
                        </div>
                        <span className="text-[9px] text-slate-700 font-medium mt-1 line-clamp-1">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* View Angle Switcher Tabs */}
                <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveImageTab('front')}
                    className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      activeImageTab === 'front'
                        ? 'bg-white text-teal-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                    <span>Front View (Packaging & Label)</span>
                    {imagePath && <Check className="w-3 h-3 text-teal-600 shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveImageTab('back')}
                    className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      activeImageTab === 'back'
                        ? 'bg-white text-indigo-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>Back View (Ingredients & Directions)</span>
                    {backImagePath && <Check className="w-3 h-3 text-indigo-600 shrink-0" />}
                  </button>
                </div>

                {/* Hidden File Inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <input
                  ref={backFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBackImageFileChange}
                  className="hidden"
                />

                {/* TAB 1: FRONT VIEW */}
                {activeImageTab === 'front' && (
                  <div className="space-y-2.5">
                    {imagePath ? (
                      <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img 
                            src={imagePath} 
                            alt="Front preview" 
                            className="w-14 h-14 object-cover rounded-lg border border-slate-200 shadow-2xs" 
                          />
                          <div>
                            <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                              <span>Front View Attached</span>
                              <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded font-mono">
                                Primary View
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Displayed across POS billing, stock batch cards, and online product catalog.
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs text-teal-700 hover:text-teal-900 px-2.5 py-1 rounded-md bg-teal-50 hover:bg-teal-100 font-medium"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => setImagePath('')}
                            className="text-xs text-rose-600 hover:text-rose-800 px-2 py-1 rounded-md hover:bg-rose-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-teal-200 hover:border-teal-500 bg-white hover:bg-teal-50/40 rounded-xl p-4 text-center cursor-pointer transition-colors"
                      >
                        <Upload className="w-6 h-6 text-teal-600 mx-auto mb-1.5" />
                        <div className="font-semibold text-slate-800 text-xs">
                          Click to upload Front View image
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Shows bottle, jar or packaging. Supports PNG, JPG, WebP up to 3MB.
                        </div>
                      </div>
                    )}

                    {/* Direct Image URL input */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">Or Front URL:</span>
                      <input
                        type="url"
                        value={imagePath}
                        onChange={e => setImagePath(e.target.value)}
                        placeholder="https://... (direct image link)"
                        className="flex-1 text-[11px] p-1.5 bg-white border border-slate-200 rounded-md font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: BACK VIEW (INGREDIENTS & CLINICAL DIRECTIONS) */}
                {activeImageTab === 'back' && (
                  <div className="space-y-3">
                    {backImagePath ? (
                      <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img 
                            src={backImagePath} 
                            alt="Back preview" 
                            className="w-14 h-14 object-cover rounded-lg border border-slate-200 shadow-2xs" 
                          />
                          <div>
                            <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                              <span>Back View Attached</span>
                              <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-mono">
                                Label & INCI
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Revealed on hover pop-up and quick-flip rotation on POS & Store.
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => backFileInputRef.current?.click()}
                            className="text-xs text-indigo-700 hover:text-indigo-900 px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 font-medium"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => setBackImagePath('')}
                            className="text-xs text-rose-600 hover:text-rose-800 px-2 py-1 rounded-md hover:bg-rose-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => backFileInputRef.current?.click()}
                        className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/40 rounded-xl p-4 text-center cursor-pointer transition-colors"
                      >
                        <Upload className="w-6 h-6 text-indigo-600 mx-auto mb-1.5" />
                        <div className="font-semibold text-slate-800 text-xs">
                          Click to upload Back View / Label image
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Shows back panel, INCI composition & usage instructions. Supports PNG, JPG, WebP.
                        </div>
                      </div>
                    )}

                    {/* Direct Back Image URL input */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">Or Back URL:</span>
                      <input
                        type="url"
                        value={backImagePath}
                        onChange={e => setBackImagePath(e.target.value)}
                        placeholder="https://... (direct back image link)"
                        className="flex-1 text-[11px] p-1.5 bg-white border border-slate-200 rounded-md font-mono"
                      />
                    </div>

                    {/* INCI Clinical Ingredients */}
                    <div className="space-y-1 pt-1 border-t border-slate-200">
                      <label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                        <span>Clinical Ingredients (INCI Back-Label Profile)</span>
                        <span className="text-[10px] text-slate-400 font-normal">Shown in Back View hover popup</span>
                      </label>
                      <textarea
                        rows={2}
                        value={ingredients}
                        onChange={e => setIngredients(e.target.value)}
                        placeholder="e.g. Ketoconazole IP 2% w/v, Zinc Pyrithione 1%, Piroctone Olamine 0.5%..."
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>

                    {/* Usage Directions & Cautions */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                        <span>Directions for Use & Clinical Cautions</span>
                        <span className="text-[10px] text-slate-400 font-normal">Application guidelines</span>
                      </label>
                      <input
                        type="text"
                        value={directions}
                        onChange={e => setDirections(e.target.value)}
                        placeholder="e.g. Apply 1ml once daily at night to affected scalp area. Wash hands after use."
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Delete confirmation section (for wrong product) */}
              {showDeleteConfirm ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Confirm Delete Product SKU</span>
                  </div>
                  <p className="text-[11px] text-rose-700">
                    Are you sure you want to permanently delete "{editingProduct?.productName}"? All inventory batches and SKU references will be removed.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteProduct}
                      className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
                    >
                      Yes, Delete SKU
                    </button>
                  </div>
                </div>
              ) : (
                /* Modal action buttons */
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  {editingProduct ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-rose-600 hover:text-rose-700 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete SKU</span>
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-teal-700 text-white rounded-lg font-medium hover:bg-teal-800 flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>{editingProduct ? 'Save Product Changes' : 'Save Product'}</span>
                    </button>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      )}

      {/* Price Revision History Modal */}
      <PriceHistoryModal
        isOpen={isPriceHistoryOpen}
        onClose={() => {
          setIsPriceHistoryOpen(false);
          setPriceHistoryProdId(undefined);
        }}
        filterProductId={priceHistoryProdId}
      />

      {/* Opening Stock Bulk Migration Modal */}
      {isOpeningStockOpen && (
        <OpeningStockModal onClose={() => setIsOpeningStockOpen(false)} />
      )}

      {/* Category Management & New Category Modal */}
      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        initialSelectedCategoryId={selectedCategory !== 'ALL' ? selectedCategory : null}
        onCategoryCreated={(newCat) => {
          setSelectedCategory(newCat.categoryId);
          if (isModalOpen) {
            handleCategoryChange(newCat.categoryId);
          }
        }}
      />

      {/* Brand Master Management Modal */}
      <BrandManagementModal
        isOpen={isBrandModalOpen}
        onClose={() => setIsBrandModalOpen(false)}
        onBrandCreated={(newBrand) => {
          setBrandId(newBrand.brandId);
        }}
      />

      {/* Product Classification Matrix Modal */}
      <ProductClassificationModal
        isOpen={isClassificationModalOpen}
        onClose={() => setIsClassificationModalOpen(false)}
      />

    </div>
  );
};
