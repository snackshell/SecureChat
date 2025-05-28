import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import Login from "@/pages/login";
import Chat from "@/pages/chat";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  console.log("[Router] isLoading:", isLoading);
  console.log("[Router] isAuthenticated:", isAuthenticated);
  console.log("[Router] Current location:", location);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login">
        {() => {
          if (isAuthenticated) {
            console.log("[Router] Authenticated, redirecting from /login to /chat");
            return <Redirect to="/chat" />;
          }
          console.log("[Router] Rendering Login for path: /login");
          return <Login />;
        }}
      </Route>
      <Route path="/chat">
        {() => {
          if (!isAuthenticated) {
            console.log("[Router] Not authenticated, redirecting from /chat to /login");
            return <Redirect to="/login" />;
          }
          console.log("[Router] Rendering Chat for path: /chat");
          return <Chat />;
        }}
      </Route>
      <Route path="/">
        {() => {
          if (isAuthenticated) {
            console.log("[Router] Authenticated, redirecting from / to /chat");
            return <Redirect to="/chat" />;
          }
          console.log("[Router] Not authenticated, redirecting from / to /login");
          return <Redirect to="/login" />;
        }}
      </Route>
      <Route>
        {() => {
          console.log("[Router] Rendering NotFound for path:", location);
          return <NotFound />;
        }}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
