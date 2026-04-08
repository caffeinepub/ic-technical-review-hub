import { Toaster } from "@/components/ui/sonner";
import { Outlet } from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import BackendErrorMonitor from "./BackendErrorMonitor";
import Footer from "./Footer";
import Header from "./Header";

export default function RootLayout() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
        <BackendErrorMonitor />
        <Header />
        <main className="flex-1 animate-fadeIn">
          <Outlet />
        </main>
        <Footer />
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
