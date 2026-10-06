import { ForgeWorkspace } from "@/components/forge-workspace";
import { Icon } from "@/components/icon";
import { publicConfig } from "@/lib/config";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default function Home() {
  return <div className="app-shell"><header className="app-header"><div className="header-inner"><Link className="wordmark" href="/" aria-label="WebP Forge home"><span className="brand-icon"><Icon name="forge" size={20} /></span>WebP <strong>Forge</strong></Link><span className="local-badge"><i /> LOCAL WORKSPACE</span></div></header>
    <main className="page-container"><div className="page-heading"><div><div className="eyebrow">LESS WEIGHT. SAME IMPACT.</div><h1>Make room for <span>better images.</span></h1><p>Fast batch image conversion for the web.</p></div><span className="version-tag">WEBP FORGE / V1.0</span></div><ForgeWorkspace config={publicConfig} /></main>
    <footer className="app-footer"><span><i /> All systems local</span><p>Built for a lighter web.</p><span>JPG / PNG <Icon name="arrow" size={13} /> WEBP</span></footer>
  </div>;
}
