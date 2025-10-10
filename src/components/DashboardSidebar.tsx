import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Brain,
  LayoutDashboard,
  FileText,
  BarChart3,
  Rocket,
  Settings,
  Plus,
  TestTube,
  Users,
  Globe,
  FormInput,
  Sparkles,
  CloudUpload
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    group: "Overview"
  },
  {
    title: "Create Page",
    url: "/dashboard/create",
    icon: Plus,
    group: "Generate"
  },
  {
    title: "My Pages",
    url: "/dashboard/pages",
    icon: Globe,
    group: "Generate"
  },
  {
    title: "Form Builder",
    url: "/dashboard/form-builder",
    icon: FormInput,
    group: "Build & Deploy"
  },
  {
    title: "Deployment",
    url: "/dashboard/deployment",
    icon: CloudUpload,
    group: "Build & Deploy"
  },
  {
    title: "Templates",
    url: "/dashboard/templates",
    icon: FileText,
    group: "Library"
  },
  {
    title: "Analytics",
    url: "/dashboard/analytics",
    icon: BarChart3,
    group: "Insights"
  },
  {
    title: "A/B Tests",
    url: "/dashboard/experiments",
    icon: TestTube,
    group: "Marketing"
  },
  {
    title: "AI Rationale",
    url: "/dashboard/ai-rationale",
    icon: Sparkles,
    group: "Insights"
  },
  {
    title: "Campaigns",
    url: "/dashboard/campaigns",
    icon: Rocket,
    group: "Marketing"
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
    group: "Account"
  },
];

const groupedItems = navigationItems.reduce((groups, item) => {
  if (!groups[item.group]) {
    groups[item.group] = [];
  }
  groups[item.group].push(item);
  return groups;
}, {} as Record<string, typeof navigationItems>);

export function DashboardSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return currentPath === "/dashboard";
    }
    return currentPath.startsWith(path);
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50";

  return (
    <Sidebar
      className={collapsed ? "w-14" : "w-64"}
      collapsible="icon"
    >
      <SidebarContent>
        {/* Brand */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="font-bold text-lg">AIPage.pro</span>
            )}
          </div>
        </div>

        {/* Navigation Groups */}
        {Object.entries(groupedItems).map(([groupName, items]) => (
          <SidebarGroup key={groupName}>
            {!collapsed && (
              <SidebarGroupLabel className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {groupName}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        end={item.url === "/dashboard"}
                        className={({ isActive }) => 
                          `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                            isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"
                          }`
                        }
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}