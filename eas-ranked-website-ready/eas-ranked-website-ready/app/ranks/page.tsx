import Shell from "@/components/Shell";
import { ranks } from "@/lib/ranks";

export const revalidate = 30;

export default function RanksPage() {
  return (
    <Shell>
      <h1 className="text-4xl font-black">🏷️ Rank System</h1>
      <p className="mt-2 text-zinc-400">CR thresholds for the EAS competitive ladder.</p>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ranks.map((rank) => (
          <div key={rank.name} className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5">
            <p className="text-xl font-black text-purple-300">{rank.name}</p>
            <p className="mt-2 text-zinc-400">Starts at {rank.min.toLocaleString()} CR</p>
          </div>
        ))}
      </div>
    </Shell>
  );
}
