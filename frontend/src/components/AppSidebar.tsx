import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, PlusCircle, List, BarChart3, Wallet, Settings, Brain, ChevronLeft, Menu,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Add Transaction", url: "/add", icon: PlusCircle },
  { title: "Transactions", url: "/transactions", icon: List },
  { title: "Analytics & AI", url: "/analytics", icon: BarChart3 },
  { title: "Budget Planner", url: "/budget", icon: Wallet },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">
      <SidebarContent className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
          <div className="w-9 h-9 rounded-xl gradient-violet flex items-center justify-center flex-shrink-0">
            <Brain className="text-primary-foreground" size={20} />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-foreground">SpendWise AI</span>
              <span className="text-[10px] text-muted-foreground">Smart Finance</span>
            </div>
          )}
          {!collapsed && (
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="ml-auto h-7 w-7 text-muted-foreground">
              <ChevronLeft size={16} />
            </Button>
          )}
        </div>

        <SidebarGroup className="flex-1 py-4">
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          isActive
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        <item.icon size={20} />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Collapsed toggle */}
        {collapsed && (
          <div className="p-2 border-t border-border">
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="w-full h-9 text-muted-foreground">
              <Menu size={16} />
            </Button>
          </div>
        )}

        {/* Avatar placeholder */}
        <div className="p-4 border-t border-border mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">U</span>
            </div>
            {!collapsed && <span className="text-xs text-muted-foreground">Portfolio User</span>}
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
