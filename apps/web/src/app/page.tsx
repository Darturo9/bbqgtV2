export default function HomePage() {
  return (
    <main className="bg-brand-dark text-brand-light grid min-h-screen place-items-center p-6">
      <section className="max-w-xl text-center" aria-labelledby="page-title">
        <p className="text-brand-primary mb-3 text-sm font-semibold tracking-[0.24em] uppercase">
          BBQBROS
        </p>
        <h1 id="page-title" className="font-editorial text-4xl font-bold sm:text-5xl">
          Pedidos a domicilio
        </h1>
        <div className="bg-brand-primary mx-auto my-5 h-1 w-16" aria-hidden="true" />
        <p className="text-brand-light/75 text-base">La nueva experiencia está en construcción.</p>
      </section>
    </main>
  );
}
