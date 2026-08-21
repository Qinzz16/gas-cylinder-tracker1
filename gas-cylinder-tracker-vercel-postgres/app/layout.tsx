import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Cylinder, History, Menu, Settings, Truck } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gas Cylinder Tracker",
  description: "Internal cylinder rotation and usage tracker",
};

const nav = [
  ["Dashboard", "/", Cylinder], ["Record", "/record", Menu], ["History", "/history", History],
  ["Supplier", "/supplier", Truck], ["Reports", "/reports", BarChart3],
  ["Operators", "/operators", Menu], ["Settings", "/settings", Settings],
] as const;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <main className="shell">
      <header className="topbar">
        <Link href="/" className="brand"><span className="brand-mark"><Cylinder size={23}/></span><span><h1>Gas Cylinder Tracker</h1><small>8-cylinder rotation control</small></span></Link>
        <nav className="desktop-nav">{nav.map(([label, href]) => <Link className="nav-link" href={href} key={href}>{label}</Link>)}</nav>
      </header>
      {children}
    </main>
    <nav className="mobile-nav">{nav.slice(0, 5).map(([label, href, Icon]) => <Link href={href} key={href}><Icon size={19}/>{label}</Link>)}</nav>
  </body></html>;
}
