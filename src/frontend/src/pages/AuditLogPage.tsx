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
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useActor } from "../hooks/useActor";
import { useGetAuditLog, useGetAuditLogSize } from "../hooks/useQueries";
import { AuditActionType } from "../lib/auditTypes";
import type { AuditLogEntry } from "../lib/auditTypes";
import { formatDateTime } from "../lib/dateUtils";

const PAGE_SIZE = 10;

function truncatePrincipal(p: string): string {
  if (p.length <= 12) return p;
  return `${p.slice(0, 9)}...`;
}

function truncateTitle(title: string, max = 40): string {
  if (title.length <= max) return title;
  return `${title.slice(0, max)}…`;
}

function truncateUrl(url: string, max = 36): string {
  if (url.length <= max) return url;
  return `${url.slice(0, max)}…`;
}

function actionLabel(type: AuditActionType): string {
  switch (type) {
    case AuditActionType.addReview:
      return "Added Review";
    case AuditActionType.removeReview:
      return "Removed Review";
    case AuditActionType.editReviewLink:
      return "Edited Link";
    case AuditActionType.fixReviewStatus:
      return "Fixed Status";
    default:
      return String(type);
  }
}

function ActionBadge({ type }: { type: AuditActionType }) {
  const baseClass =
    "text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap inline-block border";

  switch (type) {
    case AuditActionType.addReview:
      return (
        <span
          className={`${baseClass} dark:bg-green-900/50 dark:text-green-300 dark:border-green-700 bg-green-100 text-green-800 border-green-300`}
        >
          Added Review
        </span>
      );
    case AuditActionType.removeReview:
      return (
        <span
          className={`${baseClass} dark:bg-red-900/50 dark:text-red-300 dark:border-red-700 bg-red-100 text-red-800 border-red-300`}
        >
          Removed Review
        </span>
      );
    case AuditActionType.editReviewLink:
      return (
        <span
          className={`${baseClass} dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700 bg-blue-100 text-blue-800 border-blue-300`}
        >
          Edited Link
        </span>
      );
    case AuditActionType.fixReviewStatus:
      return (
        <span
          className={`${baseClass} dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600 bg-gray-100 text-gray-700 border-gray-300`}
        >
          Fixed Status
        </span>
      );
    default:
      return (
        <span
          className={`${baseClass} dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600 bg-gray-100 text-gray-700 border-gray-300`}
        >
          {actionLabel(type)}
        </span>
      );
  }
}

function UrlLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      className="text-xs underline underline-offset-2 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 break-all"
    >
      {truncateUrl(url)}
    </a>
  );
}

function DetailsCell({ entry }: { entry: AuditLogEntry }) {
  const before = entry.beforeValue;
  const after = entry.afterValue;

  if (!before && !after)
    return <span className="text-muted-foreground text-xs">—</span>;

  const isUrl = (val: string) =>
    val.startsWith("http://") || val.startsWith("https://");

  if (before && after) {
    return (
      <span className="text-xs flex flex-col gap-1">
        <span className="line-through text-muted-foreground">
          {isUrl(before) ? <UrlLink url={before} /> : before}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <ArrowRight className="h-3 w-3 shrink-0" />
        </span>
        <span>{isUrl(after) ? <UrlLink url={after} /> : after}</span>
      </span>
    );
  }

  const val = before ?? after ?? "";
  return isUrl(val) ? (
    <UrlLink url={val} />
  ) : (
    <span className="text-xs text-muted-foreground">{val}</span>
  );
}

export default function AuditLogPage() {
  const { isFetching: actorFetching } = useActor();
  const navigate = useNavigate({ from: "/audit-log" });
  const search = useSearch({ from: "/audit-log" });
  const page = search.page ?? 0;

  const setPage = (p: number) => {
    navigate({ search: (prev) => ({ ...prev, page: p > 0 ? p : undefined }) });
  };

  const { data: entries, isLoading, isError } = useGetAuditLog(page, PAGE_SIZE);
  const { data: totalSize } = useGetAuditLogSize();
  const auditNavigate = useNavigate();

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
          {actorFetching || isLoading ? (
            <div className="space-y-2 p-6">
              {[...Array(10)].map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : isError ? (
            <div
              className="text-center py-12 text-muted-foreground"
              data-ocid="audit_log.error_state"
            >
              Failed to load audit log. Check the browser console for details,
              then try refreshing the page.
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
              <div className="mobile-card-table w-full overflow-hidden">
                <Table style={{ tableLayout: "fixed", width: "100%" }}>
                  <TableHeader>
                    <TableRow className="border-b border-border hover:bg-transparent sticky top-0 z-10 dark:bg-[#141414] bg-white">
                      <TableHead
                        className="text-foreground"
                        style={{ width: "13%" }}
                      >
                        Date / Time
                      </TableHead>
                      <TableHead
                        className="text-foreground"
                        style={{ width: "12%" }}
                      >
                        Action
                      </TableHead>
                      <TableHead
                        className="text-foreground"
                        style={{ width: "18%" }}
                      >
                        Proposal
                      </TableHead>
                      <TableHead
                        className="text-foreground"
                        style={{ width: "14%" }}
                      >
                        Reviewer
                      </TableHead>
                      <TableHead
                        className="text-foreground"
                        style={{ width: "14%" }}
                      >
                        Admin
                      </TableHead>
                      <TableHead
                        className="text-foreground"
                        style={{ width: "14%" }}
                      >
                        Comment
                      </TableHead>
                      <TableHead
                        className="text-foreground"
                        style={{ width: "15%" }}
                      >
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
                        <TableCell className="text-xs text-muted-foreground align-top py-3">
                          <span className="whitespace-nowrap">
                            {formatDateTime(entry.timestamp)}
                          </span>
                        </TableCell>
                        <TableCell className="align-top py-3">
                          <ActionBadge type={entry.actionType} />
                        </TableCell>
                        <TableCell className="text-xs align-top py-3 overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              auditNavigate({
                                to: "/proposal/$proposalId",
                                params: {
                                  proposalId: entry.proposalId.toString(),
                                },
                              })
                            }
                            className="text-foreground hover:underline transition-colors text-left w-full"
                            title={entry.proposalTitle}
                          >
                            <span className="font-medium">
                              #{entry.proposalId.toString()}
                            </span>{" "}
                            <span className="text-muted-foreground truncate block">
                              {truncateTitle(entry.proposalTitle, 35)}
                            </span>
                          </button>
                        </TableCell>
                        <TableCell className="text-xs align-top py-3 overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              auditNavigate({
                                to: "/reviewer/$principal",
                                params: {
                                  principal: entry.reviewerPrincipal.toString(),
                                },
                                search: {},
                              })
                            }
                            className="text-foreground hover:underline transition-colors font-medium truncate block w-full text-left"
                          >
                            {entry.reviewerNickname}
                          </button>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground align-top py-3 overflow-hidden">
                          {" "}
                          <span
                            title={entry.adminPrincipal.toString()}
                            className="truncate block"
                          >
                            {truncatePrincipal(entry.adminPrincipal.toString())}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground align-top py-3 overflow-hidden">
                          <span
                            title={entry.comment}
                            className="line-clamp-3 block"
                          >
                            {entry.comment}
                          </span>
                        </TableCell>
                        <TableCell className="align-top py-3 overflow-hidden">
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
                      <ActionBadge type={entry.actionType} />
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(entry.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm">
                      <button
                        type="button"
                        onClick={() =>
                          auditNavigate({
                            to: "/proposal/$proposalId",
                            params: {
                              proposalId: entry.proposalId.toString(),
                            },
                          })
                        }
                        className="text-foreground hover:underline text-left"
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
                            auditNavigate({
                              to: "/reviewer/$principal",
                              params: {
                                principal: entry.reviewerPrincipal.toString(),
                              },
                              search: {},
                            })
                          }
                          className="font-medium text-foreground hover:underline"
                        >
                          {entry.reviewerNickname}
                        </button>
                      </span>
                      <span>
                        Admin:{" "}
                        <span
                          className="font-mono"
                          title={entry.adminPrincipal.toString()}
                        >
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
                  onClick={() => setPage(page - 1)}
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
                  onClick={() => setPage(page + 1)}
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
