import Link from "next/link";
import { CylinderEvent, Operator, Position, UsageSession } from "@prisma/client";
import { StatusBadge } from "./StatusBadge";
import { displayDate, liveDuration } from "@/lib/time";
import { prettyEnum } from "@/lib/constants";

type EventWithOperator = CylinderEvent & { operator: Operator | null };
type CylinderCardProps = {
  cylinder: {
    id: string; cylinderCode: string; currentStatus: string; isOn: boolean; currentSide: string | null;
    lastTurnedOnAt: Date | null; position: Position | null;
    usageSessions: (UsageSession & { turnedOnBy: Operator })[];
    events: EventWithOperator[];
  };
};

export function CylinderCard({ cylinder }: CylinderCardProps) {
  const session = cylinder.usageSessions[0];
  return <article className={`cylinder-card ${cylinder.isOn ? "on" : ""} ${cylinder.currentStatus === "ALMOST_EMPTY" ? "almost" : ""}`}>
    <div className="card-top">
      <div><div className="cylinder-id">{cylinder.cylinderCode}</div><div className="position">{cylinder.position?.positionName ?? "Unassigned"}</div></div>
      <StatusBadge status={cylinder.currentStatus}/>
    </div>
    <div className={`power ${cylinder.isOn ? "on" : ""}`}><span className="power-dot"/>{cylinder.isOn ? `ON · ${cylinder.currentSide}` : "OFF"}</div>
    <div className="details">
      <div className="detail"><span>Last ON</span><strong>{displayDate(cylinder.lastTurnedOnAt)}</strong></div>
      <div className="detail"><span>Current usage</span><strong>{cylinder.isOn && session ? liveDuration(session.turnedOnAt) : "—"}</strong></div>
      <div className="detail"><span>Started by</span><strong>{cylinder.isOn && session ? session.turnedOnBy.name : "—"}</strong></div>
      <div className="detail"><span>Last action</span><strong>{cylinder.events[0] ? prettyEnum(cylinder.events[0].eventType) : "Initial setup"}</strong></div>
    </div>
    <div className="actions">
      {cylinder.isOn ? <>
        <Link className="btn btn-off" href={`/record?mode=off&cylinder=${cylinder.id}`}>Turn OFF</Link>
        <Link className="btn btn-warn" href={`/record?mode=almost&cylinder=${cylinder.id}`}>Almost Empty</Link>
      </> : <Link className="btn btn-on" href={`/record?mode=on&cylinder=${cylinder.id}`}>Turn ON</Link>}
      <Link className="btn btn-soft" href={`/history?cylinder=${cylinder.id}`}>History</Link>
    </div>
    <details className="disclosure"><summary>Activity timeline ▾</summary>
      <div className="timeline">{cylinder.events.length ? cylinder.events.map((event) => <div className="timeline-item" key={event.id}><strong>{prettyEnum(event.eventType)}</strong>{event.operator ? ` by ${event.operator.name}` : ""}<time>{displayDate(event.eventTime)}</time></div>) : <span className="muted small">No activity yet.</span>}</div>
    </details>
  </article>;
}
