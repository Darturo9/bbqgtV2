import type { CatalogReadResult } from "../model/catalog-read-result";

type CatalogNonSuccessResult = Exclude<CatalogReadResult, { status: "success" }>;

type CatalogStateProps = Readonly<{
  result: CatalogNonSuccessResult;
}>;

function StateShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="bg-brand-dark relative grid min-h-screen place-items-center overflow-hidden px-6 py-16 text-white">
      <div className="bg-brand-primary absolute top-0 left-0 h-3 w-full" aria-hidden="true" />
      <div
        className="absolute -top-24 -right-28 h-80 w-80 rotate-12 border-[52px] border-white/[0.035]"
        aria-hidden="true"
      />
      <section className="relative w-full max-w-2xl border border-white/15 bg-black/15 p-7 shadow-2xl sm:p-12">
        <p className="font-brand text-brand-primary text-3xl tracking-[0.08em] uppercase">
          BBQBROS
        </p>
        {children}
      </section>
    </main>
  );
}

export function CatalogState({ result }: CatalogStateProps) {
  if (result.status === "empty") {
    return (
      <StateShell>
        <p className="mt-8 text-xs font-black tracking-[0.22em] text-white/50 uppercase">
          Disponibilidad temporal
        </p>
        <h1 className="font-editorial mt-3 text-4xl leading-tight font-bold sm:text-5xl">
          No hay productos disponibles por ahora
        </h1>
        <p className="mt-5 max-w-xl leading-7 text-white/70">
          El menú de {result.brandName} en {result.locationName} está temporalmente vacío.
        </p>
        <p className="mt-8 border-l-4 border-[var(--bbq-yellow)] pl-4 text-sm text-white/55">
          Vuelve pronto para consultar la disponibilidad actualizada.
        </p>
      </StateShell>
    );
  }

  if (result.status === "not_found") {
    return (
      <StateShell>
        <p className="mt-8 text-xs font-black tracking-[0.22em] text-white/50 uppercase">
          Ubicación no encontrada
        </p>
        <h1 className="font-editorial mt-3 text-4xl leading-tight font-bold sm:text-5xl">
          Este menú no está disponible
        </h1>
        <p className="mt-5 max-w-xl leading-7 text-white/70">
          No encontramos una marca y sede públicas con esta configuración.
        </p>
        <form action="/" method="get">
          <button
            className="bg-brand-primary text-brand-dark mt-8 inline-flex min-h-11 cursor-pointer items-center border-0 px-5 py-3 text-sm font-black tracking-[0.08em] uppercase"
            type="submit"
          >
            Consultar menú principal
          </button>
        </form>
      </StateShell>
    );
  }

  return (
    <StateShell>
      <p className="mt-8 text-xs font-black tracking-[0.22em] text-white/50 uppercase">
        Falla temporal
      </p>
      <h1 className="font-editorial mt-3 text-4xl leading-tight font-bold sm:text-5xl">
        No pudimos cargar el menú
      </h1>
      <p className="mt-5 max-w-xl leading-7 text-white/70">
        Puedes recargar la página para intentarlo nuevamente.
      </p>
      <form action="/" method="get">
        <button
          className="bg-brand-primary text-brand-dark mt-8 inline-flex min-h-11 cursor-pointer items-center border-0 px-5 py-3 text-sm font-black tracking-[0.08em] uppercase"
          type="submit"
        >
          Reintentar carga
        </button>
      </form>
      <p className="mt-6 font-mono text-xs text-white/40">Referencia: {result.reference}</p>
    </StateShell>
  );
}
