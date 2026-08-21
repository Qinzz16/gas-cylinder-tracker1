import { StatusBadge } from "@/components/StatusBadge";
import { prisma } from "@/lib/prisma";
import { displayDate, formatDuration } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [cylinders, sessions, events, replacements] = await Promise.all([
    prisma.cylinder.findMany({ include: { position: true }, orderBy: { cylinderCode: "asc" } }),
    prisma.usageSession.findMany({ include: { cylinder: true, turnedOnBy: true, turnedOffBy: true }, orderBy: { turnedOnAt: "desc" } }),
    prisma.cylinderEvent.findMany({ where: { eventType: { in: ["TURN_ON", "TURN_OFF", "SWAP_CYLINDER"] } }, include: { operator: true } }),
    prisma.supplierReplacement.findMany({ where: { status: { in: ["DELIVERED", "COMPLETED"] } }, include: { items: true }, orderBy: { deliveryDate: "asc" } }),
  ]);
  const completed = sessions.filter(s => s.durationSeconds != null);
  const average = completed.length ? Math.round(completed.reduce((sum,s)=>sum+(s.durationSeconds ?? 0),0)/completed.length) : null;
  const activity = new Map<string, { on:number; off:number; swap:number }>();
  events.forEach(e => { const name=e.operator?.name ?? "System"; const row=activity.get(name) ?? {on:0,off:0,swap:0}; if(e.eventType==="TURN_ON")row.on++; if(e.eventType==="TURN_OFF")row.off++; if(e.eventType==="SWAP_CYLINDER")row.swap++; activity.set(name,row); });
  const intervals = replacements.slice(1).map((r,i)=> r.deliveryDate && replacements[i].deliveryDate ? Math.round((r.deliveryDate.getTime()-replacements[i].deliveryDate!.getTime())/86400000) : null).filter((v):v is number=>v!=null);
  return <>
    <div className="page-head"><div><div className="kicker">Operational summaries</div><h2>Reports</h2><p>Live inventory, lifetime usage, staff activity, and supplier cycles.</p></div></div>
    <div className="grid stats"><div className="stat"><strong>{cylinders.filter(c=>c.isOn).length}</strong><span>Currently ON</span></div><div className="stat"><strong>{cylinders.filter(c=>c.currentStatus==="ALMOST_EMPTY").length}</strong><span>Almost empty</span></div><div className="stat"><strong>{cylinders.filter(c=>c.currentStatus==="FULL"&&c.position?.area==="BOTTOM").length}</strong><span>Full reserve</span></div><div className="stat"><strong>{cylinders.filter(c=>c.currentStatus==="EMPTY").length}</strong><span>Empty</span></div><div className="stat"><strong>{cylinders.filter(c=>c.currentStatus==="WAITING_FOR_SUPPLIER").length}</strong><span>Waiting supplier</span></div></div>
    <div className="grid report-grid">
      <section className="panel"><h3>Cylinder usage</h3><p className="muted small">Overall completed-session average: <strong>{formatDuration(average)}</strong></p><div className="table-wrap"><table><thead><tr><th>Cylinder</th><th>Status</th><th>Total usage</th><th>Average</th><th>Uses</th><th>Last ON</th><th>Last OFF</th></tr></thead><tbody>{cylinders.map(c=>{const own=sessions.filter(s=>s.cylinderId===c.id);const done=own.filter(s=>s.durationSeconds!=null);const total=done.reduce((sum,s)=>sum+(s.durationSeconds??0),0);return <tr key={c.id}><td><strong>{c.cylinderCode}</strong></td><td><StatusBadge status={c.currentStatus}/></td><td>{formatDuration(total)}</td><td>{formatDuration(done.length?Math.round(total/done.length):null)}</td><td>{own.length}</td><td>{displayDate(own[0]?.turnedOnAt)}</td><td>{displayDate(own.find(s=>s.turnedOffAt)?.turnedOffAt)}</td></tr>})}</tbody></table></div></section>
      <section className="panel"><h3>Staff activity</h3><div className="table-wrap"><table><thead><tr><th>Operator</th><th>Turn ON</th><th>Turn OFF</th><th>Swap movements</th></tr></thead><tbody>{Array.from(activity).map(([name,a])=><tr key={name}><td><strong>{name}</strong></td><td>{a.on}</td><td>{a.off}</td><td>{a.swap}</td></tr>)}{!activity.size&&<tr><td colSpan={4} className="empty">No activity recorded yet.</td></tr>}</tbody></table></div></section>
      <section className="panel"><h3>Supplier cycles</h3><div className="metric-list"><div className="metric-row"><span>Completed/delivered cycles</span><strong>{replacements.length}</strong></div><div className="metric-row"><span>Average time between cycles</span><strong>{intervals.length ? `${Math.round(intervals.reduce((a,b)=>a+b,0)/intervals.length)} days` : "—"}</strong></div><div className="metric-row"><span>Cylinders replaced</span><strong>{replacements.reduce((n,r)=>n+r.items.length,0)}</strong></div><div className="metric-row"><span>Last delivery</span><strong>{displayDate(replacements.at(-1)?.deliveryDate)}</strong></div></div></section>
      <section className="panel"><h3>Current positions</h3><div className="metric-list">{cylinders.map(c=><div className="metric-row" key={c.id}><span>{c.cylinderCode} · {c.position?.positionName}</span><strong>{c.isOn ? `ON · ${c.currentSide}` : "OFF"}</strong></div>)}</div></section>
    </div>
  </>;
}
