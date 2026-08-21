import { Notice } from "@/components/Notice";
import { correctCylinder, savePosition, saveSettings } from "@/lib/actions";
import { STATUS_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const params = await searchParams;
  const [setting, cylinders, positions, admins] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "max_active_cylinders" } }),
    prisma.cylinder.findMany({ include: { position: true }, orderBy: { cylinderCode: "asc" } }),
    prisma.position.findMany({ orderBy: [{ area: "desc" }, { sortOrder: "asc" }] }),
    prisma.operator.findMany({ where: { role: "ADMIN", active: true } }),
  ]);
  return <>
    <div className="page-head"><div><div className="kicker">Admin configuration</div><h2>Settings & corrections</h2><p>Important edits preserve original values in the immutable audit log.</p></div></div><Notice searchParams={params}/>
    <div className="grid two-col">
      <section className="panel"><h3>Active cylinder limit</h3><form action={saveSettings}><div className="field"><label>Maximum simultaneously ON</label><input name="maxActive" type="number" min="1" max="8" defaultValue={setting?.value ?? "4"}/></div><div className="form-actions"><button className="btn btn-primary">Save limit</button></div></form></section>
      <section className="panel"><h3>Position configuration</h3><div className="metric-list">{positions.map(p=><details key={p.id}><summary className="metric-row"><strong>{p.positionName}</strong><span>{p.area} {p.side ? `· ${p.side}`:""}</span></summary><form action={savePosition} style={{padding:"10px 0 15px"}}><input type="hidden" name="id" value={p.id}/><div className="form-grid"><div className="field full"><label>Name</label><input name="positionName" defaultValue={p.positionName} required/></div><div className="field"><label>Area</label><select name="area" defaultValue={p.area}><option value="UPPER">Upper / Working</option><option value="BOTTOM">Bottom / Reserve</option></select></div><div className="field"><label>Side</label><select name="side" defaultValue={p.side ?? ""}><option value="">No side</option><option value="LEFT">Left</option><option value="RIGHT">Right</option></select></div><div className="field"><label>Sort order</label><input name="sortOrder" type="number" min="1" defaultValue={p.sortOrder}/></div></div><button className="btn btn-soft" style={{marginTop:8}}>Save position</button></form></details>)}</div></section>
      <section className="panel" style={{gridColumn:"1 / -1"}}><h3>Correct cylinder record</h3><p className="notice alert">Corrections require an Admin, reason, original/new values, and create an Edit/Correction audit event. Active sessions should be corrected on the History page.</p><div className="grid report-grid">{cylinders.map(c=><details className="replacement-card" key={c.id}><summary><strong>{c.cylinderCode}</strong> · {c.position?.positionName} · {STATUS_LABELS[c.currentStatus]}</summary><form action={correctCylinder} style={{paddingTop:13}}><input type="hidden" name="cylinderId" value={c.id}/><div className="form-grid"><div className="field"><label>Cylinder ID</label><input name="cylinderCode" defaultValue={c.cylinderCode} required/></div><div className="field"><label>Status</label><select name="status" defaultValue={c.currentStatus}>{Object.entries(STATUS_LABELS).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></div><div className="field"><label>Position</label><select name="positionId" defaultValue={c.positionId ?? ""}>{positions.map(p=><option value={p.id} key={p.id}>{p.positionName}</option>)}</select></div><div className="field"><label>Changed by</label><select name="operatorId" required defaultValue=""><option value="" disabled>Select Admin</option>{admins.map(a=><option value={a.id} key={a.id}>{a.name}</option>)}</select></div><div className="field full"><label>Reason for correction</label><textarea name="reason" required/></div></div><button className="btn btn-primary" style={{marginTop:8}}>Save audited correction</button></form></details>)}</div></section>
    </div>
  </>;
}
