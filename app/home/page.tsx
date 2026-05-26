export default function StudentHomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      {/* プレイヤー情報ヘッダー */}
      <div className="w-full border-b border-slate-800 bg-slate-900/40 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-sm shadow-md shadow-purple-500/20">
            勇
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">PLAYER</div>
            <div className="text-sm font-bold tracking-wide text-slate-200">ログイン中のあなたの名前</div>
          </div>
        </div>
        <div className="text-xs font-mono bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700 text-slate-400">
          LV. 1
        </div>
      </div>

      {/* メインコンテンツ：クラスコード入力 */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 text-center max-w-sm">
          <div className="inline-block text-[10px] font-bold tracking-widest bg-purple-500/10 border border-purple-500/30 text-purple-400 px-2.5 py-1 rounded-full uppercase mb-3">
            Enter Class Code
          </div>
          <h1 className="text-2xl font-extrabold tracking-wide text-slate-200">クエストを受注しよう！</h1>
          <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
            先生から教えてもらった「クラスコード」を入力すると
            <br />
            ビンゴクエストが始まります。
          </p>
        </div>

        {/* コード入力カード */}
        <div className="w-full max-w-md border border-slate-800/80 bg-slate-900/50 backdrop-blur-md p-8 rounded-2xl shadow-2xl">
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
                クラスコードを入力
              </label>
              <input 
                type="text" 
                maxLength={6}
                placeholder="0 0 0 0 0 0" 
                className="w-full px-4 py-4 bg-slate-950 border border-slate-800 rounded-xl text-center text-2xl font-mono font-bold tracking-[0.5em] text-amber-400 placeholder-slate-700 transition-all duration-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" 
              />
            </div>

            {/* クエスト開始ボタン */}
            <button 
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-[0.98] text-slate-950 font-black py-4 rounded-xl mt-2 shadow-lg shadow-orange-500/10 transition-all duration-150 tracking-widest text-sm uppercase"
            >
              冒険を開始する！
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}