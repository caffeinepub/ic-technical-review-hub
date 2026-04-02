/**
 * Audit log types — augmenting backend.ts with newly added backend features.
 * These types mirror backend.d.ts but are defined here to avoid
 * resolution conflicts with the auto-generated backend.ts.
 */
import type { Principal } from "@dfinity/principal";

export interface AuditLogEntry {
  id: bigint;
  timestamp: bigint;
  adminPrincipal: Principal;
  actionType: AuditActionType;
  proposalId: bigint;
  proposalTitle: string;
  reviewerPrincipal: Principal;
  reviewerNickname: string;
  comment: string;
  beforeValue: string | null;
  afterValue: string | null;
}

export enum AuditActionType {
  addReview = "addReview",
  removeReview = "removeReview",
  editReviewLink = "editReviewLink",
  fixReviewStatus = "fixReviewStatus",
}
