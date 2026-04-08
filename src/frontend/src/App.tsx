// Legacy type — kept for type-safety during migration.
// Navigation is now handled by TanStack Router.
// This file intentionally exports nothing functional.

export type Page =
  | { type: "home" }
  | { type: "proposal"; proposalId: bigint }
  | { type: "reviewer"; principal: string }
  | { type: "admin" }
  | { type: "auditLog" };
