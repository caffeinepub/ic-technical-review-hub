import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface AuditLogEntry {
    id: bigint;
    adminPrincipal: Principal;
    actionType: AuditActionType;
    reviewerNickname: string;
    comment: string;
    proposalTitle: string;
    afterValue?: string;
    timestamp: bigint;
    reviewerPrincipal: Principal;
    beforeValue?: string;
    proposalId: bigint;
}
export interface Reviewer {
    principal: Principal;
    nickname: string;
    forumProfileUrl: string;
}
export interface ReviewerWithAssignments {
    assignments: Array<[bigint, ReviewerAssignment]>;
    reviewer: Reviewer;
}
export interface Proposal {
    title: string;
    topic: bigint;
    deadlineDate: bigint;
    deadline: bigint;
    creationDate: bigint;
    timestamp: bigint;
    proposalId: bigint;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface ProposalWithCounts {
    title: string;
    topic: bigint;
    deadlineDate: bigint;
    deadline: bigint;
    creationDate: bigint;
    rejectCount: bigint;
    adoptCount: bigint;
    timestamp: bigint;
    proposalId: bigint;
    totalReviewCount: bigint;
}
export interface ReviewerDetail {
    paidReviews: bigint;
    status: ReviewerStatus;
    currentAssignments: Array<[bigint, ReviewerAssignment]>;
    totalReviews: bigint;
    reviewer: Reviewer;
    voluntaryReviews: bigint;
    allAssignments: Array<[bigint, ReviewerAssignment]>;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface ReviewerAssignment {
    endDate: bigint;
    startDate: bigint;
}
export interface Review {
    status: Variant_paid_volunteer;
    topic: bigint;
    link: string;
    timestamp: bigint;
    recommendation: Recommendation;
    reviewer: Reviewer;
    proposalId: bigint;
}
export interface UserProfile {
    nickname: string;
    forumProfileUrl: string;
}
export enum AddOrUpdateResult {
    updateError = "updateError",
    duplicateError = "duplicateError",
    success = "success",
    notFoundError = "notFoundError"
}
export enum AuditActionType {
    fixReviewStatus = "fixReviewStatus",
    removeReview = "removeReview",
    editReviewLink = "editReviewLink",
    addReview = "addReview"
}
export enum FixReviewStatusResult {
    invalidProposal = "invalidProposal",
    invalidReviewer = "invalidReviewer",
    alreadyCorrect = "alreadyCorrect",
    fixedReviewStatus = "fixedReviewStatus"
}
export enum Recommendation {
    reject = "reject",
    adopt = "adopt"
}
export enum ReviewerStatus {
    paidGrantee = "paidGrantee",
    volunteerFormerGrantee = "volunteerFormerGrantee",
    volunteer = "volunteer"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_paid_volunteer {
    paid = "paid",
    volunteer = "volunteer"
}
export interface backendInterface {
    addAdmin(principal: Principal): Promise<void>;
    addOrUpdateReviewer(principal: Principal, nickname: string, forumProfileUrl: string): Promise<AddOrUpdateResult>;
    addProposal(proposalId: bigint, title: string, timestamp: bigint, deadline: bigint, creationDate: bigint, deadlineDate: bigint, topic: bigint): Promise<void>;
    adminAddReview(proposalId: bigint, reviewerPrincipal: Principal, reviewLink: string, recommendation: Recommendation, comment: string): Promise<void>;
    adminRemoveReview(proposalId: bigint, reviewerPrincipal: Principal, comment: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignReviewerToTopic(reviewer: Principal, topic: bigint, startDate: bigint, endDate: bigint): Promise<void>;
    clearAllProposals(): Promise<void>;
    fetchIndividualProposal(proposalId: bigint): Promise<string>;
    fixReviewStatus(proposalId: bigint, reviewerPrincipal: Principal, comment: string): Promise<FixReviewStatusResult>;
    getAllAdmins(): Promise<Array<Principal>>;
    getAllProposalIds(): Promise<Array<bigint>>;
    getAllReviewers(): Promise<Array<ReviewerWithAssignments>>;
    getAllTopics(): Promise<Array<[bigint, string]>>;
    getAuditLog(page: bigint, pageSize: bigint): Promise<Array<AuditLogEntry>>;
    getAuditLogSize(): Promise<bigint>;
    getAuthorizedProposalSubmitter(): Promise<Principal | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getProposal(proposalId: bigint): Promise<Proposal | null>;
    getProposalReviews(proposalId: bigint): Promise<Array<Review>>;
    getProposals(topicFilter: bigint | null): Promise<Array<ProposalWithCounts>>;
    getRecommendationCounts(proposalId: bigint): Promise<[bigint, bigint]>;
    getReviewer(principal: Principal): Promise<Reviewer | null>;
    getReviewerAssignments(principal: Principal): Promise<Array<[bigint, ReviewerAssignment]>>;
    getReviewerDetail(principal: Principal): Promise<ReviewerDetail | null>;
    getReviewerMissedProposals(principal: Principal): Promise<Array<Proposal>>;
    getReviewerReviewHistory(principal: Principal): Promise<Array<Review>>;
    getReviewerTodos(principal: Principal): Promise<Array<Proposal>>;
    getTopicDisplayName(topicId: bigint): Promise<string>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isAdmin(principal: Principal): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isReviewer(): Promise<boolean>;
    removeAdmin(principal: Principal): Promise<void>;
    removeProposal(proposalId: bigint): Promise<void>;
    removeReviewer(principal: Principal): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveExternalProposal(newProposal: Proposal): Promise<boolean>;
    saveExternalProposals(newProposals: Array<Proposal>): Promise<Array<bigint>>;
    setAuthorizedProposalSubmitter(principal: Principal | null): Promise<void>;
    submitReview(proposalId: bigint, reviewLink: string, recommendation: Recommendation): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateReviewLink(proposalId: bigint, reviewerPrincipal: Principal, newLink: string, comment: string): Promise<boolean>;
    updateReviewer(principal: Principal, nickname: string, forumProfileUrl: string): Promise<AddOrUpdateResult>;
}
