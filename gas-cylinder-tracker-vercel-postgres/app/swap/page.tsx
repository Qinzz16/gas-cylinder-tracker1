import { Notice } from "@/components/Notice";
import { swapCylinders } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { dateTimeLocal } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function SwapPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const params = await searchParams;
  const [cylinders, operators] = await Promise.all([
    prisma.cylinder.findMany({ include: { position: true }, orderBy: { cylinderCode: "asc" } }),
    prisma.operator.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  const outgoing = cylinders.filter((c) => !c.isOn && c.position?.area === "UPPER" && ["EMPTY", "ALMOST_EMPTY"].includes(c.currentStatus));
  const reserves = cylinders.filter((c) => !c.isOn && c.position?.area === "BOTTOM" && ["FULL", "STANDBY"].includes(c.currentStatus));
  return <>
    <div className="page-head"><div><div className="kicker">Position transaction</div><h2>Swap cylinders</h2><p>Exchange one empty upper cylinder with one full bottom reserve. Both movements are audited together.</p></div></div>
    <Notice searchParams={params}/>
    <section className="panel"><form action={swapCylinders}><div className="form-grid">
      <div className="field"><label>Outgoing upper cylinder</label><select name="outgoingId" required defaultValue=""><option value="" disabled>Select empty cylinder</option>{outgoing.map((c) => <option value={c.id} key={c.id}>{c.cylinderCode} · {c.position?.positionName} · {c.currentStatus.replaceAll("_", " ")}</option>)}</select></div>
      <div className="field"><label>Full reserve replacement</label><select name="replacementId" required defaultValue=""><option value="" disabled>Select reserve cylinder</option>{reserves.map((c) => <option value={c.id} key={c.id}>{c.cylinderCode} · {c.position?.positionName} · {c.currentStatus}</option>)}</select></div>
      <div className="field"><label>Performed by</label><select name="operatorId" required defaultValue=""><option value="" disabled>Select operator</option>{operators.map((o) => <option value={o.id} key={o.id}>{o.name}</option>)}</select></div>
      <div className="field"><label>Date and time</label><input type="datetime-local" name="eventTime" defaultValue={dateTimeLocal()} required/></div>
      <div className="field full"><label>Notes (optional)</label><textarea name="notes" placeholder="Physical swap details"/></div>
    </div><div className="notice alert" style={{marginTop:16, marginBottom:0}}>The outgoing cylinder moves into the reserve position and becomes Waiting for Supplier. The full reserve moves into the upper position and becomes Standby.</div><div className="form-actions"><button className="btn btn-primary" disabled={!outgoing.length || !reserves.length}>SWAP CYLINDERS</button></div></form></section>
  </>;
}
