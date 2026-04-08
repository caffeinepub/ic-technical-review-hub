import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import RootLayout from "./components/RootLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AuditLogPage from "./pages/AuditLogPage";
import HomePage from "./pages/HomePage";
import ProposalDetailPage from "./pages/ProposalDetailPage";
import ReviewerProfilePage from "./pages/ReviewerProfilePage";

// All fields optional so defaults are omitted from the URL
export type ProposalsSearch = {
  view?: "proposals" | "reviewers";
  topic?: string;
  page?: number;
  activeGranteesOnly?: boolean;
};

export type ReviewerSearch = {
  tab?: "history" | "todos" | "assignments";
  reviewPage?: number;
  todoPage?: number;
  assignmentPage?: number;
};

export type AdminSearch = {
  tab?: "admins" | "reviewers" | "assignments" | "proposals" | "settings";
  page?: number;
};

export type AuditLogSearch = {
  page?: number;
};

// Root route — wraps all pages in the shared layout
export const rootRoute = createRootRoute({
  component: RootLayout,
});

// / — proposals overview (primary entrypoint, no redirect needed)
export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
  validateSearch: (search: Record<string, unknown>): ProposalsSearch => {
    // Only serialize non-default values so URLs stay clean
    const view =
      search.view === "reviewers" ? ("reviewers" as const) : undefined;
    const topic =
      typeof search.topic === "string" && /^\d+$/.test(search.topic)
        ? search.topic
        : undefined;
    // Accept both string (from URL) and number (from previous validateSearch pass)
    const rawPage = Number(search.page);
    const page =
      !Number.isNaN(rawPage) && rawPage > 1 ? Math.floor(rawPage) : undefined;
    const activeGranteesOnly =
      search.activeGranteesOnly === "true" || search.activeGranteesOnly === true
        ? true
        : undefined;
    return { view, topic, page, activeGranteesOnly };
  },
});

// /proposals — backwards-compatibility redirect to /
export const proposalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/proposals",
  beforeLoad: ({ search }) => {
    // Preserve any search params when redirecting
    throw redirect({ to: "/", search });
  },
});

// /proposal/:proposalId
export const proposalDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/proposal/$proposalId",
  component: ProposalDetailPage,
});

// /reviewer/:principal
export const reviewerProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reviewer/$principal",
  component: ReviewerProfilePage,
  validateSearch: (search: Record<string, unknown>): ReviewerSearch => {
    const tab = ["history", "todos", "assignments"].includes(
      search.tab as string,
    )
      ? (search.tab as "history" | "todos" | "assignments")
      : undefined; // omit default 'history'

    // Accept both string (from URL) and number (from previous validateSearch pass)
    const rawReviewPage = Number(search.reviewPage);
    const reviewPage =
      !Number.isNaN(rawReviewPage) && rawReviewPage > 1
        ? Math.floor(rawReviewPage)
        : undefined;

    const rawTodoPage = Number(search.todoPage);
    const todoPage =
      !Number.isNaN(rawTodoPage) && rawTodoPage > 1
        ? Math.floor(rawTodoPage)
        : undefined;

    const rawAssignmentPage = Number(search.assignmentPage);
    const assignmentPage =
      !Number.isNaN(rawAssignmentPage) && rawAssignmentPage > 1
        ? Math.floor(rawAssignmentPage)
        : undefined;

    return { tab, reviewPage, todoPage, assignmentPage };
  },
});

// /admin — admin dashboard
export const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminDashboard,
  validateSearch: (search: Record<string, unknown>): AdminSearch => {
    const validTabs = [
      "admins",
      "reviewers",
      "assignments",
      "proposals",
      "settings",
    ];
    const tab = validTabs.includes(search.tab as string)
      ? (search.tab as AdminSearch["tab"])
      : undefined; // omit default 'admins'

    // Accept both string (from URL) and number (from previous validateSearch pass)
    const rawPage = Number(search.page);
    const page =
      !Number.isNaN(rawPage) && rawPage > 1 ? Math.floor(rawPage) : undefined;

    return { tab, page };
  },
});

// /audit-log — public audit log
export const auditLogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/audit-log",
  component: AuditLogPage,
  validateSearch: (search: Record<string, unknown>): AuditLogSearch => {
    // page=0 is default for audit log — omit it
    // Accept both string (from URL) and number (from previous validateSearch pass)
    const rawPage = Number(search.page);
    const page =
      !Number.isNaN(rawPage) && rawPage > 0 ? Math.floor(rawPage) : undefined;
    return { page };
  },
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  proposalsRoute,
  proposalDetailRoute,
  reviewerProfileRoute,
  adminRoute,
  auditLogRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
