import Link from "next/link";
import { ArrowRightLeft, Truck } from "lucide-react";
import { CylinderCard } from "@/components/CylinderCard";
import { Notice } from "@/components/Notice";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const params = await searchParams;
  const positions = await prisma.position.findMany({
    where: { active: true }, orderBy: [{ area: "desc" }, { sortOrder: "asc" }],
    include: { cylinder: { include: {
      position: true,
      usageSessions: { where: { turnedOffAt: null }, orderBy: { turnedOnAt: "desc" }, take: 1, include: { turnedOnBy: true } },
      events: { orderBy: { eventTime: "desc" }, take: 5, include: { operator: true } },
    } } },
  });
  const cylinders = positions.flatMap((p) => p.cylinder ? [p.cylinder] : []);
  const active = cylinders.filter((c) => c.isOn).length;
  const almost = cylinders.filter((c) => c.currentStatus === "ALMOST_EMPTY").length;
  const fullReserve = cylinders.filter((c) => c.position?.area === "BOTTOM" && c.currentStatus === "FULL").length;
  const emptyBottom = cylinders.filter((c) => c.position?.area === "BOTTOM" && ["EMPTY", "WAITING_FOR_SUPPLIER"].includes(c.currentStatus)).length;
  const upper = positions.filter((p) => p.area === "UPPER");
  const bottom = positions.filter((p) => p.area === "BOTTOM");

  return <>
    <div className="page-head"><div><div className="kicker">Live overview</div><h2>Gas cylinder status</h2><p>Four simple positions. Turn gas ON or OFF directly from each cylinder card.</p></div></div>
    <Notice searchParams={params}/>
    {bottom.length > 0 && emptyBottom === bottom.length && <div className="notice alert">All bottom cylinders are empty and ready for supplier replacement. <Link href="/supplier"><u>Create request</u></Link></div>}
    <div className="grid stats">
      <div className="stat"><strong>{active}</strong><span>Currently ON</span></div>
      <div className="stat"><strong>{cylinders.length - active}</strong><span>Currently OFF</span></div>
      <div className="stat"><strong>{almost}</strong><span>Almost empty</span></div>
      <div className="stat"><strong>{fullReserve}</strong><span>Full bottom</span></div>
    </div>
    <div className="section-head"><div><div className="kicker">Upper</div><h3>Upper Left / Upper Right</h3></div><span>Direct gas control</span></div>
    <div className="grid cylinder-grid">{upper.map((position) => position.cylinder ? <CylinderCard key={position.id} cylinder={position.cylinder}/> : <div className="cylinder-card empty" key={position.id}>Empty position<br/>{position.positionName}</div>)}</div>
    <div className="section-head"><div><div className="kicker">Bottom</div><h3>Bottom Left / Bottom Right</h3></div><Link href="/swap" className="btn btn-soft"><ArrowRightLeft size={16}/> Swap</Link></div>
    <div className="grid cylinder-grid">{bottom.map((position) => position.cylinder ? <CylinderCard key={position.id} cylinder={position.cylinder}/> : <div className="cylinder-card empty" key={position.id}>Empty position<br/>{position.positionName}</div>)}</div>
    {emptyBottom > 0 && <div style={{marginTop:18}}><Link href="/supplier" className="btn btn-primary"><Truck size={17}/> Supplier Replacement</Link></div>}
  </>;
}
