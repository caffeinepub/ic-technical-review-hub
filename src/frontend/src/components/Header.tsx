import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Copy, Menu, Moon, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetReviewer, useIsCallerAdmin } from "../hooks/useQueries";

export default function Header() {
  const { identity, clear, login, loginStatus } = useInternetIdentity();
  const { data: isAdmin } = useIsCallerAdmin();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === "logging-in";

  const principalId = identity?.getPrincipal()?.toString();
  const shortPrincipal = principalId
    ? `${principalId.slice(0, 5)}...${principalId.slice(-3)}`
    : "";

  const reviewerPrincipal = identity ? identity.getPrincipal() : undefined;
  const { data: reviewer } = useGetReviewer(reviewerPrincipal);

  const currentPath = routerState.location.pathname;

  // Close menu on outside click
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [mobileMenuOpen]);

  // Close menu on Escape
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  // Close mobile menu on route change
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reacts to route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentPath]);

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
      navigate({ to: "/" });
      toast.success("Logged out successfully");
    } else {
      try {
        await login();
        toast.success("Logged in successfully");
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error("Login error:", err);
        if (err.message === "User is already authenticated") {
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

  const isProposalsActive = currentPath === "/" || currentPath === "/proposals";
  const isAuditLogActive = currentPath === "/audit-log";
  const isAdminActive = currentPath === "/admin";

  const navTabClass = (active: boolean) =>
    `text-sm px-3 py-1.5 rounded-md border transition-all duration-200 ${
      active
        ? "bg-accent text-foreground border-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
    }`;

  const mobileNavItemClass = (active: boolean) =>
    `w-full text-left text-sm px-4 py-3 rounded-md border transition-all duration-200 ${
      active
        ? "bg-accent text-foreground border-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
    }`;

  return (
    <>
      <div
        ref={menuRef}
        className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Logo + Desktop Nav */}
            <div className="flex items-center gap-3 min-w-0">
              <Link
                to="/"
                className="text-xl font-bold text-foreground hover:text-primary transition-colors duration-200 shrink-0"
                data-ocid="header.home.link"
              >
                NNS Technical Review Hub
              </Link>

              <nav className="hidden md:flex items-center gap-1">
                <Link
                  to="/"
                  className={navTabClass(isProposalsActive)}
                  data-ocid="header.proposals.tab"
                >
                  Proposals
                </Link>
                <Link
                  to="/audit-log"
                  className={navTabClass(isAuditLogActive)}
                  data-ocid="header.audit_log.tab"
                >
                  Audit Log
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className={navTabClass(isAdminActive)}
                    data-ocid="header.admin.tab"
                  >
                    Admin
                  </Link>
                )}
              </nav>
            </div>

            {/* Right: Principal, Auth, Theme, Burger */}
            <div className="flex items-center gap-2 shrink-0">
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
                className="hidden md:inline-flex transition-all duration-200 rounded-md"
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

              {/* Burger menu button — mobile only */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden transition-all duration-200 rounded-md"
                aria-label={
                  mobileMenuOpen
                    ? "Close navigation menu"
                    : "Open navigation menu"
                }
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-nav-menu"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                data-ocid="header.burger.button"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown nav menu */}
        {mobileMenuOpen && (
          <div
            id="mobile-nav-menu"
            className="md:hidden border-t border-border bg-white dark:bg-[#141414] relative z-[60]"
            data-ocid="header.mobile_nav.menu"
          >
            <nav className="max-w-7xl mx-auto px-4 py-2 flex flex-col gap-1">
              <Link
                to="/"
                className={mobileNavItemClass(isProposalsActive)}
                data-ocid="header.mobile_proposals.tab"
              >
                Proposals
              </Link>
              <Link
                to="/audit-log"
                className={mobileNavItemClass(isAuditLogActive)}
                data-ocid="header.mobile_audit_log.tab"
              >
                Audit Log
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className={mobileNavItemClass(isAdminActive)}
                  data-ocid="header.mobile_admin.tab"
                >
                  Admin
                </Link>
              )}

              {/* Principal copy in mobile menu when authenticated */}
              {isAuthenticated && principalId && (
                <div className="mt-1 pt-2 border-t border-border">
                  {reviewer?.nickname && (
                    <p className="text-sm font-semibold text-foreground px-4 pb-1">
                      {reviewer.nickname}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleCopyPrincipal}
                    className="flex items-center gap-2 w-full px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 group"
                    title="Click to copy full Principal ID"
                    data-ocid="header.mobile_copy_principal.button"
                  >
                    <Copy
                      className={`h-3 w-3 shrink-0 ${copied ? "text-green-500" : ""}`}
                    />
                    <span className="font-mono truncate">{shortPrincipal}</span>
                    <span className="text-xs opacity-60 ml-auto shrink-0">
                      {copied ? "Copied!" : "Copy"}
                    </span>
                  </button>
                </div>
              )}

              {/* Auth section at bottom of mobile menu */}
              <div className="mt-1 pt-2 border-t border-border">
                <Button
                  onClick={() => {
                    handleAuth();
                    setMobileMenuOpen(false);
                  }}
                  disabled={isLoggingIn}
                  variant={isAuthenticated ? "outline" : "default"}
                  size="sm"
                  className="w-full transition-all duration-200 rounded-md"
                  data-ocid="header.mobile_auth.button"
                >
                  {isLoggingIn
                    ? "Logging in..."
                    : isAuthenticated
                      ? "Logout"
                      : "Login"}
                </Button>
              </div>
            </nav>
            {/* Bottom padding */}
            <div className="h-2" />
          </div>
        )}
      </div>

      <div className="h-[60px]" />
    </>
  );
}
