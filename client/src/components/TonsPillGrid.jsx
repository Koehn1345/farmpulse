const fmtNum = (n) => new Intl.NumberFormat('en-US').format(n);

export default function TonsPillGrid({ title, data }) {
  return (
    <div className="card">
      <h2 className="text-sm font-semibold text-slate-300 mb-4">{title}</h2>
      {data.length === 0 ? (
        <div className="text-xs text-slate-600">No data yet</div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {data.map(d => (
            <div key={d.name} className="flex flex-col items-center justify-center px-5 py-3 rounded-xl bg-slate-800/60 border border-slate-700 min-w-[104px]">
              <div className="text-xs text-slate-400 mb-1 truncate max-w-[120px]">{d.name}</div>
              <div className="text-lg font-semibold text-soil-300 font-mono">{fmtNum(Number(d.tons.toFixed(1)))}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">tons</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// The six inventory panels: tons left and total estimated, each by
// cutting / type / commodity. Shared by the farm dashboard and the
// Outside Shippers page.
export function InventoryPanels({ data }) {
  return (
    <>
      <h2 className="text-sm font-semibold text-slate-300 mb-1">Tons Left in Inventory</h2>
      <p className="text-xs text-slate-500 mb-4">Estimated tonnage not yet hauled, by cutting/type/commodity.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TonsPillGrid title="Inventory By Cutting" data={data.tonsByCutting || []} />
        <TonsPillGrid title="Inventory By Type" data={data.tonsByType || []} />
        <TonsPillGrid title="Inventory By Commodity" data={[...(data.tonsByStackCommodity || []), ...(data.tonsByGrainCommodity || [])]} />
      </div>
      <h2 className="text-sm font-semibold text-slate-300 mt-8 mb-1">Total Estimated</h2>
      <p className="text-xs text-slate-500 mb-4">What you started with: estimated tons entered on each stack or bag, by cutting/type/commodity.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TonsPillGrid title="Total Estimated By Cutting" data={data.estByCutting || []} />
        <TonsPillGrid title="Total Estimated By Type" data={data.estByType || []} />
        <TonsPillGrid title="Total Estimated By Commodity" data={data.estByCommodity || []} />
      </div>
    </>
  );
}
