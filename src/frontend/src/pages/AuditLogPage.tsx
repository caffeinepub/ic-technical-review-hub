import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  ArrowRight,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import type { Page } from "../App";
import { useGetAuditLog, useGetAuditLogSize } from "../hooks/useQueries";
import { AuditActionType } from "../lib/auditTypes";
import type { AuditLogEntry } from "../lib/auditTypes";
import { formatDateTime } from "../lib/dateUtils";

const PAGE_SIZE = 10;

function truncatePrincipal(p: string): string {
  if (p.length <= 15) return p;
  return `${p.slice(0, 8)}...${p.slice(-5)}`;
}

function truncateTitle(title: string, max = 40): string {
  if (title.length <= max) return title;
  return `${title.slice(0, max)}…`;
}

function actionLabel(type: AuditActionType): string {
  switch (type) {
    case AuditActionType.addReview:
      return "Added Review";
    case AuditActionType.removeReview:
      return "Removed Review";
    case AuditActionType.editReviewLink:
      return "Edited Review Link";
    case AuditActionType.fixReviewStatus:
      return "Fixed Review Status";
    default:
      return String(type);
  }
}

function actionBadgeVariant(
  type: AuditActionType,
): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case AuditActionType.addReview:
      return "default";
    case AuditActionType.removeReview:
      return "destructive";
    case AuditActionType.editReviewLink:
      return "outline";
    case AuditActionType.fixReviewStatus:
      return "secondary";
    default:
      return "outline";
  }
}

function DetailsCell({ entry }: { entry: AuditLogEntry }) {
  const before = entry.beforeValue;
  const after = entry.afterValue;

  if (!before && !after)
    return <span className="text-muted-foreground">—</span>;

  if (before && after) {
    return (
      <span className="text-xs">
        <span className="line-through text-muted-foreground">{before}</span>{" "}
        <ArrowRight className="inline h-3 w-3 mx-0.5 text-muted-foreground" />{" "}
        <span>{after}</span>
      </span>
    );
  }

  return (
    <span className="text-xs text-muted-foreground">{before ?? after}</span>
  );
}

interface AuditLogPageProps {
  onNavigate: (page: Page) => void;
}

export default function AuditLogPage({ onNavigate }: AuditLogPageProps) {
  const [page, setPage] = useState(0);

  const { data: entries, isLoading } = useGetAuditLog(page, PAGE_SIZE);
  const { data: totalSize } = useGetAuditLogSize();

  const totalPages = totalSize ? Math.ceil(Number(totalSize) / PAGE_SIZE) : 0;

  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div
      className="container mx-auto px-4 sm:px-6 py-8"
      data-ocid="audit_log.page"
    >
      {/* Notice Box */}
      <div className="notice-box flex gap-3 mb-6">
        <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="text-sm space-y-1">
          <p className="font-medium text-foreground">About the Audit Log</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            The audit log was introduced on April 3rd, 2026. Admin actions
            performed before this date are not captured in this log. All
            subsequent admin actions — adding, removing, or modifying reviews —
            are recorded here with the responsible admin principal and a
            mandatory reason.
          </p>
        </div>
      </div>

      <Card className="border-border rounded-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Audit Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[...Array(5)].map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
                <Skeleton key={i} className="h-14 w-full rounded-md" />
              ))}
            </div>
          ) : !entries || entries.length === 0 ? (
            <div
              className="text-center py-12 text-muted-foreground"
              data-ocid="audit_log.empty_state"
            >
              No audit log entries yet.
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="mobile-card-table overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableHead className="text-foreground w-40 min-w-[160px]">
                        Date / Time
                      </TableHead>
                      <TableHead className="text-foreground w-44 min-w-[160px]">
                        Action
                      </TableHead>
                      <TableHead className="text-foreground min-w-[180px]">
                        Proposal
                      </TableHead>
                      <TableHead className="text-foreground min-w-[120px]">
                        Reviewer
                      </TableHead>
                      <TableHead className="text-foreground min-w-[140px]">
                        Admin
                      </TableHead>
                      <TableHead className="text-foreground min-w-[180px]">
                        Comment
                      </TableHead>
                      <TableHead className="text-foreground min-w-[180px]">
                        Details
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry, index) => (
                      <TableRow
                        key={entry.id.toString()}
                        className={`border-b border-border ${
                          index % 2 === 0 ? "table-row-even" : "table-row-odd"
                        }`}
                        data-ocid={`audit_log.item.${index + 1}`}
                      >
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDateTime(entry.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={actionBadgeVariant(entry.actionType)}
                            className="text-xs rounded-full"
                          >
                            {actionLabel(entry.actionType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <button
                            type="button"
                            onClick={() =>
                              onNavigate({
                                type: "proposal",
                                proposalId: entry.proposalId,
                              })
                            }
                            className="text-foreground hover:underline transition-colors"
                            title={entry.proposalTitle}
                          >
                            #{entry.proposalId.toString()}{" "}
                            <span className="text-muted-foreground">
                              {truncateTitle(entry.proposalTitle)}
                            </span>
                          </button>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          <button
                            type="button"
                            onClick={() =>
                              onNavigate({
                                type: "reviewer",
                                principal: entry.reviewerPrincipal.toString(),
                              })
                            }
                            className="text-foreground hover:underline transition-colors"
                          >
                            {entry.reviewerNickname}
                          </button>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {truncatePrincipal(entry.adminPrincipal.toString())}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                          <span title={entry.comment}>{entry.comment}</span>
                        </TableCell>
                        <TableCell>
                          <DetailsCell entry={entry} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile card list */}
              <div className="mobile-card-list divide-y divide-border">
                {entries.map((entry, index) => (
                  <div
                    key={entry.id.toString()}
                    className="p-4 space-y-2"
                    data-ocid={`audit_log.item.${index + 1}`}
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <Badge
                        variant={actionBadgeVariant(entry.actionType)}
                        className="text-xs rounded-full"
                      >
                        {actionLabel(entry.actionType)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(entry.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm">
                      <button
                        type="button"
                        onClick={() =>
                          onNavigate({
                            type: "proposal",
                            proposalId: entry.proposalId,
                          })
                        }
                        className="text-foreground hover:underline"
                      >
                        #{entry.proposalId.toString()}{" "}
                        <span className="text-muted-foreground">
                          {truncateTitle(entry.proposalTitle, 50)}
                        </span>
                      </button>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                      <span>
                        Reviewer:{" "}
                        <button
                          type="button"
                          onClick={() =>
                            onNavigate({
                              type: "reviewer",
                              principal: entry.reviewerPrincipal.toString(),
                            })
                          }
                          className="font-medium text-foreground hover:underline"
                        >
                          {entry.reviewerNickname}
                        </button>
                      </span>
                      <span>
                        Admin:{" "}
                        <span className="font-mono">
                          {truncatePrincipal(entry.adminPrincipal.toString())}
                        </span>
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {entry.comment}
                    </p>
                    {(entry.beforeValue || entry.afterValue) && (
                      <div className="text-xs">
                        <DetailsCell entry={entry} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-between px-6 py-4 border-t border-border"
              data-ocid="audit_log.pagination"
            >
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(0)}
                  disabled={!canPrev}
                  className="h-8 w-8 rounded-md"
                  data-ocid="audit_log.pagination_first.button"
                >
                  <ChevronFirst className="h-4 w-4" />
                  <span className="sr-only">First page</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={!canPrev}
                  className="h-8 w-8 rounded-md"
                  data-ocid="audit_log.pagination_prev.button"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous page</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!canNext}
                  className="h-8 w-8 rounded-md"
                  data-ocid="audit_log.pagination_next.button"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next page</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(totalPages - 1)}
                  disabled={!canNext}
                  className="h-8 w-8 rounded-md"
                  data-ocid="audit_log.pagination_last.button"
                >
                  <ChevronLast className="h-4 w-4" />
                  <span className="sr-only">Last page</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
