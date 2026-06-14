import { useLocation } from "wouter";
import { Home, BookOpen, Camera, ChartLine, User, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/diary", icon: BookOpen, label: "Diario" },
  { path: "/scan", icon: Camera, label: "Scan" },
  { path: "/recipes", icon: ChefHat, label: "Ricette" },
  { path: "/profile", icon: User, label: "Profilo" },
];

export default function BottomNav() {
  const [location, navigate] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-[4.25rem] max-w-[480px] mx-auto px-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = path === "/" ? location === "/" : location.startsWith(path);
          const isScan = path === "/scan";

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 press-effect",
                isScan
                  ? cn(
                      "relative -top-3 w-14 h-14 rounded-2xl shadow-lg shadow-primary/30",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary text-primary-foreground"
                    )
                  : isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={label}
            >
              <Icon
                size={isScan ? 22 : 20}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              {!isScan && (
                <span
                  className={cn(
                    "text-[10px] font-medium leading-none",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
