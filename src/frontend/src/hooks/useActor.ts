// Wraps the core-infrastructure useActor with the app-specific createActor function
// and provides a typed actor interface for all backend methods.
import { useActor as _useActor } from "@caffeineai/core-infrastructure";
import type { Principal } from "@dfinity/principal";
import { createActor } from "../backend";
import type { AuditLogEntry } from "../lib/auditTypes";
import type {
  AddOrUpdateResult,
  FixReviewStatusResult,
  Proposal,
  Recommendation,
  Review,
  Reviewer,
  ReviewerDetail,
  ReviewerWithAssignments,
  UserProfile,
  UserRole,
} from "../lib/domainTypes";

/** Backend ProposalWithCounts — includes adoptCount, rejectCount, and totalReviewCount. */
export interface BackendProposalWithCounts {
  proposalId: bigint;
  title: string;
  timestamp: bigint;
  deadline: bigint;
  creationDate: bigint;
  deadlineDate: bigint;
  topic: bigint;
  adoptCount: bigint;
  rejectCount: bigint;
  totalReviewCount: bigint;
}

/** Full typed interface for all backend canister methods. */
export interface BackendActor {
  // User Profile
  getCallerUserProfile(): Promise<UserProfile>;
  saveCallerUserProfile(profile: UserProfile): Promise<void>;
  getCallerUserRole(): Promise<UserRole>;

  // Admin
  isCallerAdmin(): Promise<boolean>;
  getAllAdmins(): Promise<Principal[]>;
  addAdmin(principal: Principal): Promise<void>;
  removeAdmin(principal: Principal): Promise<void>;

  // Authorized proposal submitter
  getAuthorizedProposalSubmitter(): Promise<Principal | null>;
  setAuthorizedProposalSubmitter(principal: Principal | null): Promise<void>;

  // Proposals
  getProposals(
    topicFilter: bigint | null,
  ): Promise<BackendProposalWithCounts[]>;
  getAllProposalIds(): Promise<bigint[]>;
  addProposal(
    id: bigint,
    title: string,
    timestamp: bigint,
    deadline: bigint,
    creationDate: bigint,
    deadlineDate: bigint,
    topic: bigint,
  ): Promise<void>;
  removeProposal(id: bigint): Promise<void>;
  saveExternalProposal(proposal: Proposal): Promise<void>;
  saveExternalProposals(proposals: Proposal[]): Promise<bigint[]>;
  fetchIndividualProposal(proposalId: bigint): Promise<string>;

  // Reviews
  getProposalReviews(proposalId: bigint): Promise<Review[]>;
  getRecommendationCounts(proposalId: bigint): Promise<[bigint, bigint]>;
  submitReview(
    proposalId: bigint,
    reviewLink: string,
    recommendation: Recommendation,
  ): Promise<void>;
  updateReviewLink(
    proposalId: bigint,
    reviewerPrincipal: Principal,
    newLink: string,
    comment: string,
  ): Promise<void>;
  fixReviewStatus(
    proposalId: bigint,
    reviewerPrincipal: Principal,
    comment: string,
  ): Promise<FixReviewStatusResult>;
  adminAddReview(
    proposalId: bigint,
    reviewerPrincipal: Principal,
    reviewLink: string,
    recommendation: Recommendation,
    comment: string,
  ): Promise<void>;
  adminRemoveReview(
    proposalId: bigint,
    reviewerPrincipal: Principal,
    comment: string,
  ): Promise<void>;

  // Audit Log
  getAuditLog(page: bigint, pageSize: bigint): Promise<AuditLogEntry[]>;
  getAuditLogSize(): Promise<bigint>;

  // Reviewers
  getAllReviewers(): Promise<ReviewerWithAssignments[]>;
  getReviewer(principal: Principal): Promise<Reviewer | null>;
  getReviewerDetail(principal: Principal): Promise<ReviewerDetail | null>;
  getReviewerAssignments(
    principal: Principal,
  ): Promise<Array<[bigint, unknown]>>;
  getReviewerReviewHistory(principal: Principal): Promise<Review[]>;
  getReviewerTodos(principal: Principal): Promise<Proposal[]>;
  getReviewerMissedProposals(principal: Principal): Promise<Proposal[]>;
  isReviewer(): Promise<boolean>;
  addOrUpdateReviewer(
    principal: Principal,
    nickname: string,
    forumProfileUrl: string,
  ): Promise<AddOrUpdateResult>;
  updateReviewer(
    principal: Principal,
    nickname: string,
    forumProfileUrl: string,
  ): Promise<AddOrUpdateResult>;
  removeReviewer(principal: Principal): Promise<void>;
  assignReviewerToTopic(
    reviewer: Principal,
    topic: bigint,
    startDate: bigint,
    endDate: bigint,
  ): Promise<void>;

  // Topics
  getAllTopics(): Promise<Array<[bigint, string]>>;
  getTopicDisplayName(topicId: bigint): Promise<string>;
}

export function useActor(): {
  actor: BackendActor | null;
  isFetching: boolean;
} {
  const result = _useActor(createActor);
  return {
    actor: result.actor as unknown as BackendActor | null,
    isFetching: result.isFetching,
  };
}
