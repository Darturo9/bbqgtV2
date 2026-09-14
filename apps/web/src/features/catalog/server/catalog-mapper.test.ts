import { describe, expect, it } from "vitest";

import type { CatalogSource } from "./catalog-source";
import { CATALOG_MAPPING_ERROR_CODES, mapCatalogSource } from "./catalog-mapper";

const IDS = Object.freeze({
  brand: "brand-bbqbros",
  location: "location-norte",
  category: "category-combos",
  secondCategory: "category-bebidas",
  product: "product-combo-uno",
  secondProduct: "product-combo-dos",
  group: "group-acompanamiento",
  childGroup: "group-salsa",
  option: "option-papas",
  secondOption: "option-ensalada",
  childOption: "option-bbq",
});

function createSource(overrides: Partial<CatalogSource> = {}): CatalogSource {
  return {
    brand: {
      id: IDS.brand,
      slug: "bbqbros",
      name: "BBQBros",
      currencyCode: "GTQ",
    },
    location: {
      id: IDS.location,
      brandId: IDS.brand,
      slug: "sucursal-demo-norte",
      name: "Sucursal Demo Norte",
    },
    categories: [
      {
        id: IDS.category,
        brandId: IDS.brand,
        slug: "combos",
        name: "Combos",
        description: "  Para compartir  ",
        displayOrder: 10,
        isActive: true,
      },
    ],
    products: [
      {
        id: IDS.product,
        brandId: IDS.brand,
        categoryId: IDS.category,
        slug: "combo-uno",
        name: "Combo Uno",
        description: "  Costillas y acompañamiento  ",
        regularPriceCents: 10_000,
        displayOrder: 10,
        isActive: true,
      },
    ],
    modifierGroups: [],
    modifierOptions: [],
    categoryModifierGroups: [],
    categoryModifierGroupExclusions: [],
    productModifierGroups: [],
    modifierConditions: [],
    locationProducts: [
      {
        brandId: IDS.brand,
        locationId: IDS.location,
        productId: IDS.product,
        isAvailable: true,
      },
    ],
    locationModifierOptions: [],
    ...overrides,
  };
}

function requiredGroupSource(overrides: Partial<CatalogSource> = {}): CatalogSource {
  return createSource({
    modifierGroups: [
      {
        id: IDS.group,
        brandId: IDS.brand,
        name: "Acompañamiento",
        selectionType: "single",
        minSelections: 1,
        maxSelections: 1,
        displayOrder: 10,
        isActive: true,
      },
    ],
    modifierOptions: [
      {
        id: IDS.option,
        brandId: IDS.brand,
        modifierGroupId: IDS.group,
        name: "Papas",
        priceAdjustmentCents: 0,
        displayOrder: 10,
        isActive: true,
      },
    ],
    categoryModifierGroups: [
      {
        brandId: IDS.brand,
        categoryId: IDS.category,
        modifierGroupId: IDS.group,
      },
    ],
    locationModifierOptions: [
      {
        brandId: IDS.brand,
        locationId: IDS.location,
        modifierOptionId: IDS.option,
        isAvailable: true,
      },
    ],
    ...overrides,
  });
}

function expectSuccess(source: CatalogSource) {
  const result = mapCatalogSource(source);

  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("Se esperaba un catálogo válido.");
  }

  return result.value;
}

function expectInvalidSource(source: CatalogSource) {
  const result = mapCatalogSource(source);

  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error("Se esperaba un error de mapeo.");
  }

  expect(result.error.code).toBe(CATALOG_MAPPING_ERROR_CODES.invalidSource);
  expect(result.error.cause).toBeDefined();
}

describe("mapCatalogSource", () => {
  it("mapea el precio normal y el precio de oferta efectivo", () => {
    const regularSnapshot = expectSuccess(createSource());
    const offerSnapshot = expectSuccess(
      createSource({
        products: [
          {
            ...createSource().products[0]!,
            offerPriceCents: 8_500,
          },
        ],
      }),
    );

    expect(regularSnapshot.categories[0]?.products[0]).toMatchObject({
      regularPriceCents: 10_000,
      currentPriceCents: 10_000,
      isOnOffer: false,
    });
    expect(offerSnapshot.categories[0]?.products[0]).toMatchObject({
      regularPriceCents: 10_000,
      currentPriceCents: 8_500,
      isOnOffer: true,
    });
  });

  it("ordena categorías y productos por displayOrder, nombre e id", () => {
    const source = createSource({
      categories: [
        {
          id: IDS.category,
          brandId: IDS.brand,
          slug: "z-combos",
          name: "Combos",
          displayOrder: 20,
          isActive: true,
        },
        {
          id: IDS.secondCategory,
          brandId: IDS.brand,
          slug: "a-bebidas",
          name: "Bebidas",
          displayOrder: 10,
          isActive: true,
        },
      ],
      products: [
        {
          ...createSource().products[0]!,
          id: IDS.product,
          name: "Zeta",
          displayOrder: 10,
        },
        {
          ...createSource().products[0]!,
          id: IDS.secondProduct,
          slug: "alfa",
          name: "Alfa",
          displayOrder: 10,
        },
      ],
      locationProducts: [
        {
          brandId: IDS.brand,
          locationId: IDS.location,
          productId: IDS.product,
          isAvailable: true,
        },
        {
          brandId: IDS.brand,
          locationId: IDS.location,
          productId: IDS.secondProduct,
          isAvailable: true,
        },
      ],
    });

    const snapshot = expectSuccess(source);

    expect(snapshot.categories.map(({ name }) => name)).toEqual(["Bebidas", "Combos"]);
    expect(snapshot.categories[1]?.products.map(({ name }) => name)).toEqual(["Alfa", "Zeta"]);
  });

  it("normaliza descripciones opcionales y usa placeholder cuando no hay imagen", () => {
    const snapshot = expectSuccess(createSource());
    const category = snapshot.categories[0];
    const product = category?.products[0];

    expect(category?.description).toBe("Para compartir");
    expect(product?.description).toBe("Costillas y acompañamiento");
    expect(product?.image).toEqual({ kind: "placeholder", alt: "Combo Uno de BBQBros" });
  });

  it("publica una imagen pública con texto alternativo propio", () => {
    const product = createSource().products[0]!;
    const snapshot = expectSuccess(
      createSource({ products: [{ ...product, imageUrl: "https://cdn.example/combo.webp" }] }),
    );

    expect(snapshot.categories[0]?.products[0]?.image).toEqual({
      kind: "public",
      src: "https://cdn.example/combo.webp",
      alt: "Combo Uno de BBQBros",
    });
  });

  it("hereda un grupo activo asignado a la categoría", () => {
    const snapshot = expectSuccess(requiredGroupSource());

    expect(snapshot.categories[0]?.products[0]?.isCustomizable).toBe(true);
  });

  it("respeta la exclusión de categoría y permite reasignar el grupo al producto", () => {
    const base = requiredGroupSource();
    const excluded = {
      brandId: IDS.brand,
      categoryId: IDS.category,
      modifierGroupId: IDS.group,
      productId: IDS.product,
    };
    const withoutDirectAssignment = expectSuccess(
      requiredGroupSource({ categoryModifierGroupExclusions: [excluded] }),
    );
    const withDirectAssignment = expectSuccess(
      requiredGroupSource({
        categoryModifierGroupExclusions: [excluded],
        productModifierGroups: [
          { brandId: IDS.brand, productId: IDS.product, modifierGroupId: IDS.group },
        ],
      }),
    );

    expect(base.categoryModifierGroups).toHaveLength(1);
    expect(withoutDirectAssignment.categories[0]?.products[0]?.isCustomizable).toBe(false);
    expect(withDirectAssignment.categories[0]?.products[0]?.isCustomizable).toBe(true);
  });

  it("no activa ni bloquea un grupo condicional sin selecciones", () => {
    const base = requiredGroupSource();
    const snapshot = expectSuccess(
      requiredGroupSource({
        modifierGroups: [
          { ...base.modifierGroups[0]!, minSelections: 0 },
          {
            id: IDS.childGroup,
            brandId: IDS.brand,
            name: "Salsa",
            selectionType: "single",
            minSelections: 1,
            maxSelections: 1,
            displayOrder: 20,
            isActive: true,
          },
        ],
        modifierOptions: [
          base.modifierOptions[0]!,
          {
            id: IDS.childOption,
            brandId: IDS.brand,
            modifierGroupId: IDS.childGroup,
            name: "BBQ",
            priceAdjustmentCents: 0,
            displayOrder: 10,
            isActive: true,
          },
        ],
        categoryModifierGroups: [
          base.categoryModifierGroups[0]!,
          {
            brandId: IDS.brand,
            categoryId: IDS.category,
            modifierGroupId: IDS.childGroup,
          },
        ],
        modifierConditions: [
          {
            brandId: IDS.brand,
            parentModifierGroupId: IDS.group,
            activatingModifierOptionId: IDS.option,
            childModifierGroupId: IDS.childGroup,
          },
        ],
        locationModifierOptions: [base.locationModifierOptions[0]!],
      }),
    );

    expect(snapshot.categories[0]?.products[0]).toMatchObject({ isCustomizable: true });
  });

  it.each([
    ["inactiva", false, true],
    ["no disponible", true, false],
  ])(
    "descarta el producto si su única opción obligatoria está %s",
    (_case, isActive, isAvailable) => {
      const base = requiredGroupSource();
      const snapshot = expectSuccess(
        requiredGroupSource({
          modifierOptions: [
            { ...base.modifierOptions[0]!, isActive },
            ...(isActive
              ? []
              : [
                  {
                    ...base.modifierOptions[0]!,
                    id: IDS.secondOption,
                    name: "Ensalada",
                    displayOrder: 20,
                  },
                ]),
          ],
          locationModifierOptions: [{ ...base.locationModifierOptions[0]!, isAvailable }],
        }),
      );

      expect(snapshot.categories[0]?.products).toEqual([]);
    },
  );

  it("descarta un producto que la sede no tiene habilitado", () => {
    const snapshot = expectSuccess(
      createSource({
        locationProducts: [
          {
            brandId: IDS.brand,
            locationId: IDS.location,
            productId: IDS.product,
            isAvailable: false,
          },
        ],
      }),
    );

    expect(snapshot.categories[0]?.products).toEqual([]);
  });

  it("descarta un producto si un grupo obligatorio no conserva suficientes opciones", () => {
    const base = requiredGroupSource();
    const snapshot = expectSuccess(
      requiredGroupSource({
        modifierGroups: [
          {
            ...base.modifierGroups[0]!,
            selectionType: "multiple",
            minSelections: 2,
            maxSelections: 2,
          },
        ],
        modifierOptions: [
          base.modifierOptions[0]!,
          {
            ...base.modifierOptions[0]!,
            id: IDS.secondOption,
            name: "Ensalada",
            displayOrder: 20,
          },
        ],
        locationModifierOptions: [base.locationModifierOptions[0]!],
      }),
    );

    expect(snapshot.categories[0]?.products).toEqual([]);
  });

  it("conserva una categoría activa aunque no tenga productos vendibles", () => {
    const snapshot = expectSuccess(createSource({ locationProducts: [] }));

    expect(snapshot.categories).toHaveLength(1);
    expect(snapshot.categories[0]?.products).toEqual([]);
  });

  it.each([
    ["moneda", () => createSource({ brand: { ...createSource().brand, currencyCode: "USD" } })],
    [
      "precio",
      () =>
        createSource({
          products: [{ ...createSource().products[0]!, regularPriceCents: 0 }],
        }),
    ],
    ["identificador", () => createSource({ brand: { ...createSource().brand, id: "   " } })],
    [
      "condición",
      () =>
        requiredGroupSource({
          modifierConditions: [
            {
              brandId: IDS.brand,
              parentModifierGroupId: IDS.group,
              activatingModifierOptionId: "option-inexistente",
              childModifierGroupId: IDS.childGroup,
            },
          ],
        }),
    ],
    [
      "relación de categoría",
      () =>
        createSource({
          products: [{ ...createSource().products[0]!, categoryId: "category-inexistente" }],
        }),
    ],
    [
      "asignación de modificador",
      () =>
        createSource({
          productModifierGroups: [
            {
              brandId: IDS.brand,
              productId: IDS.product,
              modifierGroupId: "group-inexistente",
            },
          ],
        }),
    ],
  ])("rechaza una fuente con %s inválido", (_case, source) => {
    expectInvalidSource(source());
  });

  it("conserva como causa el error específico producido por el dominio", () => {
    const result = mapCatalogSource(
      createSource({
        products: [{ ...createSource().products[0]!, offerPriceCents: 10_000 }],
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "invalid_source",
        cause: {
          code: "INVALID_PRODUCT_PRICE",
          path: "sale",
          details: { reason: "not_lower_than_regular" },
        },
      },
    });
  });

  it("entrega un snapshot y arreglos públicos inmutables", () => {
    const snapshot = expectSuccess(requiredGroupSource());

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.brand)).toBe(true);
    expect(Object.isFrozen(snapshot.location)).toBe(true);
    expect(Object.isFrozen(snapshot.categories)).toBe(true);
    expect(Object.isFrozen(snapshot.categories[0])).toBe(true);
    expect(Object.isFrozen(snapshot.categories[0]?.products)).toBe(true);
    expect(Object.isFrozen(snapshot.categories[0]?.products[0])).toBe(true);
    expect(Object.isFrozen(snapshot.categories[0]?.products[0]?.image)).toBe(true);
  });
});
