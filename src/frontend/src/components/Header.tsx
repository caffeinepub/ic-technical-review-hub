import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetReviewer, useIsCallerAdmin } from "../hooks/useQueries";

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export default function Header({ currentPage, onNavigate }: HeaderProps) {
  const { identity, clear, login, loginStatus } = useInternetIdentity();
  const { data: isAdmin } = useIsCallerAdmin();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [copied, setCopied] = useState(false);

  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === "logging-in";

  const principalId = identity?.getPrincipal()?.toString();
  const shortPrincipal = principalId
    ? `${principalId.slice(0, 5)}...${principalId.slice(-3)}`
    : "";

  const reviewerPrincipal = identity ? identity.getPrincipal() : undefined;
  const { data: reviewer } = useGetReviewer(reviewerPrincipal);

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
      onNavigate({ type: "home" });
      toast.success("Logged out successfully");
    } else {
      try {
        await login();
        toast.success("Logged in successfully");
      } catch (error: any) {
        console.error("Login error:", error);
        if (error.message === "User is already authenticated") {
          await clear();
          setTimeout(() => login(), 300);
        } else {
          toast.error("Login failed. Please try again.");
        }
      }
    }
  };

  const handleCopyPrincipal = async () => {
    if (principalId) {
      try {
        await navigator.clipboard.writeText(principalId);
        setCopied(true);
        toast.success("Principal copied!", { duration: 2000 });
        setTimeout(() => setCopied(false), 2000);
      } catch (_error) {
        toast.error("Failed to copy Principal ID");
      }
    }
  };

  const isHomeActive = currentPage.type === "home";
  const isAuditLogActive = currentPage.type === "auditLog";
  const isAdminActive = currentPage.type === "admin";

  const navTabClass = (active: boolean) =>
    `text-sm px-3 py-1.5 rounded-md border transition-all duration-200 ${
      active
        ? "bg-accent text-foreground border-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
    }`;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => onNavigate({ type: "home" })}
                className="text-xl font-bold text-foreground hover:text-primary transition-colors duration-200 shrink-0"
                data-ocid="header.home.link"
              >
                NNS Technical Review Hub
              </button>

              <nav className="hidden md:flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onNavigate({ type: "home" })}
                  className={navTabClass(isHomeActive)}
                  data-ocid="header.proposals.tab"
                >
                  Proposals
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate({ type: "auditLog" })}
                  className={navTabClass(isAuditLogActive)}
                  data-ocid="header.audit_log.tab"
                >
                  Audit Log
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onNavigate({ type: "admin" })}
                    className={navTabClass(isAdminActive)}
                    data-ocid="header.admin.tab"
                  >
                    Admin
                  </button>
                )}
              </nav>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {isAuthenticated && principalId && (
                <div className="hidden sm:flex flex-col items-end text-sm">
                  {reviewer?.nickname && (
                    <span className="font-semibold text-foreground mb-1">
                      {reviewer.nickname}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleCopyPrincipal}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 group"
                    title="Click to copy full Principal ID"
                    data-ocid="header.copy_principal.button"
                  >
                    <span className="font-mono">{shortPrincipal}</span>
                    <Copy
                      className={`h-3 w-3 transition-all duration-200 ${
                        copied
                          ? "text-green-500"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
                    />
                  </button>
                </div>
              )}

              <Button
                onClick={handleAuth}
                disabled={isLoggingIn}
                variant={isAuthenticated ? "outline" : "default"}
                size="sm"
                className="transition-all duration-200 rounded-md"
                data-ocid="header.auth.button"
              >
                {isLoggingIn
                  ? "Logging in..."
                  : isAuthenticated
                    ? "Logout"
                    : "Login"}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="transition-all duration-200 rounded-md"
                data-ocid="header.theme.toggle"
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>

              <button
                type="button"
                onClick={() => onNavigate({ type: "auditLog" })}
                className={`md:hidden text-sm ${navTabClass(isAuditLogActive)}`}
                data-ocid="header.audit_log_mobile.tab"
              >
                Log
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="h-[60px]" />
    </>
  );
}
