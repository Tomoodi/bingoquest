"use client";

import React, { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const BINGO_LINES = [
  [1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15], [16, 17, 18, 19, 20], [21, 22, 23, 24, 25],
  [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24], [5, 10, 15, 20, 25],
  [1, 7, 13, 19, 25], [5, 9, 13, 17, 21]
];

const SESSION_STORAGE_KEY = "bingoQuestSession";

type Cell = {
  position: number;
  text: string;
  is_free: boolean;
};

export default function BingoPlayPage() {
  const router = useRouter();
  const [cells, setCells] = useState<Cell[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [className, setClassName] = useState("");
  const [openedCells, setOpenedCells] = useState<{ [key: number]: boolean }>({});
  const [showAnimation, setShowAnimation] = useState(false);
  const previousAchievedLineIndexes = useRef<number[]>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) {
      router.replace("/");
      return;
    }

    const session = JSON.parse(stored);
    const cardId = session.bingoCard?.id;

    if (!cardId) {
      router.replace("/bingo-create");
      return;
    }

    setClassName(session.class?.name ?? "");

    supabase
      .from("bingo_cells")
      .select("position, text, is_free")
      .eq("card_id", cardId)
      .order("position")
      .then(({ data, error }) => {
        if (error || !data) {
          console.error("Failed to fetch cells:", error);
          return;
        }
        startTransition(() => {
          setCells(data);
          setIsLoading(false);
        });
      });
  }, [router]);

  const cellMap = useMemo(() => {
    const map: { [key: number]: string } = {};
    cells.forEach((cell) => {
      map[cell.position + 1] = cell.text;
    });
    return map;
  }, [cells]);

  const handleCellClick = (id: number) => {
    if (id === 13) return;
    setOpenedCells((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const gridCells = Array.from({ length: 25 }, (_, i) => i + 1);
  const openedCount = gridCells.filter((id) => id !== 13 && openedCells[id]).length;

  const achievedLineIndexes = useMemo(() => {
    return BINGO_LINES.reduce<number[]>((indexes, line, index) => {
      const isComplete = line.every((id) => id === 13 || !!openedCells[id]);
      if (isComplete) indexes.push(index);
      return indexes;
    }, []);
  }, [openedCells]);

  useEffect(() => {
    const newlyDiscoveredLines = achievedLineIndexes.filter(
      (idx) => !previousAchievedLineIndexes.current.includes(idx)
    );
    if (newlyDiscoveredLines.length > 0) {
      startTransition(() => setShowAnimation(true));
    }
    previousAchievedLineIndexes.current = achievedLineIndexes;
  }, [achievedLineIndexes]);

  useEffect(() => {
    if (!showAnimation) return;
    const timer = setTimeout(() => setShowAnimation(false), 1200);
    return () => clearTimeout(timer);
  }, [showAnimation]);

  const bingoLinesCount = achievedLineIndexes.length;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-sm font-bold tracking-widest text-slate-500">LOADING...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white font-sans relative overflow-hidden">

      <div className="w-full bg-slate-900/60 border-b border-slate-800 p-4 sticky top-0 z-10 backdrop-blur flex justify-between items-center shadow-md">
        <div>
          <h1 className="text-base font-black text-slate-100 tracking-wide">{className} カード</h1>
          <p className="text-[10px] text-slate-500 mt-0.5">条件達成で自動的に必殺技が発動！</p>
        </div>
        <div className="text-right font-mono">
          <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-widest">Hit Matrix</span>
          <div className="flex items-baseline justify-end gap-0.5">
            <span className="text-2xl font-black text-emerald-400">{openedCount}</span>
            <span className="text-xs text-slate-600"> / 24</span>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-md w-full mx-auto px-3 py-6 flex flex-col justify-center">
        <div className="grid grid-cols-5 gap-2 w-full aspect-square">
          {gridCells.map((id) => {
            if (id === 13) {
              return (
                <div key={id} className="rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center justify-center aspect-square select-none">
                  <span className="text-[10px] font-black text-amber-500/80">FREE</span>
                </div>
              );
            }

            const isOpened = !!openedCells[id];

            return (
              <button
                key={id}
                type="button"
                onClick={() => handleCellClick(id)}
                className={`
                  relative rounded-xl border p-1 text-center flex flex-col items-center justify-center aspect-square transition-all duration-150 select-none outline-none active:scale-95
                  ${isOpened
                    ? "border-emerald-500 bg-gradient-to-br from-emerald-950/40 to-slate-900 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)] font-bold"
                    : "border-slate-800/80 bg-slate-900/20 text-slate-400 hover:border-slate-700"
                  }
                `}
              >
                <span className={`absolute top-1 left-1.5 font-mono text-[8px] ${isOpened ? "text-emerald-500/60" : "text-slate-700"}`}>{id > 13 ? id - 1 : id}</span>
                <span className="text-[9px] leading-tight font-bold break-all px-0.5">{cellMap[id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {showAnimation && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 animate-fadeIn transition-all duration-300">
          {bingoLinesCount >= 2 ? (
            <div className="text-center space-y-4 max-w-sm w-full p-2 animate-scaleUp">
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-orange-600 filter drop-shadow-[0_0_20px_rgba(245,158,11,0.6)] uppercase italic">
                {bingoLinesCount === 2 ? "Double" : bingoLinesCount === 3 ? "Triple" : `${bingoLinesCount}Line`} <br />
                <span className="text-6xl md:text-7xl block mt-1 tracking-tight">BINGO!!</span>
              </h2>
              <div className="inline-block px-4 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full">
                <span className="font-mono text-sm font-black text-amber-400 tracking-wider">CRITICAL ATTACK +{bingoLinesCount * 250}PT</span>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4 max-w-sm w-full p-2 animate-scaleUp">
              <h2 className="text-6xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-purple-300 via-fuchsia-500 to-indigo-700 filter drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] uppercase italic">
                BINGO!
              </h2>
              <div className="inline-block px-4 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full">
                <span className="font-mono text-xs font-black text-purple-300 tracking-wider">BOSS DAMAGE +150PT</span>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
