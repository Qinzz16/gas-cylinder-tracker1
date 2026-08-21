import { Notice } from "@/components/Notice";
import { saveOperator } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { prettyEnum } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function OperatorsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const params = await searchParams;
  const operators = await prisma.operator.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  return <><div className="page-head"><div><div className="kicker">People</div><h2>Operators</h2><p>Selecting a name is the lightweight identity method for this MVP.</p></div></div><Notice searchParams={params}/><div className="grid two-col"><section className="panel"><h3>Add operator</h3><form action={saveOperator}><div className="form-grid"><div className="field full"><label>Name</label><input name="name" required/></div><div className="field full"><label>Role</label><select name="role"><option value="OPERATOR">Operator</option><option value="ADMIN">Admin</option></select></div></div><div className="form-actions"><button className="btn btn-primary">Add operator</button></div></form></section><section className="panel"><h3>Current operators</h3><div className="metric-list">{operators.map(o=><details key={o.id}><summary className="metric-row"><strong>{o.name}</strong><span>{prettyEnum(o.role)} · {o.active ? "Active" : "Inactive"}</span></summary><form action={saveOperator} style={{padding:"10px 0 16px"}}><input type="hidden" name="id" value={o.id}/><div className="form-grid"><div className="field"><label>Name</label><input name="name" defaultValue={o.name}/></div><div className="field"><label>Role</label><select name="role" defaultValue={o.role}><option value="OPERATOR">Operator</option><option value="ADMIN">Admin</option></select></div><div className="field"><label>Availability</label><select name="active" defaultValue={String(o.active)}><option value="true">Active</option><option value="false">Inactive</option></select></div></div><button className="btn btn-soft" style={{marginTop:8}}>Save</button></form></details>)}</div></section></div></>;
}
