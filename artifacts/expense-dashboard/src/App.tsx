import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import UploadPage from "@/pages/upload";
import CleaningSummaryPage from "@/pages/cleaning-summary";
import { useSessionStore } from "@/store/useSessionStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});

function Router() {
  const isFileUploaded = useSessionStore(state => state.isFileUploaded);

  return (
    <Switch>
      <Route path="/" component={isFileUploaded ? Dashboard : UploadPage} />
      <Route path="/upload" component={UploadPage} />
      <Route path="/summary" component={CleaningSummaryPage} />
      <Route path="/cleaning-summary" component={CleaningSummaryPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
