import type { CatalogCategory } from "../model/catalog-snapshot";
import { ProductCard } from "./product-card";

type CatalogSectionProps = Readonly<{
  category: CatalogCategory;
  index: number;
}>;

export function CatalogSection({ category, index }: CatalogSectionProps) {
  const headingId = `category-${category.id}`;

  return (
    <section
      aria-labelledby={headingId}
      className="scroll-mt-6 border-t border-black/15 pt-8 sm:pt-10"
      id={`categoria-${category.slug}`}
    >
      <div className="mb-6 grid gap-3 sm:mb-8 sm:grid-cols-[5rem_1fr] sm:items-end">
        <p aria-hidden="true" className="font-brand text-brand-primary text-5xl leading-none">
          {String(index + 1).padStart(2, "0")}
        </p>
        <div>
          <h2 id={headingId} className="font-editorial text-3xl font-bold sm:text-4xl">
            {category.name}
          </h2>
          {category.description === undefined ? null : (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/60">{category.description}</p>
          )}
        </div>
      </div>

      <ul
        aria-label={`Productos de ${category.name}`}
        className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3"
      >
        {category.products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}
