import { ApplicationShell } from "@/components/application-shell";
import { Icon } from "@/components/icon";
import Link from "next/link";
export default function Home() {
  return <ApplicationShell title="What would you like to do?" subtitle="Choose a tool. Your images stay on your machine.">
    <div className="tool-grid">
      <Link href="/resize" className="tool-card"><span className="tool-icon"><Icon name="image" size={28} /></span><h2>Resize images</h2><p>Make images smaller while keeping their proportions. Keep the original format or save as WebP.</p><span className="tool-action">Resize images <Icon name="arrow" size={18} /></span></Link>
      <Link href="/convert" className="tool-card"><span className="tool-icon"><Icon name="forge" size={28} /></span><h2>Convert to WebP</h2><p>Turn JPG, JPEG, and PNG into lighter WebP files. Choose your quality and convert a whole batch.</p><span className="tool-action">Convert to WebP <Icon name="arrow" size={18} /></span></Link>
    </div>
    <p className="tool-privacy"><Icon name="shield" size={16} />Local processing · Automatic folder output · Single image or batch ZIP downloads</p>
  </ApplicationShell>;
}
