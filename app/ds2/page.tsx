import NintendoDS2 from "@/components/NintendoDS-2";

export default function DS2PreviewPage() {
  return (
    <main className="flex min-h-[100dvh] w-full items-center justify-center bg-zinc-900 p-6">
      <div className="w-full max-w-[720px]">
        <NintendoDS2 className="h-auto w-full" />
      </div>
    </main>
  );
}
