import type { CSSProperties } from "react";
type Name = "forge" | "upload" | "image" | "arrow" | "check" | "close" | "download" | "folder" | "zip" | "spark" | "shield" | "spinner";
const paths: Record<Name, React.ReactNode> = {
  forge: <><path d="m13 2-9 12h7l-1 8 10-13h-7l0-7Z" /></>,
  upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1" /><path d="m3 17 5-5 4 4 4-7 5 8" /></>,
  arrow: <><path d="M4 12h16m-6-6 6 6-6 6" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4" /></>,
  folder: <path d="M3 7V5h7l2 3h9v12H3V7Z" />,
  zip: <><path d="M14 2H5v20h14V7l-5-5Z" /><path d="M14 2v5h5M10 3v2m0 2v2m0 2v2m0 2v3h3v-3h-3Z" /></>,
  spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" /></>,
  shield: <><path d="m12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5l8-3Z" /><path d="m8 11 3 3 5-5" /></>,
  spinner: <><path d="M20 12a8 8 0 1 1-8-8" /></>,
};
export function Icon({ name, size = 18, className, style }: { name: Name; size?: number; className?: string; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>{paths[name]}</svg>;
}
