import { publicConfig } from "@/lib/config";
import type { TaskMode } from "@/lib/types";
import { ApplicationShell } from "./application-shell";
import { ForgeWorkspace } from "./forge-workspace";

export function ToolPage({ mode }: { mode: TaskMode }) {
  const resize = mode === "resize";
  return <ApplicationShell title={resize ? "Resize images" : "Convert to WebP"} subtitle={resize ? "Smaller dimensions. Your original format, or WebP." : "Fast batch image conversion for the web."}>
    <ForgeWorkspace key={mode} config={publicConfig} mode={mode} />
  </ApplicationShell>;
}
