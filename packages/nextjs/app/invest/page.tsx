import { useRouter } from "next/navigation";


export default function InvestPage() {
  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-4">📈 Invest in the Vault</h1>
      <p className="text-gray-600">
        This page will allow investors to fund the vault and track projected returns from asset revenue.
      </p>

      {/* TODO: Hook in investor form + stats */}
    </main>
  );
}
