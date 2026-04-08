import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronFirst,
  ChevronLast,
  ExternalLink,
  Filter,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Page } from "../App";
import { useActor } from "../hooks/useActor";
import {
  useGetAllTopics,
  useGetProposals,
  useGetReviewerPublicTable,
} from "../hooks/useQueries";
import { formatDateTime, formatDateTimeShort } from "../lib/dateUtils";
import type { Proposal } from "../lib/domainTypes";
import { topicIdToDisplayName } from "../lib/topicUtils";

interface HomePageProps {
  onNavigate: (page: Page) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const { isFetching: actorFetching } = useActor();
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<bigint | null>(
    null,
  );
  const {
    data: proposals,
    isLoading: proposalsLoading,
    isFetching: proposalsFetching,
  } = useGetProposals(selectedTopicFilter);
  const { data: allTopics } = useGetAllTopics();
  const {
    data: reviewerTableData,
    isLoading: reviewerTableLoading,
    isFetching: reviewerTableFetching,
  } = useGetReviewerPublicTable();
  const [proposalsPage, setProposalsPage] = useState(1);
  const [reviewerTablePage, setReviewerTablePage] = useState(1);
  const [showOnlyActiveGrantees, setShowOnlyActiveGrantees] = useState(false);
  const [noticeHidden, setNoticeHidden] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const itemsPerPage = 10;

  // Load notice preference from localStorage
  useEffect(() => {
    const hideNotice = localStorage.getItem("hideNoticeBox");
    if (hideNotice === "true") {
      setNoticeHidden(true);
    }
  }, []);

  const handleCloseNotice = () => {
    setNoticeHidden(true);
    if (dontShowAgain) {
      localStorage.setItem("hideNoticeBox", "true");
    }
  };

  const handleTopicFilterChange = (value: string) => {
    if (value === "all") {
      setSelectedTopicFilter(null);
    } else {
      setSelectedTopicFilter(BigInt(value));
    }
    setProposalsPage(1); // Reset to first page when filter changes
  };

  const sortedProposals = proposals
    ? [...proposals].sort((a, b) => Number(b.proposalId - a.proposalId))
    : [];

  // Pagination for proposals
  const totalProposalsPages = Math.ceil(sortedProposals.length / itemsPerPage);
  const paginatedProposals = sortedProposals.slice(
    (proposalsPage - 1) * itemsPerPage,
    proposalsPage * itemsPerPage,
  );

  // Filter and paginate reviewer table
  const filteredReviewerTable = (reviewerTableData || []).filter(
    ([_, __, type]) =>
      showOnlyActiveGrantees ? type === "Paid Grantee" : true,
  );

  const totalReviewerTablePages = Math.ceil(
    filteredReviewerTable.length / itemsPerPage,
  );
  const paginatedReviewerTable = filteredReviewerTable.slice(
    (reviewerTablePage - 1) * itemsPerPage,
    reviewerTablePage * itemsPerPage,
  );

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8">
      {!noticeHidden && (
        <div className="notice-box mb-6 relative">
          <button
            type="button"
            onClick={handleCloseNotice}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors duration-200"
            aria-label="Close notice"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="pr-8">
            <p className="text-sm leading-relaxed text-foreground mb-3">
              This hub transparently aggregates technical analysis for critical
              NNS infrastructure proposals. Our goal is to empower the community
              with expert due diligence to ensure informed voting on the
              network. We welcome reviews from both official Grantees and
              community Volunteers; volunteer contributions are a primary metric
              for future grant selections.
            </p>
            <a
              href="https://forum.dfinity.org/t/proposal-review-grants-season-3-announcement/61548/1"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1 transition-colors duration-200"
            >
              Read more about the proposal review grants
              <ExternalLink className="h-3 w-3" />
            </a>
            <div className="flex items-center gap-2 mt-3">
              <Checkbox
                id="dontShowAgain"
                checked={dontShowAgain}
                onCheckedChange={(checked) =>
                  setDontShowAgain(checked === true)
                }
                className="rounded"
              />
              <label
                htmlFor="dontShowAgain"
                className="text-xs text-muted-foreground cursor-pointer select-none"
              >
                Do not show me again
              </label>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="proposals" className="space-y-6">
        <TabsList className="bg-transparent border-0 p-0 gap-3">
          <TabsTrigger
            value="proposals"
            className="data-[state=inactive]:bg-transparent data-[state=inactive]:text-[#888888] data-[state=inactive]:border-0 data-[state=active]:bg-[#2A2A2A] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white hover:border-white hover:text-[#AAAAAA] rounded-md px-6 py-2.5 font-medium transition-all duration-200"
          >
            Proposals
          </TabsTrigger>
          <TabsTrigger
            value="reviewers"
            className="data-[state=inactive]:bg-transparent data-[state=inactive]:text-[#888888] data-[state=inactive]:border-0 data-[state=active]:bg-[#2A2A2A] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white hover:border-white hover:text-[#AAAAAA] rounded-md px-6 py-2.5 font-medium transition-all duration-200"
          >
            Reviewers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proposals" className="space-y-4">
          <Card className="bg-card border-border rounded-lg">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-foreground">Proposals</CardTitle>
                  <CardDescription>
                    View all proposals and their review status
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedTopicFilter?.toString() ?? "all"}
                    onValueChange={handleTopicFilterChange}
                  >
                    <SelectTrigger className="topic-filter-trigger w-[280px]">
                      <SelectValue placeholder="Filter by topic" />
                    </SelectTrigger>
                    <SelectContent
                      className="topic-filter-content"
                      align="end"
                      side="bottom"
                      sideOffset={4}
                    >
                      <SelectItem value="all" className="topic-filter-item">
                        All Topics
                      </SelectItem>
                      {allTopics?.map(([topicId, topicName]) => (
                        <SelectItem
                          key={topicId.toString()}
                          value={topicId.toString()}
                          className="topic-filter-item"
                        >
                          {topicName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTopicFilter !== null && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTopicFilterChange("all")}
                      className="transition-all duration-200"
                      aria-label="Clear filter"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {actorFetching ||
              proposalsLoading ||
              proposalsFetching ||
              proposals === undefined ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : sortedProposals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {selectedTopicFilter !== null
                    ? "No proposals found for this topic"
                    : "No proposals available yet"}
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="mobile-card-table border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-border hover:bg-transparent">
                            <TableHead className="w-20 min-w-[80px] text-foreground">
                              ID
                            </TableHead>
                            <TableHead className="min-w-[200px] text-foreground">
                              Title
                            </TableHead>
                            <TableHead className="w-48 min-w-[192px] text-foreground">
                              Topic
                            </TableHead>
                            <TableHead className="w-32 min-w-[128px] text-right text-foreground">
                              Reviews
                            </TableHead>
                            <TableHead className="w-48 min-w-[192px] text-foreground">
                              Recommendation
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedProposals.map((proposal, index) => (
                            <ProposalRow
                              key={proposal.proposalId.toString()}
                              proposal={proposal}
                              onNavigate={onNavigate}
                              rowIsOdd={index % 2 === 0}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Mobile Card View */}
                  <div className="mobile-card-list space-y-3">
                    {paginatedProposals.map((proposal) => (
                      <ProposalCard
                        key={proposal.proposalId.toString()}
                        proposal={proposal}
                        onNavigate={onNavigate}
                      />
                    ))}
                  </div>

                  {totalProposalsPages > 1 && (
                    <div className="mt-4">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setProposalsPage(1)}
                              disabled={proposalsPage === 1}
                              className="h-9 w-9 rounded-md cursor-pointer transition-all duration-200"
                              data-ocid="proposals.pagination_first.button"
                            >
                              <ChevronFirst className="h-4 w-4" />
                              <span className="sr-only">First page</span>
                            </Button>
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() =>
                                setProposalsPage((p) => Math.max(1, p - 1))
                              }
                              className={`cursor-pointer transition-all duration-200 ${proposalsPage === 1 ? "pointer-events-none opacity-50" : ""}`}
                            />
                          </PaginationItem>
                          {Array.from(
                            { length: Math.min(totalProposalsPages, 5) },
                            (_, i) => {
                              let page: number;
                              if (totalProposalsPages <= 5) {
                                page = i + 1;
                              } else if (proposalsPage <= 3) {
                                page = i + 1;
                              } else if (
                                proposalsPage >=
                                totalProposalsPages - 2
                              ) {
                                page = totalProposalsPages - 4 + i;
                              } else {
                                page = proposalsPage - 2 + i;
                              }
                              return (
                                <PaginationItem key={page}>
                                  <PaginationLink
                                    onClick={() => setProposalsPage(page)}
                                    isActive={proposalsPage === page}
                                    className="cursor-pointer transition-all duration-200"
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
                                setProposalsPage((p) =>
                                  Math.min(totalProposalsPages, p + 1),
                                )
                              }
                              className={`cursor-pointer transition-all duration-200 ${proposalsPage === totalProposalsPages ? "pointer-events-none opacity-50" : ""}`}
                            />
                          </PaginationItem>
                          <PaginationItem>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                setProposalsPage(totalProposalsPages)
                              }
                              disabled={proposalsPage === totalProposalsPages}
                              className="h-9 w-9 rounded-md cursor-pointer transition-all duration-200"
                              data-ocid="proposals.pagination_last.button"
                            >
                              <ChevronLast className="h-4 w-4" />
                              <span className="sr-only">Last page</span>
                            </Button>
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

        <TabsContent value="reviewers" className="space-y-4">
          <Card className="bg-card border-border rounded-lg">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-foreground">Reviewers</CardTitle>
                  <CardDescription>
                    Comprehensive list of all reviewers with their type and
                    assignments
                  </CardDescription>
                </div>
                <Button
                  variant={showOnlyActiveGrantees ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setShowOnlyActiveGrantees(!showOnlyActiveGrantees);
                    setReviewerTablePage(1);
                  }}
                  className="transition-all duration-200 flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  {showOnlyActiveGrantees ? "Show All" : "Active Grantees Only"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {actorFetching ||
              reviewerTableLoading ||
              reviewerTableFetching ||
              reviewerTableData === undefined ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredReviewerTable.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {showOnlyActiveGrantees
                    ? "No active grantees found"
                    : "No reviewers registered yet"}
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="mobile-card-table border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-border hover:bg-transparent">
                            <TableHead className="min-w-[150px] text-foreground">
                              Nickname
                            </TableHead>
                            <TableHead className="w-48 min-w-[192px] text-foreground">
                              Type
                            </TableHead>
                            <TableHead className="min-w-[200px] text-foreground">
                              Assigned Topics
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedReviewerTable.map(
                            (
                              [principal, reviewer, type, assignments],
                              index,
                            ) => {
                              const hasActiveAssignments =
                                assignments.length > 0 &&
                                assignments.some(([_, assignment]) => {
                                  const now = Date.now() * 1_000_000;
                                  return (
                                    now >= Number(assignment.startDate) &&
                                    now <= Number(assignment.endDate)
                                  );
                                });

                              return (
                                <TableRow
                                  key={principal.toString()}
                                  className={`table-row-hover border-b border-border ${index % 2 === 0 ? "table-row-odd" : "table-row-even"}`}
                                  onClick={() =>
                                    onNavigate({
                                      type: "reviewer",
                                      principal: principal.toString(),
                                    })
                                  }
                                >
                                  <TableCell className="py-5">
                                    <div
                                      className={
                                        type === "Paid Grantee"
                                          ? "font-bold text-primary"
                                          : "font-medium"
                                      }
                                    >
                                      {reviewer.nickname}
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-5">
                                    <Badge
                                      variant={
                                        type === "Paid Grantee"
                                          ? "default"
                                          : "secondary"
                                      }
                                      className="bg-muted text-foreground"
                                    >
                                      {type}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="py-5">
                                    {hasActiveAssignments ? (
                                      <div className="flex flex-wrap gap-1.5">
                                        {assignments
                                          .filter(([_, assignment]) => {
                                            const now = Date.now() * 1_000_000;
                                            return (
                                              now >=
                                                Number(assignment.startDate) &&
                                              now <= Number(assignment.endDate)
                                            );
                                          })
                                          .map(([topicId]) => (
                                            <span
                                              key={topicId.toString()}
                                              className="topic-pill"
                                            >
                                              {topicIdToDisplayName(topicId)}
                                            </span>
                                          ))}
                                      </div>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">
                                        No active grant assignments
                                      </span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            },
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Mobile Card View */}
                  <div className="mobile-card-list space-y-3">
                    {paginatedReviewerTable.map(
                      ([principal, reviewer, type, assignments]) => {
                        const hasActiveAssignments =
                          assignments.length > 0 &&
                          assignments.some(([_, assignment]) => {
                            const now = Date.now() * 1_000_000;
                            return (
                              now >= Number(assignment.startDate) &&
                              now <= Number(assignment.endDate)
                            );
                          });

                        return (
                          <button
                            type="button"
                            key={principal.toString()}
                            onClick={() =>
                              onNavigate({
                                type: "reviewer",
                                principal: principal.toString(),
                              })
                            }
                            className="w-full text-left p-4 border border-border rounded-lg hover:bg-accent transition-all duration-200 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div
                                className={
                                  type === "Paid Grantee"
                                    ? "font-bold text-primary text-lg"
                                    : "font-medium text-lg"
                                }
                              >
                                {reviewer.nickname}
                              </div>
                              <Badge
                                variant={
                                  type === "Paid Grantee"
                                    ? "default"
                                    : "secondary"
                                }
                                className="bg-muted text-foreground"
                              >
                                {type}
                              </Badge>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-muted-foreground mb-2">
                                Assigned Topics:
                              </div>
                              {hasActiveAssignments ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {assignments
                                    .filter(([_, assignment]) => {
                                      const now = Date.now() * 1_000_000;
                                      return (
                                        now >= Number(assignment.startDate) &&
                                        now <= Number(assignment.endDate)
                                      );
                                    })
                                    .map(([topicId]) => (
                                      <span
                                        key={topicId.toString()}
                                        className="topic-pill"
                                      >
                                        {topicIdToDisplayName(topicId)}
                                      </span>
                                    ))}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  No active grant assignments
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      },
                    )}
                  </div>

                  {totalReviewerTablePages > 1 && (
                    <div className="mt-4">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setReviewerTablePage(1)}
                              disabled={reviewerTablePage === 1}
                              className="h-9 w-9 rounded-md cursor-pointer transition-all duration-200"
                              data-ocid="reviewers.pagination_first.button"
                            >
                              <ChevronFirst className="h-4 w-4" />
                              <span className="sr-only">First page</span>
                            </Button>
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() =>
                                setReviewerTablePage((p) => Math.max(1, p - 1))
                              }
                              className={`cursor-pointer transition-all duration-200 ${reviewerTablePage === 1 ? "pointer-events-none opacity-50" : ""}`}
                            />
                          </PaginationItem>
                          {Array.from(
                            { length: Math.min(totalReviewerTablePages, 5) },
                            (_, i) => {
                              let page: number;
                              if (totalReviewerTablePages <= 5) {
                                page = i + 1;
                              } else if (reviewerTablePage <= 3) {
                                page = i + 1;
                              } else if (
                                reviewerTablePage >=
                                totalReviewerTablePages - 2
                              ) {
                                page = totalReviewerTablePages - 4 + i;
                              } else {
                                page = reviewerTablePage - 2 + i;
                              }
                              return (
                                <PaginationItem key={page}>
                                  <PaginationLink
                                    onClick={() => setReviewerTablePage(page)}
                                    isActive={reviewerTablePage === page}
                                    className="cursor-pointer transition-all duration-200"
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
                                setReviewerTablePage((p) =>
                                  Math.min(totalReviewerTablePages, p + 1),
                                )
                              }
                              className={`cursor-pointer transition-all duration-200 ${reviewerTablePage === totalReviewerTablePages ? "pointer-events-none opacity-50" : ""}`}
                            />
                          </PaginationItem>
                          <PaginationItem>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                setReviewerTablePage(totalReviewerTablePages)
                              }
                              disabled={
                                reviewerTablePage === totalReviewerTablePages
                              }
                              className="h-9 w-9 rounded-md cursor-pointer transition-all duration-200"
                              data-ocid="reviewers.pagination_last.button"
                            >
                              <ChevronLast className="h-4 w-4" />
                              <span className="sr-only">Last page</span>
                            </Button>
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
  );
}

interface ProposalRowProps {
  proposal: Proposal;
  onNavigate: (page: Page) => void;
  rowIsOdd: boolean;
}

function ProposalRow({ proposal, onNavigate, rowIsOdd }: ProposalRowProps) {
  const reviewCount = proposal.reviewCount ?? 0;
  const adoptCount = proposal.adoptCount ? Number(proposal.adoptCount) : 0;
  const rejectCount = proposal.rejectCount ? Number(proposal.rejectCount) : 0;

  return (
    <TooltipProvider delayDuration={300}>
      <TableRow
        className={`table-row-hover border-b border-border ${rowIsOdd ? "table-row-odd" : "table-row-even"}`}
        onClick={() =>
          onNavigate({ type: "proposal", proposalId: proposal.proposalId })
        }
      >
        <TableCell className="font-mono text-sm py-5">
          {proposal.proposalId.toString()}
        </TableCell>
        <TableCell className="font-medium py-5">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="truncate max-w-[400px]">{proposal.title}</div>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="center"
              className="max-w-md bg-[#333333] text-white shadow-lg border border-border px-4 py-3 rounded-lg"
              sideOffset={5}
            >
              <p className="text-sm">{proposal.title}</p>
            </TooltipContent>
          </Tooltip>
        </TableCell>
        <TableCell className="py-5">
          <span className="topic-pill">
            {topicIdToDisplayName(proposal.topic)}
          </span>
        </TableCell>
        <TableCell className="text-right py-5">
          <Badge variant="secondary" className="bg-muted text-foreground">
            {reviewCount}
          </Badge>
        </TableCell>
        <TableCell className="py-5">
          <div className="flex flex-wrap gap-1.5">
            {adoptCount > 0 && (
              <span className="recommendation-badge recommendation-adopt">
                {adoptCount} Adopt
              </span>
            )}
            {rejectCount > 0 && (
              <span className="recommendation-badge recommendation-reject">
                {rejectCount} Reject
              </span>
            )}
            {adoptCount === 0 && rejectCount === 0 && (
              <span className="text-xs text-muted-foreground">-</span>
            )}
          </div>
        </TableCell>
      </TableRow>
    </TooltipProvider>
  );
}

function ProposalCard({
  proposal,
  onNavigate,
}: { proposal: Proposal; onNavigate: (page: Page) => void }) {
  const reviewCount = proposal.reviewCount ?? 0;
  const adoptCount = proposal.adoptCount ? Number(proposal.adoptCount) : 0;
  const rejectCount = proposal.rejectCount ? Number(proposal.rejectCount) : 0;

  return (
    <button
      type="button"
      onClick={() =>
        onNavigate({ type: "proposal", proposalId: proposal.proposalId })
      }
      className="w-full text-left p-4 border border-border rounded-lg hover:bg-accent transition-all duration-200 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-sm font-medium">
              #{proposal.proposalId.toString()}
            </span>
            <Badge
              variant="secondary"
              className="text-xs bg-muted text-foreground"
            >
              {reviewCount} reviews
            </Badge>
          </div>
          <div className="font-medium text-foreground mb-2 break-words">
            {proposal.title}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="topic-pill w-fit">
          {topicIdToDisplayName(proposal.topic)}
        </span>
        {(adoptCount > 0 || rejectCount > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {adoptCount > 0 && (
              <span className="recommendation-badge recommendation-adopt">
                {adoptCount} Adopt
              </span>
            )}
            {rejectCount > 0 && (
              <span className="recommendation-badge recommendation-reject">
                {rejectCount} Reject
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
