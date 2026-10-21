import { Suspense } from "react";
import { brand } from "@/brand.config";
import { Calculator, CalculatorSkeleton } from "@/components/Calculator";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-8 sm:pt-12">
        <header className="mb-8 space-y-3">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Co kdybych<span className="text-accent">?</span>
          </h1>
          <p className="max-w-xl text-lg text-balance text-muted">{brand.tagline}</p>
        </header>
        {/* The calculator reads the shared inputs from the URL, which only the browser knows.
            Suspense keeps the rest of the page static and shows a skeleton meanwhile. */}
        <Suspense fallback={<CalculatorSkeleton />}>
          <Calculator />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
