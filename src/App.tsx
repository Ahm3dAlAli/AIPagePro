import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CreatePage from "./pages/CreatePage";
import MyPages from "./pages/MyPages";
import PageEditor from "./pages/PageEditor";
import Analytics from "./pages/Analytics";
import Templates from "./pages/Templates";
import Experiments from "./pages/Experiments";
import Campaigns from "./pages/Campaigns";
import Preview from "./pages/Preview";
import GeneratedPageView from "./pages/GeneratedPageView";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/preview/:pageId" element={<Preview />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="create" element={<CreatePage />} />
              <Route path="my-pages" element={<MyPages />} />
              <Route path="pages" element={<MyPages />} />
              <Route path="pages/:pageId" element={<PageEditor />} />
              <Route path="page/:id" element={<GeneratedPageView />} />
              <Route path="generated-page/:id" element={<GeneratedPageView />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="templates" element={<Templates />} />
              <Route path="experiments" element={<Experiments />} />
              <Route path="campaigns" element={<Campaigns />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
