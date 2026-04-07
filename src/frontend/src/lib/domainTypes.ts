/**
 * Domain types for the NNS Technical Review Hub.
 * These mirror the Motoko backend types and are referenced throughout the frontend.
 */
import type { Principal } from "@dfinity/principal";

export enum Recommendation {
  adopt = "Adopt",
  reject = "Reject",
}

export interface Proposal {
  proposalId: bigint;
  title: string;
  timestamp: bigint;
  deadline: bigint;
  creationDate: bigint;
  deadlineDate: bigint;
  topic: bigint;
}

export interface ReviewerSummary {
  principal: Principal;
  nickname: string;
}

export interface Review {
  proposalId: bigint;
  reviewer: ReviewerSummary;
  status: "paid" | "volunteer";
  link: string;
  recommendation: Recommendation;
  isPaidReview: boolean;
  timestamp: bigint;
  topic: bigint;
}

export interface Reviewer {
  principal: Principal;
  nickname: string;
  forumProfileUrl: string;
}

export interface GrantAssignment {
  topic: bigint;
  startDate: bigint;
  endDate: bigint;
}

export interface ReviewerWithAssignments {
  reviewer: Reviewer;
  assignments: Array<[bigint, GrantAssignment]>;
}

export type ReviewerStatus =
  | "paidGrantee"
  | "volunteerFormerGrantee"
  | "volunteer";

export interface ReviewerDetail {
  reviewer: Reviewer;
  paidReviews: bigint;
  voluntaryReviews: bigint;
  totalReviews: bigint;
  status: ReviewerStatus;
  currentAssignments: Array<[bigint, GrantAssignment]>;
  allAssignments: Array<[bigint, GrantAssignment]>;
  assignments: Array<[bigint, GrantAssignment]>;
  reviews: Review[];
  todoProposals: Proposal[];
  missedProposals: Proposal[];
}

export interface UserProfile {
  nickname: string;
  forumProfileUrl: string;
}

export type UserRole = "admin" | "reviewer" | "guest";

export type AddOrUpdateResult = "ok" | "duplicateError" | "notFoundError";

export enum FixReviewStatusResult {
  fixedReviewStatus = "fixedReviewStatus",
  alreadyCorrect = "alreadyCorrect",
  invalidReviewer = "invalidReviewer",
  invalidProposal = "invalidProposal",
}
