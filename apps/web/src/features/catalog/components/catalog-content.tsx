import type { CatalogReadResult } from "../model/catalog-read-result";
import type { CatalogSnapshot } from "../model/catalog-snapshot";
import { CatalogSection } from "./catalog-section";
import { CatalogState } from "./catalog-state";

type CatalogContentProps = Readonly<{
  result: CatalogReadResult;
}>;

function CatalogHeader({ snapshot }: Readonly<{ snapshot: CatalogSnapshot }>) {
  return (
    <header className="bg-brand-dark relative overflow-hidden text-white">
      <div className="bg-brand-primary absolute top-0 left-0 h-3 w-full" aria-hidden="true" />
      <div
        className="absolute -top-28 -right-32 h-96 w-96 rotate-12 border-[58px] border-white/[0.035]"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-7xl px-5 pt-10 pb-14 sm:px-8 sm:pt-12 sm:pb-20 lg:px-12">
        <div className="flex items-center justify-between gap-5 border-b border-white/15 pb-5">
          <p className="font-brand text-brand-primary text-3xl tracking-[0.08em] uppercase">
            {snapshot.brand.name}
          </p>
          <p className="text-right text-[0.65rem] font-black tracking-[0.18em] text-white/55 uppercase">
            Solo entrega a domicilio
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div>
            <p className="text-brand-primary text-xs font-black tracking-[0.24em] uppercase">
              Brasas encendidas · sabor sin atajos
            </p>
            <h1 className="font-editorial mt-4 max-w-4xl text-5xl leading-[0.98] font-bold text-balance sm:text-6xl lg:text-7xl">
              Menú a domicilio
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
              Elige entre los productos disponibles hoy. Aquí ves el precio vigente y las opciones
              que puedes personalizar.
            </p>
          </div>

          <div className="border-brand-primary border-l-4 bg-white/[0.04] p-5">
            <p className="text-[0.65rem] font-black tracking-[0.2em] text-white/45 uppercase">
              Preparando desde
            </p>
            <p className="font-editorial mt-2 text-xl font-bold">{snapshot.location.name}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function SuccessfulCatalog({ snapshot }: Readonly<{ snapshot: CatalogSnapshot }>) {
  const categories = snapshot.categories.filter(({ products }) => products.length > 0);

  return (
    <main className="min-h-screen bg-[#f4efe5] text-[var(--bbq-black)]">
      <CatalogHeader snapshot={snapshot} />

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16">
        <nav aria-label="Categorías del menú" className="mb-12 overflow-x-auto pb-2">
          <ul className="flex min-w-max list-none gap-2 p-0">
            {categories.map((category) => (
              <li key={category.id}>
                <a
                  className="border-brand-dark/20 hover:border-brand-dark hover:bg-brand-dark hover:text-brand-primary inline-flex min-h-11 items-center border px-4 py-2 text-xs font-black tracking-[0.12em] uppercase transition-colors"
                  href={`#categoria-${category.slug}`}
                >
                  {category.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-16 sm:space-y-20">
          {categories.map((category, index) => (
            <CatalogSection category={category} index={index} key={category.id} />
          ))}
        </div>
      </div>

      <footer className="bg-brand-dark mt-8 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <p className="font-brand text-brand-primary text-2xl tracking-[0.08em] uppercase">
            {snapshot.brand.name}
          </p>
          <p className="text-xs tracking-[0.12em] text-white/45 uppercase">
            Catálogo para entrega a domicilio
          </p>
        </div>
      </footer>
    </main>
  );
}

export function CatalogLoading() {
  return (
    <main
      aria-live="polite"
      className="bg-brand-dark grid min-h-screen place-items-center px-6 text-white"
      role="status"
    >
      <div className="text-center">
        <p className="font-brand text-brand-primary text-4xl tracking-[0.08em] uppercase">
          BBQBROS
        </p>
        <div className="mx-auto my-6 h-1 w-20 overflow-hidden bg-white/10" aria-hidden="true">
          <span className="bg-brand-primary block h-full w-1/2 animate-pulse" />
        </div>
        <p className="text-sm tracking-[0.16em] text-white/60 uppercase">Cargando el menú…</p>
      </div>
    </main>
  );
}

export function CatalogContent({ result }: CatalogContentProps) {
  if (result.status === "success") {
    return <SuccessfulCatalog snapshot={result.snapshot} />;
  }

  return <CatalogState result={result} />;
}
