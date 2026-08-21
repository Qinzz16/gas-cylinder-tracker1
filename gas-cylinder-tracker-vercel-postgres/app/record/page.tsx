import { Notice } from "@/components/Notice";
import { markAlmostEmpty, turnOff, turnOn } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { dateTimeLocal } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function RecordPage({ searchParams }: { searchParams: Promise<{ mode?: string; cylinder?: string; success?: string; error?: string }> }) {
  const params = await searchParams;
  const [cylinders, operators] = await Promise.all([
    prisma.cylinder.findMany({ orderBy: { cylinderCode: "asc" }, include: { position: true } }),
    prisma.operator.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  const selected = params.cylinder ?? "";
  const mode = params.mode ?? "on";
  const common = <>
    <div className="field"><label>Person performing action</label><select name="operatorId" required defaultValue=""><option value="" disabled>Select operator</option>{operators.map((o) => <option value={o.id} key={o.id}>{o.name}</option>)}</select></div>
    <div className="field"><label>Date and time</label><input type="datetime-local" name="eventTime" defaultValue={dateTimeLocal()} required/></div>
    <div className="field full"><label>Notes (optional)</label><textarea name="notes" placeholder="What happened?"/></div>
  </>;

  return <>
    <div className="page-head"><div><div className="kicker">Quick action</div><h2>Record ON / OFF</h2><p>Each saved action creates a permanent usage and audit record.</p></div></div>
    <Notice searchParams={params}/>
    <div className="grid two-col">
      <section className="panel"><h3>Turn gas ON</h3>
        <form action={turnOn}><input type="hidden" name="returnTo" value="/record"/><div className="form-grid">
          <div className="field"><label>Cylinder</label><select name="cylinderId" required defaultValue={mode === "on" ? selected : ""}><option value="" disabled>Select OFF cylinder</option>{cylinders.filter((c) => !c.isOn).map((c) => <option value={c.id} key={c.id}>{c.cylinderCode} · {c.position?.positionName} · {c.currentStatus.replaceAll("_", " ")}</option>)}</select></div>
          <div className="field"><label>Supply side</label><select name="side" required defaultValue=""><option value="" disabled>Select side</option><option value="LEFT">Left</option><option value="RIGHT">Right</option></select></div>
          {common}
        </div><div className="form-actions"><button className="btn btn-on" type="submit">TURN ON</button></div></form>
      </section>
      <section className="panel"><h3>Turn gas OFF</h3>
        <form action={turnOff}><input type="hidden" name="returnTo" value="/record"/><div className="form-grid">
          <div className="field full"><label>Active cylinder</label><select name="cylinderId" required defaultValue={mode === "off" ? selected : ""}><option value="" disabled>Select ON cylinder</option>{cylinders.filter((c) => c.isOn).map((c) => <option value={c.id} key={c.id}>{c.cylinderCode} · {c.currentSide} · {c.position?.positionName}</option>)}</select></div>
          {common}
          <div className="field full"><label>Condition after turning OFF</label><select name="condition" required defaultValue=""><option value="" disabled>Select condition</option><option value="STILL_HAS_GAS">Still has gas</option><option value="ALMOST_EMPTY">Almost empty</option><option value="EMPTY">Empty</option></select></div>
        </div><div className="form-actions"><button className="btn btn-off" type="submit">TURN OFF</button></div></form>
      </section>
      <section className="panel"><h3>Mark Almost Empty</h3><p className="muted small">The cylinder remains ON. A replacement pair may be turned on separately.</p>
        <form action={markAlmostEmpty}><input type="hidden" name="returnTo" value="/record"/><div className="form-grid">
          <div className="field full"><label>Active cylinder</label><select name="cylinderId" required defaultValue={mode === "almost" ? selected : ""}><option value="" disabled>Select ON cylinder</option>{cylinders.filter((c) => c.isOn).map((c) => <option value={c.id} key={c.id}>{c.cylinderCode} · {c.currentSide} · {c.currentStatus.replaceAll("_", " ")}</option>)}</select></div>
          {common}
        </div><div className="form-actions"><button className="btn btn-warn" type="submit">MARK ALMOST EMPTY</button></div></form>
      </section>
    </div>
  </>;
}
