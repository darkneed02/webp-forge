import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "./icon";

export function ApplicationShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return <div className="app-shell"><header className="app-header"><div className="header-inner"><Link className="wordmark" href="/" aria-label="WebP Forge home"><span className="brand-icon"><Icon name="forge" size={20} /></span>WebP <strong>Forge</strong></Link><span className="local-badge"><i /> LOCAL WORKSPACE</span></div></header>
    <main className="page-container"><div className="page-heading"><div><div className="eyebrow">LESS WEIGHT. SAME IMPACT.</div><h1>{title}</h1><p>{subtitle}</p></div><span className="version-tag">WEBP FORGE / V1.0</span></div>{children}</main>
    <footer className="app-footer"><span><i /> All systems local</span><p>Built for a lighter web.</p><span>JPG / JPEG / PNG</span></footer>
  </div>;
}
