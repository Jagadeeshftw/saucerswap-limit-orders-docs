"use client";

import type { ComponentProps } from "react";
import { Menu } from "lucide-react";
import { SidebarTrigger } from "fumadocs-ui/layouts/notebook/slots/sidebar";

/** The phone-width sidebar opener, drawn as ☰ rather than Fumadocs' panel icon. */
export function MenuSidebarTrigger(props: ComponentProps<"button">) {
  return (
    <SidebarTrigger {...props}>
      <Menu aria-hidden />
    </SidebarTrigger>
  );
}
