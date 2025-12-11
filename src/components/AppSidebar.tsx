import { Users, PlusCircle, FileText, Settings, LogOut, LayoutDashboard } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Pacientes", url: "/dashboard/patients", icon: Users },
  { title: "Nova Análise", url: "/dashboard/new-analysis", icon: PlusCircle },
  { title: "Protocolos", url: "/dashboard/protocols", icon: FileText },
  { title: "Configurações", url: "/dashboard/settings", icon: Settings },
];

interface AppSidebarProps {
  onSignOut: () => void;
}

export function AppSidebar({ onSignOut }: AppSidebarProps) {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-medium text-lg">N</span>
          </div>
          {!collapsed && (
            <div>
              <h2 className="font-medium text-foreground text-sm">NeuroAesthetics</h2>
              <p className="text-xs text-muted-foreground">Portal Médico</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground px-2 mb-2">
            {!collapsed && "Menu Principal"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                          "hover:bg-muted/50",
                          isActive && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-border/50">
        <button
          onClick={onSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>Sair</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
