import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import { Sidebar, SidebarCollapseTrigger, SidebarProvider, useSidebar } from "fumadocs-ui/layouts/notebook/slots/sidebar";
import { MenuSidebarTrigger } from "@/components/sidebar-trigger";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

export default function Layout({ children }: LayoutProps<"/">) {
  const base = baseOptions();
  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...base}
      nav={{ ...base.nav, mode: "top" }}
      sidebar={{ collapsible: false }}
      slots={{ sidebar: { provider: SidebarProvider, root: Sidebar, trigger: MenuSidebarTrigger, collapseTrigger: SidebarCollapseTrigger, useSidebar } }}
    >
      {children}
    </DocsLayout>
  );
}
