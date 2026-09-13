export type CatalogSourceBrand = Readonly<{
  id: string;
  slug: string;
  name: string;
  currencyCode: string;
}>;

export type CatalogSourceLocation = Readonly<{
  id: string;
  brandId: string;
  slug: string;
  name: string;
}>;

export type CatalogSourceCategory = Readonly<{
  id: string;
  brandId: string;
  slug: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
}>;

export type CatalogSourceProduct = Readonly<{
  id: string;
  brandId: string;
  categoryId: string;
  slug: string;
  name: string;
  description?: string;
  regularPriceCents: number;
  offerPriceCents?: number;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
}>;

export type CatalogSourceModifierGroup = Readonly<{
  id: string;
  brandId: string;
  name: string;
  description?: string;
  selectionType: string;
  minSelections: number;
  maxSelections: number;
  displayOrder: number;
  isActive: boolean;
}>;

export type CatalogSourceModifierOption = Readonly<{
  id: string;
  brandId: string;
  modifierGroupId: string;
  name: string;
  description?: string;
  priceAdjustmentCents: number;
  displayOrder: number;
  isActive: boolean;
}>;

export type CatalogSourceCategoryModifierGroup = Readonly<{
  brandId: string;
  categoryId: string;
  modifierGroupId: string;
}>;

export type CatalogSourceCategoryModifierGroupExclusion = Readonly<{
  brandId: string;
  categoryId: string;
  modifierGroupId: string;
  productId: string;
}>;

export type CatalogSourceProductModifierGroup = Readonly<{
  brandId: string;
  productId: string;
  modifierGroupId: string;
}>;

export type CatalogSourceModifierCondition = Readonly<{
  brandId: string;
  parentModifierGroupId: string;
  activatingModifierOptionId: string;
  childModifierGroupId: string;
}>;

export type CatalogSourceLocationProduct = Readonly<{
  brandId: string;
  locationId: string;
  productId: string;
  isAvailable: boolean;
}>;

export type CatalogSourceLocationModifierOption = Readonly<{
  brandId: string;
  locationId: string;
  modifierOptionId: string;
  isAvailable: boolean;
}>;

export type CatalogSource = Readonly<{
  brand: CatalogSourceBrand;
  location: CatalogSourceLocation;
  categories: readonly CatalogSourceCategory[];
  products: readonly CatalogSourceProduct[];
  modifierGroups: readonly CatalogSourceModifierGroup[];
  modifierOptions: readonly CatalogSourceModifierOption[];
  categoryModifierGroups: readonly CatalogSourceCategoryModifierGroup[];
  categoryModifierGroupExclusions: readonly CatalogSourceCategoryModifierGroupExclusion[];
  productModifierGroups: readonly CatalogSourceProductModifierGroup[];
  modifierConditions: readonly CatalogSourceModifierCondition[];
  locationProducts: readonly CatalogSourceLocationProduct[];
  locationModifierOptions: readonly CatalogSourceLocationModifierOption[];
}>;
