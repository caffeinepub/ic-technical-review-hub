import type { Principal } from "@dfinity/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

// Global error handler for backend errors
const handleBackendError = (error: any) => {
  console.error("Backend error:", error);
  // Error will be caught by BackendErrorMonitor component
  throw error;
};

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  const query = useQuery<UserProfile | null>({
    queryKey: [
      "currentUserProfile",
      identity?.getPrincipal().toString() ?? "anonymous",
    ],
    queryFn: async () => {
      if (!actor || !identity) return null;
      try {
        return await actor.getCallerUserProfile();
      } catch (error: any) {
        if (
          error.message?.includes("Unauthorized") ||
          error.message?.includes("Authentication required")
        ) {
          return null;
        }
        handleBackendError(error);
        throw error;
      }
    },
    enabled: !!actor && !actorFetching && !!identity,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && !!identity && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
      queryClient.invalidateQueries({ queryKey: ["callerUserRole"] });
    },
    onError: handleBackendError,
  });
}

// User Role Queries
export function useGetCallerUserRole() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<UserRole>({
    queryKey: [
      "callerUserRole",
      identity?.getPrincipal().toString() ?? "anonymous",
    ],
    queryFn: async () => {
      if (!actor || !identity) return "guest" as UserRole;
      try {
        return await actor.getCallerUserRole();
      } catch (error: any) {
        console.error("Error fetching user role:", error);
        return "guest" as UserRole;
      }
    },
    enabled: !!actor && !actorFetching && !!identity,
    retry: false,
  });
}

// Admin Queries
export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ["isAdmin", identity?.getPrincipal().toString() ?? "anonymous"],
    queryFn: async () => {
      if (!actor || !identity) return false;
      try {
        return await actor.isCallerAdmin();
      } catch (error: any) {
        console.error("Error checking admin status:", error);
        return false;
      }
    },
    enabled: !!actor && !isFetching && !!identity,
    retry: false,
  });
}

export function useGetAllAdmins() {
  const { actor, isFetching } = useActor();

  return useQuery<Principal[]>({
    queryKey: ["allAdmins"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllAdmins();
      } catch (error: any) {
        if (error.message?.includes("Unauthorized")) {
          return [];
        }
        handleBackendError(error);
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

export function useAddAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (principal: Principal) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addAdmin(principal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allAdmins"] });
      queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["callerUserRole"] });
    },
    onError: handleBackendError,
  });
}

export function useRemoveAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (principal: Principal) => {
      if (!actor) throw new Error("Actor not available");
      return actor.removeAdmin(principal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allAdmins"] });
      queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["callerUserRole"] });
    },
    onError: handleBackendError,
  });
}

// Authorized Proposal Submitter Queries
export function useGetAuthorizedProposalSubmitter() {
  const { actor, isFetching } = useActor();

  return useQuery<Principal | null>({
    queryKey: ["authorizedProposalSubmitter"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getAuthorizedProposalSubmitter();
      } catch (error: any) {
        if (error.message?.includes("Unauthorized")) {
          return null;
        }
        handleBackendError(error);
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

export function useSetAuthorizedProposalSubmitter() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (principal: Principal | null) => {
      if (!actor) throw new Error("Actor not available");
      return actor.setAuthorizedProposalSubmitter(principal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["authorizedProposalSubmitter"],
      });
    },
    onError: handleBackendError,
  });
}

// Proposal Queries
export function useGetProposals(topicFilter?: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Proposal[]>({
    queryKey: ["proposals", topicFilter?.toString() ?? "all"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getProposals(topicFilter ?? null);
      } catch (error: any) {
        handleBackendError(error);
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

// Get single proposal (derived from all proposals)
export function useGetProposal(proposalId: bigint) {
  const { data: proposals } = useGetProposals();

  return useQuery<Proposal | null>({
    queryKey: ["proposal", proposalId.toString()],
    queryFn: async () => {
      if (!proposals) return null;
      return proposals.find((p) => p.proposalId === proposalId) || null;
    },
    enabled: !!proposals,
  });
}

export function useGetAllProposalIds() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint[]>({
    queryKey: ["allProposalIds"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllProposalIds();
      } catch (error: any) {
        handleBackendError(error);
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetProposalReviews(proposalId: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<Review[]>({
    queryKey: ["proposalReviews", proposalId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getProposalReviews(proposalId);
      } catch (error: any) {
        handleBackendError(error);
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetProposalReviewCount(proposalId: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ["proposalReviewCount", proposalId.toString()],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      try {
        const reviews = await actor.getProposalReviews(proposalId);
        return BigInt(reviews.length);
      } catch (error: any) {
        handleBackendError(error);
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetRecommendationCounts(proposalId: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<[bigint, bigint]>({
    queryKey: ["recommendationCounts", proposalId.toString()],
    queryFn: async () => {
      if (!actor) return [BigInt(0), BigInt(0)];
      try {
        return await actor.getRecommendationCounts(proposalId);
      } catch (error: any) {
        handleBackendError(error);
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddProposal() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: bigint;
      title: string;
      timestamp: bigint;
      deadline: bigint;
      creationDate: bigint;
      deadlineDate: bigint;
      topic: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addProposal(
        params.id,
        params.title,
        params.timestamp,
        params.deadline,
        params.creationDate,
        params.deadlineDate,
        params.topic,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["allProposalIds"] });
    },
    onError: handleBackendError,
  });
}

export function useFetchIndividualProposal() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (proposalId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      const jsonResponse = await actor.fetchIndividualProposal(proposalId);
      return JSON.parse(jsonResponse);
    },
    onError: handleBackendError,
  });
}

export function useSaveExternalProposal() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposal: Proposal) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.saveExternalProposal(proposal);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["allProposalIds"] });
    },
    onError: handleBackendError,
  });
}

export function useSaveExternalProposals() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposals: Proposal[]) => {
      if (!actor) throw new Error("Actor not available");
      const savedIds = await actor.saveExternalProposals(proposals);
      return savedIds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["allProposalIds"] });
    },
    onError: handleBackendError,
  });
}

export function useRemoveProposal() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.removeProposal(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["allProposalIds"] });
      queryClient.invalidateQueries({ queryKey: ["proposalReviews"] });
      queryClient.invalidateQueries({ queryKey: ["allReviewers"] });
      queryClient.invalidateQueries({ queryKey: ["reviewerDetail"] });
    },
    onError: handleBackendError,
  });
}

// Review Queries
export function useSubmitReview() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      proposalId: bigint;
      reviewLink: string;
      recommendation: Recommendation;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.submitReview(
        params.proposalId,
        params.reviewLink,
        params.recommendation,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["proposalReviews", variables.proposalId.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["proposalReviewCount", variables.proposalId.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["recommendationCounts", variables.proposalId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["reviewerDetail"] });
      queryClient.invalidateQueries({ queryKey: ["reviewerReviewHistory"] });
      queryClient.invalidateQueries({ queryKey: ["reviewerTodos"] });
    },
    onError: handleBackendError,
  });
}

export function useUpdateReviewLink() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      proposalId: bigint;
      reviewerPrincipal: Principal;
      newLink: string;
      comment: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateReviewLink(
        params.proposalId,
        params.reviewerPrincipal,
        params.newLink,
        params.comment,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["proposalReviews", variables.proposalId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["reviewerDetail"] });
      queryClient.invalidateQueries({ queryKey: ["reviewerReviewHistory"] });
      queryClient.invalidateQueries({ queryKey: ["auditLog"] });
      queryClient.invalidateQueries({ queryKey: ["auditLogSize"] });
    },
    onError: handleBackendError,
  });
}

export function useFixReviewStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      proposalId: bigint;
      reviewerPrincipal: Principal;
      comment: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.fixReviewStatus(
        params.proposalId,
        params.reviewerPrincipal,
        params.comment,
      );
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["proposalReviews", variables.proposalId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["reviewerDetail"] });
      queryClient.invalidateQueries({ queryKey: ["reviewerReviewHistory"] });
      queryClient.invalidateQueries({ queryKey: ["auditLog"] });
      queryClient.invalidateQueries({ queryKey: ["auditLogSize"] });
      return result;
    },
    onError: handleBackendError,
  });
}

export function useAdminAddReview() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      proposalId: bigint;
      reviewerPrincipal: Principal;
      reviewLink: string;
      recommendation: Recommendation;
      comment: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.adminAddReview(
        params.proposalId,
        params.reviewerPrincipal,
        params.reviewLink,
        params.recommendation,
        params.comment,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["proposalReviews", variables.proposalId.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["proposalReviewCount", variables.proposalId.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["recommendationCounts", variables.proposalId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["reviewerDetail"] });
      queryClient.invalidateQueries({ queryKey: ["reviewerReviewHistory"] });
      queryClient.invalidateQueries({ queryKey: ["reviewerTodos"] });
      queryClient.invalidateQueries({ queryKey: ["auditLog"] });
      queryClient.invalidateQueries({ queryKey: ["auditLogSize"] });
    },
    onError: handleBackendError,
  });
}

export function useAdminRemoveReview() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      proposalId: bigint;
      reviewerPrincipal: Principal;
      comment: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.adminRemoveReview(
        params.proposalId,
        params.reviewerPrincipal,
        params.comment,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["proposalReviews", variables.proposalId.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["proposalReviewCount", variables.proposalId.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["recommendationCounts", variables.proposalId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["reviewerDetail"] });
      queryClient.invalidateQueries({ queryKey: ["reviewerReviewHistory"] });
      queryClient.invalidateQueries({ queryKey: ["auditLog"] });
      queryClient.invalidateQueries({ queryKey: ["auditLogSize"] });
    },
    onError: handleBackendError,
  });
}

export function useGetAuditLog(page: number, pageSize: number) {
  const { actor, isFetching } = useActor();

  return useQuery<AuditLogEntry[]>({
    queryKey: ["auditLog", page.toString(), pageSize.toString()],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      try {
        const result = await actor.getAuditLog(BigInt(page), BigInt(pageSize));
        return result ?? [];
      } catch (error: any) {
        console.error("[AuditLog] getAuditLog query failed:", error);
        handleBackendError(error);
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useGetAuditLogSize() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ["auditLogSize"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      try {
        return await actor.getAuditLogSize();
      } catch (error: any) {
        handleBackendError(error);
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

// Reviewer Queries - Using backend methods directly
export function useGetAllReviewers() {
  const { actor, isFetching } = useActor();

  return useQuery<ReviewerWithAssignments[]>({
    queryKey: ["allReviewers"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllReviewers();
      } catch (error: any) {
        handleBackendError(error);
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetReviewer(principal: Principal | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery<Reviewer | null>({
    queryKey: ["reviewer", principal?.toString() ?? "none"],
    queryFn: async () => {
      if (!actor || !principal) return null;
      try {
        return await actor.getReviewer(principal);
      } catch (error: any) {
        handleBackendError(error);
        throw error;
      }
    },
    enabled: !!actor && !isFetching && !!principal,
  });
}

export function useGetReviewerDetail(principal: Principal | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery<ReviewerDetail | null>({
    queryKey: ["reviewerDetail", principal?.toString() ?? "none"],
    queryFn: async () => {
      if (!actor || !principal) return null;
      try {
        return await actor.getReviewerDetail(principal);
      } catch (error: any) {
        handleBackendError(error);
        throw error;
      }
    },
    enabled: !!actor && !isFetching && !!principal,
  });
}

export function useGetReviewerAssignments(principal: Principal) {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[bigint, any]>>({
    queryKey: ["reviewerAssignments", principal.toString()],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getReviewerAssignments(principal);
      } catch (error: any) {
        handleBackendError(error);
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetReviewerReviewHistory(principal: Principal) {
  const { actor, isFetching } = useActor();

  return useQuery<Review[]>({
    queryKey: ["reviewerReviewHistory", principal.toString()],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getReviewerReviewHistory(principal);
      } catch (error: any) {
        handleBackendError(error);
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetReviewerTodos(principal: Principal) {
  const { actor, isFetching } = useActor();

  return useQuery<Proposal[]>({
    queryKey: ["reviewerTodos", principal.toString()],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getReviewerTodos(principal);
      } catch (error: any) {
        handleBackendError(error);
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetReviewerMissedProposals(principal: Principal) {
  const { actor, isFetching } = useActor();

  return useQuery<Proposal[]>({
    queryKey: ["reviewerMissedProposals", principal.toString()],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getReviewerMissedProposals(principal);
      } catch (error: any) {
        handleBackendError(error);
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

// Get reviewer public table (for homepage) - derived from getAllReviewers
export function useGetReviewerPublicTable() {
  const { data: allReviewers } = useGetAllReviewers();

  return useQuery<Array<[Principal, Reviewer, string, Array<[bigint, any]>]>>({
    queryKey: ["reviewerPublicTable"],
    queryFn: async () => {
      if (!allReviewers) return [];

      const now = Date.now() * 1_000_000; // Convert to nanoseconds

      return allReviewers.map(({ reviewer, assignments }) => {
        // Check if reviewer has any active assignments
        const hasActiveAssignment = assignments.some(([_, assignment]) => {
          return (
            now >= Number(assignment.startDate) &&
            now <= Number(assignment.endDate)
          );
        });

        // Check if reviewer has any past assignments
        const hasPastAssignment = assignments.some(([_, assignment]) => {
          return now > Number(assignment.endDate);
        });

        let type: string;
        if (hasActiveAssignment) {
          type = "Paid Grantee";
        } else if (hasPastAssignment) {
          type = "Volunteer (Former Grantee)";
        } else {
          type = "Volunteer";
        }

        return [reviewer.principal, reviewer, type, assignments] as [
          Principal,
          Reviewer,
          string,
          Array<[bigint, any]>,
        ];
      });
    },
    enabled: !!allReviewers,
  });
}

// Check if caller is reviewer
export function useIsCallerReviewer() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: [
      "isCallerReviewer",
      identity?.getPrincipal().toString() ?? "anonymous",
    ],
    queryFn: async () => {
      if (!actor || !identity) return false;
      try {
        return await actor.isReviewer();
      } catch (error: any) {
        console.error("Error checking reviewer status:", error);
        return false;
      }
    },
    enabled: !!actor && !isFetching && !!identity,
    retry: false,
  });
}

// Reviewer Management
export function useAddOrUpdateReviewer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      principal: Principal;
      nickname: string;
      forumProfileUrl: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.addOrUpdateReviewer(
        params.principal,
        params.nickname,
        params.forumProfileUrl,
      );

      if (result === "duplicateError") {
        throw new Error("A reviewer with this Principal ID already exists");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callerUserRole"] });
      queryClient.invalidateQueries({ queryKey: ["allReviewers"] });
      queryClient.invalidateQueries({ queryKey: ["reviewer"] });
      queryClient.invalidateQueries({ queryKey: ["reviewerDetail"] });
    },
    onError: handleBackendError,
  });
}

export function useUpdateReviewer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      principal: Principal;
      nickname: string;
      forumProfileUrl: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.updateReviewer(
        params.principal,
        params.nickname,
        params.forumProfileUrl,
      );

      if (result === "notFoundError") {
        throw new Error("Reviewer not found");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callerUserRole"] });
      queryClient.invalidateQueries({ queryKey: ["allReviewers"] });
      queryClient.invalidateQueries({ queryKey: ["reviewer"] });
      queryClient.invalidateQueries({ queryKey: ["reviewerDetail"] });
    },
    onError: handleBackendError,
  });
}

export function useRemoveReviewer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (principal: Principal) => {
      if (!actor) throw new Error("Actor not available");
      return actor.removeReviewer(principal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callerUserRole"] });
      queryClient.invalidateQueries({ queryKey: ["allReviewers"] });
      queryClient.invalidateQueries({ queryKey: ["reviewer"] });
      queryClient.invalidateQueries({ queryKey: ["reviewerDetail"] });
    },
    onError: handleBackendError,
  });
}

// Reviewer Assignment
export function useAssignReviewerToTopic() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      reviewer: Principal;
      topic: bigint;
      startDate: bigint;
      endDate: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.assignReviewerToTopic(
        params.reviewer,
        params.topic,
        params.startDate,
        params.endDate,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callerUserRole"] });
      queryClient.invalidateQueries({ queryKey: ["allReviewers"] });
      queryClient.invalidateQueries({ queryKey: ["reviewerDetail"] });
      queryClient.invalidateQueries({ queryKey: ["reviewerAssignments"] });
      queryClient.invalidateQueries({ queryKey: ["reviewerTodos"] });
    },
    onError: handleBackendError,
  });
}

// Topic Queries
export function useGetAllTopics() {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[bigint, string]>>({
    queryKey: ["allTopics"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllTopics();
      } catch (error: any) {
        handleBackendError(error);
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTopicDisplayName(topicId: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<string>({
    queryKey: ["topicDisplayName", topicId.toString()],
    queryFn: async () => {
      if (!actor) return "Unknown Topic";
      try {
        return await actor.getTopicDisplayName(topicId);
      } catch (error: any) {
        handleBackendError(error);
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
  });
}
