import type { CatalogProduct } from "../model/catalog-snapshot";

const GTQ_FORMATTER = new Intl.NumberFormat("es-GT", {
  style: "currency",
  currency: "GTQ",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatQuetzales(cents: number): string {
  return GTQ_FORMATTER.format(cents / 100).replaceAll("\u00a0", " ");
}

type PriceProps = Readonly<{
  regularPriceCents: CatalogProduct["regularPriceCents"];
  currentPriceCents: CatalogProduct["currentPriceCents"];
  isOnOffer: CatalogProduct["isOnOffer"];
}>;

export function Price({ regularPriceCents, currentPriceCents, isOnOffer }: PriceProps) {
  const currentPrice = formatQuetzales(currentPriceCents);

  if (!isOnOffer) {
    return (
      <p aria-label={`Precio ${currentPrice}`} className="font-editorial text-2xl font-bold">
        {currentPrice}
      </p>
    );
  }

  const regularPrice = formatQuetzales(regularPriceCents);

  return (
    <div
      aria-label={`Precio de oferta ${currentPrice}; precio normal ${regularPrice}`}
      className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
    >
      <span className="font-editorial text-brand-primary text-2xl font-bold">{currentPrice}</span>
      <del className="text-sm text-white/55 decoration-2">{regularPrice}</del>
      <span className="bg-brand-primary text-brand-dark px-2 py-1 text-[0.65rem] font-black tracking-[0.14em] uppercase">
        Oferta
      </span>
    </div>
  );
}
