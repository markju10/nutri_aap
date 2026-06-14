import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import BottomNav from "./components/BottomNav";
import Home from "./pages/Home";
import Diary from "./pages/Diary";
import Scan from "./pages/Scan";
import History from "./pages/History";
import Profile from "./pages/Profile";
import Recipes from "./pages/Recipes";

function Router() {
  return (
    <>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/diary" component={Diary} />
        <Route path="/scan" component={Scan} />
        <Route path="/history" component={History} />
        <Route path="/profile" component={Profile} />
        <Route path="/recipes" component={Recipes} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
      <BottomNav />
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
