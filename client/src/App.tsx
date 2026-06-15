import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import BottomNav from "./components/BottomNav";
import Home from "./pages/Home";
import Diary from "./pages/Diary";
import Scan from "./pages/Scan";
import History from "./pages/History";
import Profile from "./pages/Profile";
import Recipes from "./pages/Recipes";
import Login from "./pages/Login";

function Router() {
  const [location] = useLocation();
  const showNav = location !== "/login";

  return (
    <>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/" component={Home} />
        <Route path="/diary" component={Diary} />
        <Route path="/scan" component={Scan} />
        <Route path="/history" component={History} />
        <Route path="/profile" component={Profile} />
        <Route path="/recipes" component={Recipes} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
      {showNav && <BottomNav />}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-center" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
