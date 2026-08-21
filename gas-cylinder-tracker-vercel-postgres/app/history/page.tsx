import { Prisma } from "@prisma/client";
import { Notice } from "@/components/Notice";
import { StatusBadge } from "@/components/StatusBadge";
import { correctUsageSession } from "@/lib/actions";
import { STATUS_LABELS, prettyEnum } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { dateTimeLocal, displayDate, formatDuration } from "@/lib/time";

export const dynamic = "force-dynamic";

type Params = { from?: string; to?: string; cylinder?: string; operator?: string; side?: string; status?: string; success?: string; error?: string };

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const sessionWhere: Prisma.UsageSessionWhereInput = {};
  if (params.cylinder) sessionWhere.cylinderId = params.cylinder;
  if (params.side) sessionWhere.side = params.side;
  if (params.status) sessionWhere.finalStatus = params.status;
  if (params.from || params.to) sessionWhere.turnedOnAt = { ...(params.from ? { gte: new Date(`${params.from}T00:00:00+08:00`) } : {}), ...(params.to ? { lte: new Date(`${params.to}T23:59:59+08:00`) } : {}) };
  if (params.operator) sessionWhere.OR = [{ turnedOnById: params.operator }, { turnedOffById: params.operator }];
  const [sessions, events, cylinders, operators] = await Promise.all([
    prisma.usageSession.findMany({ where: sessionWhere, orderBy: { turnedOnAt: "desc" }, include: { cylinder: true, turnedOnBy: true, turnedOffBy: true }, take: 200 }),
    prisma.cylinderEvent.findMany({ where: params.cylinder ? { cylinderId: params.cylinder } : {}, orderBy: { eventTime: "desc" }, include: { cylinder: true, operator: true }, take: 100 }),
    prisma.cylinder.findMany({ orderBy: { cylinderCode: "asc" } }),
    prisma.operator.findMany({ orderBy: { name: "asc" } }),
  ]);
  const admins = operators.filter((o) => o.role === "ADMIN" && o.active);
  return <>
    <div className="page-head"><div><div className="kicker">Permanent records</div><h2>Usage & audit history</h2><p>Usage sessions remain separate from the complete event trail.</p></div></div>
    <Notice searchParams={params}/>
    <form className="filters">
      <input type="date" name="from" defaultValue={params.from}/><input type="date" name="to" defaultValue={params.to}/>
      <select name="cylinder" defaultValue={params.cylinder ?? ""}><option value="">All cylinders</option>{cylinders.map((c) => <option value={c.id} key={c.id}>{c.cylinderCode}</option>)}</select>
      <select name="operator" defaultValue={params.operator ?? ""}><option value="">All operators</option>{operators.map((o) => <option value={o.id} key={o.id}>{o.name}</option>)}</select>
      <select name="side" defaultValue={params.side ?? ""}><option value="">Left & Right</option><option value="LEFT">Left</option><option value="RIGHT">Right</option></select>
      <select name="status" defaultValue={params.status ?? ""}><option value="">All final statuses</option>{Object.entries(STATUS_LABELS).map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select>
      <button className="btn btn-primary">Apply filters</button>
    </form>
    <div className="section-head"><h3>Usage sessions</h3><span>{sessions.length} records</span></div>
    <div className="table-wrap"><table><thead><tr><th>Cylinder</th><th>Side</th><th>ON</th><th>OFF</th><th>Duration</th><th>ON By</th><th>OFF By</th><th>Final status</th><th>Admin</th></tr></thead><tbody>
      {sessions.map((s) => <tr key={s.id}><td><strong>{s.cylinder.cylinderCode}</strong></td><td>{prettyEnum(s.side)}</td><td>{displayDate(s.turnedOnAt)}</td><td>{displayDate(s.turnedOffAt)}</td><td>{formatDuration(s.durationSeconds)}</td><td>{s.turnedOnBy.name}</td><td>{s.turnedOffBy?.name ?? "—"}</td><td>{s.finalStatus ? <StatusBadge status={s.finalStatus}/> : <StatusBadge status="IN_USE"/>}</td><td><details><summary>Correct</summary><form action={correctUsageSession} style={{width:280, paddingTop:10}}><input type="hidden" name="sessionId" value={s.id}/><div className="field"><label>ON time</label><input type="datetime-local" name="turnedOnAt" defaultValue={dateTimeLocal(s.turnedOnAt)} required/></div><div className="field"><label>OFF time</label><input type="datetime-local" name="turnedOffAt" defaultValue={s.turnedOffAt ? dateTimeLocal(s.turnedOffAt) : ""}/></div><div className="field"><label>ON by</label><select name="turnedOnById" defaultValue={s.turnedOnById}>{operators.map(o=><option value={o.id} key={o.id}>{o.name}</option>)}</select></div><div className="field"><label>OFF by</label><select name="turnedOffById" defaultValue={s.turnedOffById ?? ""}><option value="">Not yet</option>{operators.map(o=><option value={o.id} key={o.id}>{o.name}</option>)}</select></div><div className="field"><label>Notes</label><textarea name="notes" defaultValue={s.notes ?? ""}/></div><div className="field"><label>Changed by (Admin)</label><select name="changedById" required defaultValue=""><option value="" disabled>Select admin</option>{admins.map(o=><option value={o.id} key={o.id}>{o.name}</option>)}</select></div><div className="field"><label>Reason</label><input name="reason" required/></div><button className="btn btn-primary btn-wide" style={{marginTop:8}}>Save correction</button></form></details></td></tr>)}
      {!sessions.length && <tr><td colSpan={9} className="empty">No usage sessions match these filters.</td></tr>}
    </tbody></table></div>
    <div className="section-head"><h3>Audit log</h3><span>Latest 100 events</span></div>
    <div className="table-wrap"><table><thead><tr><th>Date/time</th><th>Cylinder</th><th>Action</th><th>Status change</th><th>Position change</th><th>Side</th><th>Person</th><th>Notes / correction</th></tr></thead><tbody>
      {events.map((e) => <tr key={e.id}><td>{displayDate(e.eventTime)}</td><td><strong>{e.cylinder?.cylinderCode ?? "System"}</strong></td><td>{prettyEnum(e.eventType)}</td><td>{e.oldStatus ? prettyEnum(e.oldStatus) : "—"} → {e.newStatus ? prettyEnum(e.newStatus) : "—"}</td><td>{e.oldPositionName ?? "—"} → {e.newPositionName ?? "—"}</td><td>{e.side ? prettyEnum(e.side) : "—"}</td><td>{e.operator?.name ?? "System"}</td><td>{e.notes ?? "—"}{e.changeData && <details><summary>View changes</summary><pre style={{whiteSpace:"pre-wrap", maxWidth:300}}>{JSON.stringify(JSON.parse(e.changeData), null, 2)}</pre></details>}</td></tr>)}
    </tbody></table></div>
  </>;
}
