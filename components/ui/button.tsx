import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// shadcn/ui's owned-code button pattern, adapted to native buttons and this theme.
export function Button({ className, variant = "default", size = "default", type = "button", ...props }: ComponentProps<"button"> & { variant?: "default" | "outline" | "ghost"; size?: "default" | "small" | "icon" }) {
  return <button data-slot="button" type={type} className={cn("button", `button-${variant}`, `button-size-${size}`, className)} {...props} />;
}
