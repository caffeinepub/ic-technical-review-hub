import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Principal } from "@dfinity/principal";
import {
  useNavigate,
  useParams,
  useRouter,
  useSearch,
} from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle,
  Copy,
  ExternalLink,
  Heart,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import {
  useGetReviewerAssignments,
  useGetReviewerDetail,
  useGetReviewerMissedProposals,
  useGetReviewerReviewHistory,
  useGetReviewerTodos,
} from "../hooks/useQueries";
import { formatDateTime } from "../lib/dateUtils";
import { Recommendation } from "../lib/domainTypes";
import type { Review } from "../lib/domainTypes";
import { topicIdToDisplayName } from "../lib/topicUtils";

export default function ReviewerProfilePage() {
  const { principal } = useParams({ from: "/reviewer/$principal" });
  const search = useSearch({ from: "/reviewer/$principal" });
  const navigate = useNavigate({ from: "/reviewer/$principal" });
  const router = useRouter();

  const activeTab = search.tab ?? "history";
  const reviewsPage = search.reviewPage ?? 1;
  const todoPage = search.todoPage ?? 1;
  const assignmentsPage = search.assignmentPage ?? 1;

  const setActiveTab = (tab: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        tab: tab === "history" ? undefined : (tab as "todos" | "assignments"),
      }),
    });
  };
  const setReviewsPage = (p: number) => {
    navigate({
      search: (prev) => ({ ...prev, reviewPage: p > 1 ? p : undefined }),
    });
  };
  const setTodoPage = (p: number) => {
    navigate({
      search: (prev) => ({ ...prev, todoPage: p > 1 ? p : undefined }),
    });
  };
  const setAssignmentsPage = (p: number) => {
    navigate({
      search: (prev) => ({ ...prev, assignmentPage: p > 1 ? p : undefined }),
    });
  };

  const { isFetching: actorFetching } = useActor();
  const [copied, setCopied] = useState(false);
  const itemsPerPage = 10;

  // Validate principal format
  let reviewerPrincipal: Principal;
  try {
    reviewerPrincipal = Principal.fromText(principal);
  } catch {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/" })}
          className="mb-6 rounded-md transition-all duration-200 border-border hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card className="rounded-lg border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            Reviewer not found
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ReviewerProfileContent
      principal={principal}
      reviewerPrincipal={reviewerPrincipal}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      reviewsPage={reviewsPage}
      setReviewsPage={setReviewsPage}
      todoPage={todoPage}
      setTodoPage={setTodoPage}
      assignmentsPage={assignmentsPage}
      setAssignmentsPage={setAssignmentsPage}
      actorFetching={actorFetching}
      copied={copied}
      setCopied={setCopied}
      itemsPerPage={itemsPerPage}
      router={router}
      navigate={navigate}
    />
  );
}

function ReviewerProfileContent({
  principal,
  reviewerPrincipal,
  activeTab,
  setActiveTab,
  reviewsPage,
  setReviewsPage,
  todoPage,
  setTodoPage,
  assignmentsPage,
  setAssignmentsPage,
  actorFetching,
  copied,
  setCopied,
  itemsPerPage,
  router,
  navigate,
}: {
  principal: string;
  reviewerPrincipal: Principal;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  reviewsPage: number;
  setReviewsPage: (p: number) => void;
  todoPage: number;
  setTodoPage: (p: number) => void;
  assignmentsPage: number;
  setAssignmentsPage: (p: number) => void;
  actorFetching: boolean;
  copied: boolean;
  setCopied: (v: boolean) => void;
  itemsPerPage: number;
  router: ReturnType<typeof useRouter>;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { data: reviewerDetail, isLoading: reviewerLoading } =
    useGetReviewerDetail(reviewerPrincipal);
  const {
    data: reviews,
    isLoading: reviewsLoading,
    isFetching: reviewsFetching,
  } = useGetReviewerReviewHistory(reviewerPrincipal);
  const { isLoading: assignmentsLoading, isFetching: assignmentsFetching } =
    useGetReviewerAssignments(reviewerPrincipal);
  const {
    data: todoProposals,
    isLoading: todosLoading,
    isFetching: todosFetching,
  } = useGetReviewerTodos(reviewerPrincipal);
  const { data: missedProposals, isLoading: missedLoading } =
    useGetReviewerMissedProposals(reviewerPrincipal);

  const handleBack = () => {
    router.history.back();
  };

  if (actorFetching || reviewerLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <Skeleton className="h-8 w-32 mb-6 rounded-md" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!reviewerDetail) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <Button
          variant="outline"
          onClick={handleBack}
          className="mb-6 rounded-md transition-all duration-200 border-border hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card className="rounded-lg border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            Reviewer not found
          </CardContent>
        </Card>
      </div>
    );
  }

  const reviewer = reviewerDetail.reviewer;
  const paidReviews = Number(reviewerDetail.paidReviews);
  const volunteerReviews = Number(reviewerDetail.voluntaryReviews);
  const totalReviews = Number(reviewerDetail.totalReviews);

  let reviewerStatus = "Volunteer";
  let hasActiveAssignment = false;
  let activeAssignment: { topic: bigint; endDate: bigint } | null = null;

  if (reviewerDetail.status === "paidGrantee") {
    reviewerStatus = "Paid Grantee";
    hasActiveAssignment = true;
    if (reviewerDetail.currentAssignments.length > 0) {
      const [topic, assignment] = reviewerDetail.currentAssignments[0];
      activeAssignment = { topic, endDate: assignment.endDate };
    }
  } else if (reviewerDetail.status === "volunteerFormerGrantee") {
    reviewerStatus = "Volunteer (Former Grantee)";
  }

  const totalReviewsPages = Math.ceil((reviews?.length || 0) / itemsPerPage);
  const paginatedReviews = reviews?.slice(
    (reviewsPage - 1) * itemsPerPage,
    reviewsPage * itemsPerPage,
  );

  const totalTodoPages = Math.ceil((todoProposals?.length || 0) / itemsPerPage);
  const paginatedTodo = todoProposals?.slice(
    (todoPage - 1) * itemsPerPage,
    todoPage * itemsPerPage,
  );

  const totalAssignmentsPages = Math.ceil(
    (reviewerDetail.allAssignments?.length || 0) / itemsPerPage,
  );
  const paginatedAssignments = reviewerDetail.allAssignments?.slice(
    (assignmentsPage - 1) * itemsPerPage,
    assignmentsPage * itemsPerPage,
  );

  const handleCopyPrincipal = async () => {
    try {
      await navigator.clipboard.writeText(principal);
      setCopied(true);
      toast.success("Principal copied!", { duration: 2000 });
      setTimeout(() => setCopied(false), 2000);
    } catch (_error) {
      toast.error("Failed to copy Principal ID");
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8">
      <Button
        variant="outline"
        onClick={handleBack}
        className="mb-6 rounded-md transition-all duration-200 border-border hover:bg-accent"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="space-y-6">
        <Card
          className={`rounded-lg border-border ${hasActiveAssignment ? "border-green-500 dark:border-green-600" : ""}`}
        >
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl break-words">
              {reviewer.nickname}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleCopyPrincipal}
                className="font-mono text-xs flex items-center gap-1.5 hover:text-foreground transition-colors duration-200 group"
                title="Click to copy full Principal ID"
              >
                <span>
                  {principal.slice(0, 8)}...{principal.slice(-6)}
                </span>
                <Copy
                  className={`h-3 w-3 transition-all duration-200 ${copied ? "text-green-500" : "opacity-0 group-hover:opacity-100"}`}
                />
              </button>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Badge
                  variant={hasActiveAssignment ? "default" : "secondary"}
                  className={`rounded-full ${hasActiveAssignment ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
                >
                  {reviewerStatus}
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  {totalReviews} Total Reviews
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-full flex items-center gap-1"
                >
                  <Award className="h-3 w-3" />
                  {paidReviews} Paid
                </Badge>
                <Badge
                  variant="secondary"
                  className="rounded-full flex items-center gap-1"
                >
                  <Heart className="h-3 w-3" />
                  {volunteerReviews} Volunteer
                </Badge>
                {reviewer.forumProfileUrl && (
                  <a
                    href={reviewer.forumProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1 transition-colors duration-200"
                  >
                    Forum Profile <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {hasActiveAssignment && activeAssignment && (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-green-900 dark:text-green-100">
                        Active Grant Assignment
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Topic: {topicIdToDisplayName(activeAssignment.topic)}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Grant ends: {formatDateTime(activeAssignment.endDate)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="bg-transparent border-0 p-0 gap-3 grid w-full grid-cols-3">
            <TabsTrigger
              value="history"
              className="data-[state=inactive]:bg-transparent data-[state=inactive]:text-[#888888] data-[state=inactive]:border-0 data-[state=active]:bg-[#2A2A2A] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white hover:border-white hover:text-[#AAAAAA] rounded-md transition-all duration-200"
            >
              Review History
            </TabsTrigger>
            <TabsTrigger
              value="todos"
              className="data-[state=inactive]:bg-transparent data-[state=inactive]:text-[#888888] data-[state=inactive]:border-0 data-[state=active]:bg-[#2A2A2A] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white hover:border-white hover:text-[#AAAAAA] rounded-md transition-all duration-200 relative"
            >
              Review TODOs
              {todoProposals && todoProposals.length > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-2 rounded-full h-5 min-w-[20px] px-1.5 text-xs"
                >
                  {todoProposals.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="assignments"
              className="data-[state=inactive]:bg-transparent data-[state=inactive]:text-[#888888] data-[state=inactive]:border-0 data-[state=active]:bg-[#2A2A2A] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white hover:border-white hover:text-[#AAAAAA] rounded-md transition-all duration-200"
            >
              Grant History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            <Card className="rounded-lg border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Review History</CardTitle>
                <CardDescription>
                  All reviews submitted by this reviewer, sorted by most recent
                  first
                </CardDescription>
              </CardHeader>
              <CardContent>
                {actorFetching ||
                reviewsLoading ||
                reviewsFetching ||
                reviews === undefined ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
                      <Skeleton key={i} className="h-20 w-full rounded-md" />
                    ))}
                  </div>
                ) : reviews && reviews.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No reviews submitted yet
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {paginatedReviews?.map((review, index) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: no stable review key
                        <div key={index}>
                          {index > 0 && <Separator className="my-4" />}
                          <ReviewItem review={review} navigate={navigate} />
                        </div>
                      ))}
                    </div>
                    {totalReviewsPages > 1 && (
                      <div className="mt-4">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() =>
                                  setReviewsPage(Math.max(1, reviewsPage - 1))
                                }
                                className={`cursor-pointer transition-all duration-200 rounded-md ${reviewsPage === 1 ? "pointer-events-none opacity-50" : ""}`}
                              />
                            </PaginationItem>
                            {Array.from(
                              { length: Math.min(totalReviewsPages, 5) },
                              (_, i) => {
                                let page: number;
                                if (totalReviewsPages <= 5) {
                                  page = i + 1;
                                } else if (reviewsPage <= 3) {
                                  page = i + 1;
                                } else if (
                                  reviewsPage >=
                                  totalReviewsPages - 2
                                ) {
                                  page = totalReviewsPages - 4 + i;
                                } else {
                                  page = reviewsPage - 2 + i;
                                }
                                return (
                                  <PaginationItem key={page}>
                                    <PaginationLink
                                      onClick={() => setReviewsPage(page)}
                                      isActive={reviewsPage === page}
                                      className="cursor-pointer transition-all duration-200 rounded-md"
                                    >
                                      {page}
                                    </PaginationLink>
                                  </PaginationItem>
                                );
                              },
                            )}
                            <PaginationItem>
                              <PaginationNext
                                onClick={() =>
                                  setReviewsPage(
                                    Math.min(
                                      totalReviewsPages,
                                      reviewsPage + 1,
                                    ),
                                  )
                                }
                                className={`cursor-pointer transition-all duration-200 rounded-md ${reviewsPage === totalReviewsPages ? "pointer-events-none opacity-50" : ""}`}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="todos">
            <Card className="rounded-lg border-border bg-blue-50 dark:bg-blue-950/20">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <CardTitle className="text-lg">Review TODOs</CardTitle>
                </div>
                <CardDescription>
                  Proposals created during active grant periods awaiting review
                  (before initial deadline)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {actorFetching ||
                todosLoading ||
                todosFetching ||
                todoProposals === undefined ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
                      <Skeleton key={i} className="h-14 w-full rounded-md" />
                    ))}
                  </div>
                ) : todoProposals && todoProposals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending reviews at this time
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {paginatedTodo?.map((proposal) => (
                        <button
                          type="button"
                          key={proposal.proposalId.toString()}
                          onClick={() =>
                            navigate({
                              to: "/proposal/$proposalId",
                              params: {
                                proposalId: proposal.proposalId.toString(),
                              },
                            })
                          }
                          className="w-full text-left p-3 border border-border rounded-lg hover:bg-accent transition-all duration-200 bg-card"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium break-words">
                                #{proposal.proposalId.toString()} -{" "}
                                {proposal.title}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {topicIdToDisplayName(proposal.topic)} •
                                Deadline: {formatDateTime(proposal.deadline)}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    {totalTodoPages > 1 && (
                      <div className="mt-4">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() =>
                                  setTodoPage(Math.max(1, todoPage - 1))
                                }
                                className={`cursor-pointer transition-all duration-200 rounded-md ${todoPage === 1 ? "pointer-events-none opacity-50" : ""}`}
                              />
                            </PaginationItem>
                            {Array.from(
                              { length: Math.min(totalTodoPages, 5) },
                              (_, i) => {
                                let page: number;
                                if (totalTodoPages <= 5) {
                                  page = i + 1;
                                } else if (todoPage <= 3) {
                                  page = i + 1;
                                } else if (todoPage >= totalTodoPages - 2) {
                                  page = totalTodoPages - 4 + i;
                                } else {
                                  page = todoPage - 2 + i;
                                }
                                return (
                                  <PaginationItem key={page}>
                                    <PaginationLink
                                      onClick={() => setTodoPage(page)}
                                      isActive={todoPage === page}
                                      className="cursor-pointer transition-all duration-200 rounded-md"
                                    >
                                      {page}
                                    </PaginationLink>
                                  </PaginationItem>
                                );
                              },
                            )}
                            <PaginationItem>
                              <PaginationNext
                                onClick={() =>
                                  setTodoPage(
                                    Math.min(totalTodoPages, todoPage + 1),
                                  )
                                }
                                className={`cursor-pointer transition-all duration-200 rounded-md ${todoPage === totalTodoPages ? "pointer-events-none opacity-50" : ""}`}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {(missedLoading ||
              (missedProposals && missedProposals.length > 0)) && (
              <Card className="border-destructive/50 rounded-lg mt-6">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <CardTitle className="text-lg">Missed Proposals</CardTitle>
                  </div>
                  <CardDescription>
                    Proposals created during active grant periods where initial
                    deadline has passed without review
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {missedLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
                        <Skeleton key={i} className="h-14 w-full rounded-md" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {missedProposals?.map((proposal) => (
                        <button
                          type="button"
                          key={proposal.proposalId.toString()}
                          onClick={() =>
                            navigate({
                              to: "/proposal/$proposalId",
                              params: {
                                proposalId: proposal.proposalId.toString(),
                              },
                            })
                          }
                          className="w-full text-left p-3 border border-border rounded-lg hover:bg-accent transition-all duration-200"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium break-words">
                                #{proposal.proposalId.toString()} -{" "}
                                {proposal.title}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {topicIdToDisplayName(proposal.topic)} •
                                Deadline: {formatDateTime(proposal.deadline)}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="assignments">
            <Card className="rounded-lg border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <CardTitle className="text-lg">
                    Grant Assignment History
                  </CardTitle>
                </div>
                <CardDescription>
                  All past and current paid grantee assignments for specific
                  topics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {actorFetching || assignmentsLoading || assignmentsFetching ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
                      <Skeleton key={i} className="h-14 w-full rounded-md" />
                    ))}
                  </div>
                ) : reviewerDetail.allAssignments &&
                  reviewerDetail.allAssignments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No grant assignments yet
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {paginatedAssignments?.map(
                        ([topicId, assignment], index) => {
                          const startDate = new Date(
                            Number(assignment.startDate) / 1_000_000,
                          );
                          const endDate = new Date(
                            Number(assignment.endDate) / 1_000_000,
                          );
                          const isActive =
                            new Date() >= startDate && new Date() <= endDate;

                          return (
                            <div
                              key={`${topicId.toString()}-${index}`}
                              className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 p-3 border border-border rounded-lg"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium">
                                  {topicIdToDisplayName(topicId)}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {formatDateTime(assignment.startDate)} -{" "}
                                  {formatDateTime(assignment.endDate)}
                                </div>
                              </div>
                              <Badge
                                variant={isActive ? "default" : "secondary"}
                                className={`flex-shrink-0 rounded-full w-fit ${isActive ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
                              >
                                {isActive ? "Active" : "Ended"}
                              </Badge>
                            </div>
                          );
                        },
                      )}
                    </div>
                    {totalAssignmentsPages > 1 && (
                      <div className="mt-4">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() =>
                                  setAssignmentsPage(
                                    Math.max(1, assignmentsPage - 1),
                                  )
                                }
                                className={`cursor-pointer transition-all duration-200 rounded-md ${assignmentsPage === 1 ? "pointer-events-none opacity-50" : ""}`}
                              />
                            </PaginationItem>
                            {Array.from(
                              { length: Math.min(totalAssignmentsPages, 5) },
                              (_, i) => {
                                let page: number;
                                if (totalAssignmentsPages <= 5) {
                                  page = i + 1;
                                } else if (assignmentsPage <= 3) {
                                  page = i + 1;
                                } else if (
                                  assignmentsPage >=
                                  totalAssignmentsPages - 2
                                ) {
                                  page = totalAssignmentsPages - 4 + i;
                                } else {
                                  page = assignmentsPage - 2 + i;
                                }
                                return (
                                  <PaginationItem key={page}>
                                    <PaginationLink
                                      onClick={() => setAssignmentsPage(page)}
                                      isActive={assignmentsPage === page}
                                      className="cursor-pointer transition-all duration-200 rounded-md"
                                    >
                                      {page}
                                    </PaginationLink>
                                  </PaginationItem>
                                );
                              },
                            )}
                            <PaginationItem>
                              <PaginationNext
                                onClick={() =>
                                  setAssignmentsPage(
                                    Math.min(
                                      totalAssignmentsPages,
                                      assignmentsPage + 1,
                                    ),
                                  )
                                }
                                className={`cursor-pointer transition-all duration-200 rounded-md ${assignmentsPage === totalAssignmentsPages ? "pointer-events-none opacity-50" : ""}`}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ReviewItem({
  review,
  navigate,
}: {
  review: Review;
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() =>
              navigate({
                to: "/proposal/$proposalId",
                params: { proposalId: review.proposalId.toString() },
              })
            }
            className="font-medium text-foreground hover:underline text-left transition-colors duration-200"
          >
            Proposal #{review.proposalId.toString()}
          </button>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="text-xs rounded-full">
              {topicIdToDisplayName(review.topic)}
            </Badge>
            <span
              className={`recommendation-badge ${review.recommendation === Recommendation.adopt ? "recommendation-adopt" : "recommendation-reject"}`}
            >
              {review.recommendation === Recommendation.adopt
                ? "Adopt"
                : "Reject"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(review.timestamp)}
            </span>
          </div>
        </div>
        <Badge
          variant={review.status === "paid" ? "default" : "secondary"}
          className="flex-shrink-0 rounded-full w-fit flex items-center gap-1"
        >
          {review.status === "paid" ? (
            <>
              <Award className="h-3 w-3" />
              Paid Grantee
            </>
          ) : (
            <>
              <Heart className="h-3 w-3" />
              Volunteer
            </>
          )}
        </Badge>
      </div>
      <a
        href={review.link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-primary hover:underline inline-flex items-center gap-1 break-all transition-colors duration-200"
      >
        View Review <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
