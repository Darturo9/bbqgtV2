import Image from "next/image";

import type { CatalogProduct } from "../model/catalog-snapshot";
import { Price } from "./price";

type ProductCardProps = Readonly<{
  product: CatalogProduct;
}>;

function ProductImage({ image, name }: Pick<CatalogProduct, "image" | "name">) {
  if (image.kind === "public") {
    return (
      <Image
        fill
        alt={image.alt}
        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
        src={image.src}
      />
    );
  }

  return (
    <div
      aria-label={image.alt}
      className="bg-brand-primary text-brand-dark absolute inset-0 grid place-items-center overflow-hidden"
      role="img"
    >
      <span className="absolute -top-8 -right-5 h-24 w-24 rotate-12 border-[14px] border-black/10" />
      <span className="absolute -bottom-9 -left-8 h-28 w-28 rounded-full border-[18px] border-black/10" />
      <span className="relative grid place-items-center text-center">
        <span className="font-brand text-3xl tracking-[0.08em] uppercase">BBQBROS</span>
        <span className="mt-1 text-[0.62rem] font-black tracking-[0.24em] uppercase">
          Hecho al fuego
        </span>
      </span>
      <span className="sr-only">Imagen no disponible para {name}</span>
    </div>
  );
}

export function ProductCard({ product }: ProductCardProps) {
  const headingId = `product-${product.id}`;

  return (
    <article
      aria-labelledby={headingId}
      className="group bg-brand-dark grid h-full overflow-hidden border border-black/10 shadow-[0_18px_45px_rgba(35,31,32,0.12)] sm:grid-rows-[13rem_1fr]"
    >
      <div className="relative aspect-[16/10] overflow-hidden border-b-4 border-[var(--bbq-yellow)] sm:aspect-auto">
        <ProductImage image={product.image} name={product.name} />
      </div>

      <div className="flex min-h-52 flex-col p-5 text-white sm:p-6">
        {product.isCustomizable ? (
          <span className="border-brand-primary text-brand-primary inline-flex self-start border px-2.5 py-1 text-[0.65rem] font-black tracking-[0.14em] uppercase">
            <span className="mr-1.5" aria-hidden="true">
              +
            </span>
            Personalizable
          </span>
        ) : null}

        <h3 id={headingId} className="font-editorial mt-4 text-2xl leading-tight font-bold">
          {product.name}
        </h3>
        {product.description === undefined ? null : (
          <p className="mt-2 text-sm leading-6 text-white/65">{product.description}</p>
        )}

        <div className="mt-auto border-t border-white/10 pt-5">
          <Price
            currentPriceCents={product.currentPriceCents}
            isOnOffer={product.isOnOffer}
            regularPriceCents={product.regularPriceCents}
          />
        </div>
      </div>
    </article>
  );
}
