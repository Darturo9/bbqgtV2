export type CatalogProductPublicImage = Readonly<{
  kind: "public";
  src: string;
  alt: string;
}>;

export type CatalogProductPlaceholderImage = Readonly<{
  kind: "placeholder";
  alt: string;
}>;

export type CatalogProductImage = CatalogProductPublicImage | CatalogProductPlaceholderImage;

export type CatalogProduct = Readonly<{
  id: string;
  slug: string;
  name: string;
  description?: string;
  regularPriceCents: number;
  currentPriceCents: number;
  isOnOffer: boolean;
  image: CatalogProductImage;
  isCustomizable: boolean;
}>;

export type CatalogCategory = Readonly<{
  id: string;
  slug: string;
  name: string;
  description?: string;
  products: readonly CatalogProduct[];
}>;

export type CatalogSnapshot = Readonly<{
  brand: Readonly<{
    id: string;
    slug: string;
    name: string;
    currencyCode: "GTQ";
  }>;
  location: Readonly<{
    id: string;
    slug: string;
    name: string;
  }>;
  categories: readonly CatalogCategory[];
}>;
