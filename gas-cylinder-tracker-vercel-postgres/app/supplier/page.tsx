import { Notice } from "@/components/Notice";
import { StatusBadge } from "@/components/StatusBadge";
import { createSupplierReplacement, updateSupplierReplacement } from "@/lib/actions";
import { prettyEnum, REPLACEMENT_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { dateTimeLocal, displayDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function SupplierPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const params = await searchParams;
  const [eligible, operators, replacements] = await Promise.all([
    prisma.cylinder.findMany({ where: { isOn: false, currentStatus: { in: ["EMPTY", "WAITING_FOR_SUPPLIER"] } }, include: { position: true }, orderBy: { cylinderCode: "asc" } }),
    prisma.operator.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.supplierReplacement.findMany({ orderBy: { requestDate: "desc" }, include: { requestedBy: true, items: { include: { cylinder: true } } } }),
  ]);
  return <>
    <div className="page-head"><div><div className="kicker">External refill cycle</div><h2>Supplier Replacement</h2><p>Request, schedule, deliver, and complete replacement batches without losing cylinder identity.</p></div></div>
    <Notice searchParams={params}/>
    {eligible.filter((c) => c.position?.area === "BOTTOM").length === 4 && <div className="notice alert">4 empty cylinders ready for supplier replacement.</div>}
    <div className="grid two-col">
      <section className="panel"><h3>Create replacement request</h3><form action={createSupplierReplacement}><div className="form-grid">
        <div className="field"><label>Date requested</label><input type="datetime-local" name="requestDate" defaultValue={dateTimeLocal()} required/></div>
        <div className="field"><label>Requested by</label><select name="operatorId" required defaultValue=""><option value="" disabled>Select operator</option>{operators.map(o=><option value={o.id} key={o.id}>{o.name}</option>)}</select></div>
        <div className="field full"><label>Supplier</label><input name="supplier" placeholder="Supplier company/name" required/></div>
        <div className="field full"><label>Empty cylinders</label><div className="checkbox-list">{eligible.map(c=><label className="check" key={c.id}><input type="checkbox" name="cylinderIds" value={c.id}/><span><strong>{c.cylinderCode}</strong><br/><span className="muted small">{c.position?.positionName}</span></span></label>)}</div>{!eligible.length && <p className="muted small">No eligible empty cylinders.</p>}</div>
        <div className="field full"><label>Notes</label><textarea name="notes"/></div>
      </div><div className="form-actions"><button className="btn btn-primary" disabled={!eligible.length}>CREATE REQUEST</button></div></form></section>
      <section className="panel"><h3>Replacement history</h3><div className="replacement">{replacements.map(r=><article className="replacement-card" key={r.id}><div className="replacement-top"><div><strong>{r.supplier}</strong><div className="muted small">Requested {displayDate(r.requestDate)} by {r.requestedBy.name}</div></div><span className="badge">{prettyEnum(r.status)}</span></div><p className="small">{r.items.map(i=>i.cylinder.cylinderCode).join(", ")} · {r.items.length} cylinder(s)</p>{r.items.map(i=><StatusBadge key={i.id} status={i.cylinder.currentStatus}/>)}<details className="disclosure"><summary>Update status ▾</summary><form action={updateSupplierReplacement}><input type="hidden" name="replacementId" value={r.id}/><div className="field"><label>Status</label><select name="status" defaultValue={r.status}>{REPLACEMENT_STATUSES.map(s=><option key={s} value={s}>{prettyEnum(s)}</option>)}</select></div><div className="field"><label>Operator</label><select name="operatorId" required defaultValue=""><option value="" disabled>Select operator</option>{operators.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></div><div className="field"><label>Event time</label><input type="datetime-local" name="eventTime" defaultValue={dateTimeLocal()} required/></div><button className="btn btn-primary btn-wide" style={{marginTop:8}}>Update batch</button></form></details></article>)}{!replacements.length && <p className="empty">No supplier replacement history yet.</p>}</div></section>
    </div>
  </>;
}
