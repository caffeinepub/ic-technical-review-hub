import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import BackendErrorMonitor from "./components/BackendErrorMonitor";
import Footer from "./components/Footer";
import Header from "./components/Header";
import AdminDashboard from "./pages/AdminDashboard";
import AuditLogPage from "./pages/AuditLogPage";
import HomePage from "./pages/HomePage";
import ProposalDetailPage from "./pages/ProposalDetailPage";
import ReviewerProfilePage from "./pages/ReviewerProfilePage";

export type Page =
  | { type: "home" }
  | { type: "proposal"; proposalId: bigint }
  | { type: "reviewer"; principal: string }
  | { type: "admin" }
  | { type: "auditLog" };

function App() {
  const [currentPage, setCurrentPage] = useState<Page>({ type: "home" });

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
        <BackendErrorMonitor />
        <Header currentPage={currentPage} onNavigate={setCurrentPage} />

        <main className="flex-1 animate-fadeIn">
          {currentPage.type === "home" && (
            <HomePage onNavigate={setCurrentPage} />
          )}
          {currentPage.type === "proposal" && (
            <ProposalDetailPage
              proposalId={currentPage.proposalId}
              onNavigate={setCurrentPage}
            />
          )}
          {currentPage.type === "reviewer" && (
            <ReviewerProfilePage
              principal={currentPage.principal}
              onNavigate={setCurrentPage}
            />
          )}
          {currentPage.type === "admin" && (
            <AdminDashboard onNavigate={setCurrentPage} />
          )}
          {currentPage.type === "auditLog" && (
            <AuditLogPage onNavigate={setCurrentPage} />
          )}
        </main>

        <Footer />

        <Toaster />
      </div>
    </ThemeProvider>
  );
}

export default App;
