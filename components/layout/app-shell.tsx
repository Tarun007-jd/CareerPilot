"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Bell,
  Bot,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  Route,
  Settings,
  Sparkles,
  Target,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useCareerPilot } from "@/components/providers/career-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OPEN_ASSISTANT_EVENT } from "@/components/assistant/assistant-command-center";
import { AIEngineBadge } from "@/components/shared/ai-engine-badge";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  module: string;
  voice?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, module: "01" },
  { href: "/profile", label: "Career Profile", icon: UserRound, module: "02" },
  { href: "/resume", label: "Resume Intelligence", icon: FileText, module: "03" },
  { href: "/skill-gap", label: "Skill Gap Analysis", icon: Target, module: "04" },
  { href: "/roadmap", label: "Learning Roadmap", icon: Route, module: "05" },
  { href: "/projects", label: "Portfolio Projects", icon: FolderKanban, module: "06" },
  { href: "/interview", label: "Mock Interview", icon: MessagesSquare, module: "07" },
  { href: "/applications", label: "Application Tracker", icon: BriefcaseBusiness, module: "08" },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles, module: "09", voice: true },
  { href: "/settings", label: "Settings", icon: Settings, module: "10" },
];

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/profile": "Career Profile",
  "/resume": "Resume Intelligence",
  "/skill-gap": "Skill Gap Analysis",
  "/roadmap": "Learning Roadmap",
  "/projects": "Portfolio Projects",
  "/interview": "Mock Interview",
  "/applications": "Application Tracker",
  "/assistant": "AI Assistant",
  "/settings": "Settings",
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function BrandMark() {
  return (
    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
      <img
        src="/logo.png"
        alt="CareerPilot AI"
        className="h-[19px] w-[19px] object-contain rounded-lg"
        loading="lazy"
        style={{ objectFit: 'contain' }}
      />
      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-400" />
    </span>
  );
}

function SidebarNav({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {!collapsed ? (
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
          Workspace
        </p>
      ) : null}
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        const link = (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              collapsed && "justify-center px-2",
            )}
          >
            {active ? (
              <span className="absolute -left-3 top-2 h-6 w-[3px] rounded-r-full bg-primary" />
            ) : null}
            <Icon
              className={cn(
                "h-[17px] w-[17px] shrink-0",
                active ? "text-primary" : "text-muted-foreground/80",
              )}
              strokeWidth={active ? 2.15 : 1.9}
            />
            {!collapsed ? (
              <>
                <span className="truncate">{item.label}</span>
                {item.voice ? (
                  <span className="ml-auto rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                    Voice
                  </span>
                ) : (
                  <span className="ml-auto text-[10px] text-muted-foreground/40">
                    {item.module}
                  </span>
                )}
              </>
            ) : null}
          </Link>
        );
        if (!collapsed) return link;
        return (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}

function Sidebar({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  const { state, aiStatus, aiStatusReady } = useCareerPilot();
  const targetRole = state.profile.targetRole || "Target role not set";
  return (
    <div className="flex h-full flex-col bg-card">
      <div
        className={cn(
          "flex h-[72px] shrink-0 items-center border-b border-border px-4",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        <Link
          href="/"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2.5"
          aria-label="CareerPilot AI dashboard"
        >
          <BrandMark />
          {!collapsed ? (
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold leading-none tracking-[-0.02em]">
                CareerPilot <span className="text-primary">AI</span>
              </span>
              <span className="mt-1 block text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Career intelligence
              </span>
            </span>
          ) : null}
        </Link>
        {!collapsed && onToggle ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="text-muted-foreground/60"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />

      <div className="space-y-3 border-t border-border p-3">
        {!collapsed ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-2">
            {aiStatusReady && aiStatus.configured ? (
              <Bot className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            ) : (
              <Bot className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            )}
            <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-muted-foreground">
              {aiStatusReady
                ? aiStatus.configured
                  ? `Gemini · ${aiStatus.model}`
                  : "Local coach mode"
                : "Checking AI status"}
            </span>
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                aiStatusReady && aiStatus.configured
                  ? "bg-emerald-500"
                  : "bg-amber-500",
              )}
            />
          </div>
        ) : null}

        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-muted/60",
            collapsed && "justify-center",
          )}
          aria-label="Open profile and settings"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/10 bg-accent text-[11px] font-semibold text-primary">
            {state.profile.name ? getInitials(state.profile.name) : "CP"}
          </span>
          {!collapsed ? (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-foreground">
                  {state.profile.name || "Set up your profile"}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                  {targetRole}
                </span>
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
            </>
          ) : null}
        </Link>

        {collapsed && onToggle ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            className="mx-auto text-muted-foreground/60"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

interface NotificationItem {
  title: string;
  description: string;
  href: string;
}

function NotificationsButton() {
  const { state } = useCareerPilot();
  const [open, setOpen] = useState(false);

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];
    if (!state.profile.name || !state.profile.targetRole) {
      items.push({
        title: "Finish your career profile",
        description: "Add your name and target role to personalize the workspace.",
        href: "/profile",
      });
    } else if (!state.profile.resume?.text) {
      items.push({
        title: "Add your resume",
        description: "Upload a PDF to extract skills and experience.",
        href: "/resume",
      });
    }
    if (state.jobTarget?.description && !state.analysis) {
      items.push({
        title: "Analyze your saved job description",
        description: "Turn the saved requirements into a skill-gap map.",
        href: "/skill-gap",
      });
    }
    if (
      state.analysis &&
      state.profile.updatedAt > state.analysis.createdAt
    ) {
      items.push({
        title: "Profile changed since analysis",
        description: "Rerun the skill-gap analysis to keep your dashboard current.",
        href: "/skill-gap",
      });
    }
    if (state.roadmap) {
      const incomplete = state.roadmap.weeks
        .flatMap((week) => week.tasks)
        .filter((task) => !task.completed);
      if (incomplete.length) {
        items.push({
          title: `${incomplete.length} roadmap task${
            incomplete.length === 1 ? "" : "s"
          } remaining`,
          description: "Continue your plan or adapt it to recent progress.",
          href: "/roadmap",
        });
      }
    } else if (state.analysis) {
      items.push({
        title: "Your roadmap is ready to build",
        description: "Generate four weeks of tasks from your current gaps.",
        href: "/roadmap",
      });
    }
    const interviewDates = state.applications
      .flatMap((application) =>
        application.interviewDates.map((date) => ({
          date,
          company: application.company,
          title: application.title,
        })),
      )
      .sort((a, b) => a.date.localeCompare(b.date));
    if (interviewDates.length) {
      const latest = interviewDates[interviewDates.length - 1];
      items.push({
        title: "Interview date on record",
        description: `${latest.company} · ${latest.title} · ${latest.date}`,
        href: "/applications",
      });
    }
    return items.slice(0, 5);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground"
          aria-label={
            notifications.length
              ? `${notifications.length} notifications`
              : "Notifications"
          }
        >
          <Bell className="h-[18px] w-[18px]" />
          {notifications.length ? (
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-card" />
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="border-b border-border px-5 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2 text-base">
            Notifications
            {notifications.length ? (
              <Badge variant="default">{notifications.length}</Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            Actions drawn from your current saved workspace, not simulated updates.
          </DialogDescription>
        </DialogHeader>
        {notifications.length ? (
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <DialogClose asChild key={`${notification.title}-${notification.href}`}>
                <Link
                  href={notification.href}
                  className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                  <span>
                    <span className="block text-sm font-medium text-foreground">
                      {notification.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {notification.description}
                    </span>
                  </span>
                  <ChevronRight className="ml-auto mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                </Link>
              </DialogClose>
            ))}
          </div>
        ) : (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-medium">You’re all caught up</p>
            <p className="mt-1 text-xs text-muted-foreground">
              New next-step suggestions will appear here as your workspace changes.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AskPilotButton({ compact = false }: { compact?: boolean }) {
  return (
    <Button
      type="button"
      onClick={() =>
        window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT_EVENT))
      }
      variant={compact ? "outline" : "default"}
      size={compact ? "icon" : "sm"}
      className={compact ? "" : "gap-1.5"}
      aria-label="Open CareerPilot AI command center"
    >
      <Sparkles className="h-4 w-4" />
      {!compact ? "Ask CareerPilot" : null}
    </Button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const pageTitle = pageTitles[pathname] ?? "CareerPilot";
  const parent = pathname === "/" ? "Workspace" : "CareerPilot";

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden shrink-0 border-r border-border bg-card transition-[width] duration-200 lg:block",
          collapsed ? "w-[78px]" : "w-[264px]",
        )}
      >
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((current) => !current)}
        />
      </aside>

      <div
        className={cn(
          "min-h-screen transition-[padding] duration-200",
          collapsed ? "lg:pl-[78px]" : "lg:pl-[264px]",
        )}
      >
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <Sidebar
                  collapsed={false}
                  onNavigate={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>

            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-muted-foreground md:inline">{parent}</span>
              <ChevronRight className="hidden h-3.5 w-3.5 text-muted-foreground/40 md:inline" />
              <span className="truncate font-medium text-foreground">{pageTitle}</span>
            </div>

            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <div className="hidden md:block">
                <AIEngineBadge />
              </div>
              <NotificationsButton />
              <div className="hidden sm:block">
                <AskPilotButton />
              </div>
              <div className="sm:hidden">
                <AskPilotButton compact />
              </div>
            </div>
          </div>
        </header>

        <main>{children}</main>

        <footer className="border-t border-border/70 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-2 text-[11px] text-muted-foreground/80 sm:flex-row">
            <p>CareerPilot AI · Your Career. Your Voice. Your Roadmap.</p>
            <p>
              AI estimates are guidance, not verified certification. Job
              descriptions are user-supplied.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
