import Link from "next/link";

export default function Home() {
  return (
     <main className="p-6">
      <h1 className="text-xl font-semibold">Simple CRM</h1>
      <p className="mt-2">Go to <Link className="underline" href="/(dashboard)">Dashboard</Link></p>
    </main>
  );
}
