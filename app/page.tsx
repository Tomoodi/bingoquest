export default function StudentLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-white">
      {/* タイトルロゴ */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold tracking-widest text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">
          BINGO QUEST
        </h1>
        <p className="mt-2 text-xs font-medium tracking-wide text-slate-400 uppercase">
          ビンゴで学んで、クラスでボスを倒そう！
        </p>
      </div>

      {/* ログインカード */}
      <div className="w-full max-w-md border border-slate-800/80 bg-slate-900/50 backdrop-blur-md p-8 rounded-2xl shadow-2xl">
        <h2 className="text-xl font-bold text-center mb-8 tracking-wider text-purple-400">
          生徒用ログイン
        </h2>
        
        <div className="space-y-6">
          {/* 氏名入力 */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              氏名
            </label>
            <input 
              type="text" 
              placeholder="名前を入力（例: 山田 太郎）" 
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 transition-all duration-200 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" 
            />
          </div>

          {/* クラスコード入力 */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              クラスコード（先生に聞いてね）
            </label>
            <input 
              type="text" 
              maxLength={6}
              placeholder="0 0 0 0 0 0" 
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-center text-xl font-mono font-bold tracking-widest text-amber-400 placeholder-slate-700 transition-all duration-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" 
            />
          </div>

          {/* ログインボタン */}
          <button 
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] text-white font-bold py-3.5 rounded-xl mt-4 shadow-lg shadow-purple-900/20 transition-all duration-150 tracking-wider text-sm"
          >
            ログイン
          </button>
        </div>
      </div>

      {/* フッター */}
      <div className="mt-12 text-[10px] font-mono tracking-widest text-slate-600 uppercase">
        BINGO QUEST - Student Mode
      </div>
    </div>
  );
}