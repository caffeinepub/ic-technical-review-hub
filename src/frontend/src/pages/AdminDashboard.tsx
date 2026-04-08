import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Principal } from "@dfinity/principal";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronFirst,
  ChevronLast,
  Copy,
  Download,
  Edit,
  Info,
  Search,
  Settings,
  Shield,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddAdmin,
  useAddOrUpdateReviewer,
  useAssignReviewerToTopic,
  useFetchIndividualProposal,
  useGetAllAdmins,
  useGetAllProposalIds,
  useGetAllReviewers,
  useGetAllTopics,
  useGetAuthorizedProposalSubmitter,
  useGetReviewer,
  useIsCallerAdmin,
  useRemoveAdmin,
  useRemoveReviewer,
  useSaveExternalProposal,
  useSaveExternalProposals,
  useSetAuthorizedProposalSubmitter,
  useUpdateReviewer,
} from "../hooks/useQueries";
import { formatDateTime, formatDateTimeShort } from "../lib/dateUtils";
import type { Proposal, Reviewer } from "../lib/domainTypes";
import { topicIdToDisplayName, topicStringToId } from "../lib/topicUtils";

interface AdminDashboardProps {
  onNavigate: (page: Page) => void;
}

interface ICProposal {
  proposal_id: string;
  title: string;
  proposal_timestamp_seconds: number;
  deadline_timestamp_seconds: number;
  topic: string;
}

interface ProposalWithStatus extends ICProposal {
  isAlreadyStored: boolean;
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();
  const [activeTab, setActiveTab] = useState("admins");

  if (adminLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-48 rounded-md" />
          <Skeleton className="h-5 w-72 rounded-md" />
          <div className="space-y-3 pt-4">
            {[...Array(5)].map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <Card className="rounded-lg">
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You need admin privileges to access this page.
            </p>
            <Button
              onClick={() => onNavigate({ type: "home" })}
              className="mt-4 rounded-md transition-all duration-200"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage admins, reviewers, paid grantee assignments, and proposals
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="bg-transparent border-0 p-0 gap-3 grid w-full grid-cols-2 sm:grid-cols-5">
          <TabsTrigger
            value="admins"
            className="data-[state=inactive]:bg-transparent data-[state=inactive]:text-[#888888] data-[state=inactive]:border-0 data-[state=active]:bg-[#2A2A2A] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white hover:border-white hover:text-[#AAAAAA] rounded-md transition-all duration-200 dark:data-[state=active]:bg-[#2A2A2A] dark:data-[state=active]:text-white dark:data-[state=active]:border-white light:data-[state=active]:bg-[#F3F4F6] light:data-[state=active]:text-[#1A1A1A] light:data-[state=active]:border-[#1A1A1A]"
          >
            Admins
          </TabsTrigger>
          <TabsTrigger
            value="reviewers"
            className="data-[state=inactive]:bg-transparent data-[state=inactive]:text-[#888888] data-[state=inactive]:border-0 data-[state=active]:bg-[#2A2A2A] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white hover:border-white hover:text-[#AAAAAA] rounded-md transition-all duration-200 dark:data-[state=active]:bg-[#2A2A2A] dark:data-[state=active]:text-white dark:data-[state=active]:border-white light:data-[state=active]:bg-[#F3F4F6] light:data-[state=active]:text-[#1A1A1A] light:data-[state=active]:border-[#1A1A1A]"
          >
            Reviewers
          </TabsTrigger>
          <TabsTrigger
            value="assignments"
            className="data-[state=inactive]:bg-transparent data-[state=inactive]:text-[#888888] data-[state=inactive]:border-0 data-[state=active]:bg-[#2A2A2A] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white hover:border-white hover:text-[#AAAAAA] rounded-md transition-all duration-200 dark:data-[state=active]:bg-[#2A2A2A] dark:data-[state=active]:text-white dark:data-[state=active]:border-white light:data-[state=active]:bg-[#F3F4F6] light:data-[state=active]:text-[#1A1A1A] light:data-[state=active]:border-[#1A1A1A]"
          >
            Grantees
          </TabsTrigger>
          <TabsTrigger
            value="proposals"
            className="data-[state=inactive]:bg-transparent data-[state=inactive]:text-[#888888] data-[state=inactive]:border-0 data-[state=active]:bg-[#2A2A2A] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white hover:border-white hover:text-[#AAAAAA] rounded-md transition-all duration-200 dark:data-[state=active]:bg-[#2A2A2A] dark:data-[state=active]:text-white dark:data-[state=active]:border-white light:data-[state=active]:bg-[#F3F4F6] light:data-[state=active]:text-[#1A1A1A] light:data-[state=active]:border-[#1A1A1A]"
          >
            Sync
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="data-[state=inactive]:bg-transparent data-[state=inactive]:text-[#888888] data-[state=inactive]:border-0 data-[state=active]:bg-[#2A2A2A] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white hover:border-white hover:text-[#AAAAAA] rounded-md transition-all duration-200 dark:data-[state=active]:bg-[#2A2A2A] dark:data-[state=active]:text-white dark:data-[state=active]:border-white light:data-[state=active]:bg-[#F3F4F6] light:data-[state=active]:text-[#1A1A1A] light:data-[state=active]:border-[#1A1A1A]"
          >
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admins">
          <AdminsTab activeTab={activeTab} />
        </TabsContent>

        <TabsContent value="reviewers">
          <ReviewersTab onNavigate={onNavigate} activeTab={activeTab} />
        </TabsContent>

        <TabsContent value="assignments">
          <AssignmentsTab activeTab={activeTab} />
        </TabsContent>

        <TabsContent value="proposals">
          <ProposalsTab activeTab={activeTab} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab activeTab={activeTab} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CopyablePrincipal({ principal }: { principal: string }) {
  const [copied, setCopied] = useState(false);
  const truncated = `${principal.slice(0, 5)}...${principal.slice(-3)}`;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleCopy}
            className="font-mono text-xs flex items-center gap-1.5 hover:text-foreground transition-colors duration-200 group"
          >
            <span>{truncated}</span>
            <Copy
              className={`h-3 w-3 transition-all duration-200 ${copied ? "text-green-500" : "opacity-0 group-hover:opacity-100"}`}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="rounded-lg bg-[#333333] text-white shadow-lg border px-4 py-3"
          sideOffset={5}
        >
          <p className="font-mono text-xs break-all max-w-xs">{principal}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SettingsTab({ activeTab }: { activeTab: string }) {
  const { data: authorizedPrincipal, isLoading } =
    useGetAuthorizedProposalSubmitter();
  const setAuthorizedPrincipal = useSetAuthorizedProposalSubmitter();
  const [principalInput, setPrincipalInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (activeTab === "settings") {
      setIsEditing(false);
      setPrincipalInput("");
    }
  }, [activeTab]);

  const handleSave = async () => {
    const trimmed = principalInput.trim();

    if (!trimmed) {
      toast.error("Please enter a principal ID");
      return;
    }

    // Client-side validation
    try {
      Principal.fromText(trimmed);
    } catch (_error) {
      toast.error("Invalid principal ID format");
      return;
    }

    try {
      const principalObj = Principal.fromText(trimmed);
      await setAuthorizedPrincipal.mutateAsync(principalObj);
      toast.success("Authorized proposal submitter saved successfully");
      setIsEditing(false);
      setPrincipalInput("");
    } catch (error: any) {
      const errorMsg =
        error.message || "Failed to save authorized proposal submitter";
      console.error("Save authorized principal error:", error);
      toast.error(errorMsg);
    }
  };

  const handleClear = async () => {
    if (
      !confirm(
        "Are you sure you want to clear the authorized proposal submitter?",
      )
    )
      return;

    try {
      await setAuthorizedPrincipal.mutateAsync(null);
      toast.success("Authorized proposal submitter cleared successfully");
      setIsEditing(false);
      setPrincipalInput("");
    } catch (error: any) {
      const errorMsg =
        error.message || "Failed to clear authorized proposal submitter";
      console.error("Clear authorized principal error:", error);
      toast.error(errorMsg);
    }
  };

  return (
    <Card className="rounded-lg border-[#1A1A1A]">
      <CardHeader className="pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Automation Settings
          </CardTitle>
          <CardDescription>
            Configure automation principals for proposal submission
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-1">
                Authorized Proposal Submitter
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Configure a principal that is authorized to submit proposals via
                automation. This principal will have the same proposal
                submission permissions as admins.
              </p>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-48 rounded-md" />
              </div>
            ) : (
              <>
                {!isEditing ? (
                  <div className="space-y-4">
                    <div className="p-4 border border-[#1A1A1A] rounded-lg">
                      {authorizedPrincipal ? (
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">
                            Current authorized principal:
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <div className="font-mono text-sm break-all">
                              {authorizedPrincipal.toString()}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(
                                    authorizedPrincipal.toString(),
                                  );
                                  toast.success("Principal copied!", {
                                    duration: 2000,
                                  });
                                } catch (_error) {
                                  toast.error("Failed to copy Principal ID");
                                }
                              }}
                              className="rounded-md transition-all duration-200 flex-shrink-0"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Not configured
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => setIsEditing(true)}
                        className="rounded-md bg-[#2A2A2A] border border-white hover:shadow-[0_0_10px_rgba(255,255,255,0.2)] transition-all duration-200"
                      >
                        {authorizedPrincipal ? "Change" : "Set"} Principal
                      </Button>
                      {authorizedPrincipal && (
                        <Button
                          onClick={handleClear}
                          variant="outline"
                          disabled={setAuthorizedPrincipal.isPending}
                          className="rounded-md transition-all duration-200"
                        >
                          {setAuthorizedPrincipal.isPending
                            ? "Clearing..."
                            : "Clear"}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="principal-input">Principal ID *</Label>
                      <Input
                        id="principal-input"
                        value={principalInput}
                        onChange={(e) => setPrincipalInput(e.target.value)}
                        placeholder="xxxxx-xxxxx-xxxxx-xxxxx-xxx"
                        className="rounded-md border-[#444444] transition-all duration-200"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the principal ID that should be authorized to
                        submit proposals
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleSave}
                        disabled={
                          setAuthorizedPrincipal.isPending ||
                          !principalInput.trim()
                        }
                        className="rounded-md bg-[#2A2A2A] border border-white hover:shadow-[0_0_10px_rgba(255,255,255,0.2)] transition-all duration-200"
                      >
                        {setAuthorizedPrincipal.isPending
                          ? "Saving..."
                          : "Save"}
                      </Button>
                      <Button
                        onClick={() => {
                          setIsEditing(false);
                          setPrincipalInput("");
                        }}
                        variant="outline"
                        disabled={setAuthorizedPrincipal.isPending}
                        className="rounded-md transition-all duration-200"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <Alert className="rounded-lg border-[#2A2A2A]">
            <Info className="h-4 w-4" />
            <AlertDescription>
              The authorized principal will be able to call the{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                saveExternalProposal
              </code>{" "}
              and{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                saveExternalProposals
              </code>{" "}
              methods to add proposals to the registry, just like admins.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminsTab({ activeTab }: { activeTab: string }) {
  const { identity } = useInternetIdentity();
  const {
    data: admins,
    isLoading: adminsLoading,
    isFetching: adminsFetching,
  } = useGetAllAdmins();
  const addAdmin = useAddAdmin();
  const removeAdmin = useRemoveAdmin();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [principal, setPrincipal] = useState("");
  const [adminsList, setAdminsList] = useState<Principal[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (activeTab === "admins") {
      setCurrentPage(1);
    }
  }, [activeTab]);

  useEffect(() => {
    if (admins && identity) {
      const currentPrincipal = identity.getPrincipal();
      const hasCurrentUser = admins.some(
        (admin) => admin.toString() === currentPrincipal.toString(),
      );

      if (hasCurrentUser) {
        setAdminsList(admins);
      } else {
        setAdminsList([currentPrincipal, ...admins]);
      }
    } else if (admins) {
      setAdminsList(admins);
    }
  }, [admins, identity]);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const principalObj = Principal.fromText(principal.trim());
      await addAdmin.mutateAsync(principalObj);
      toast.success("Admin added successfully");
      setIsAddDialogOpen(false);
      setPrincipal("");
    } catch (error: any) {
      const errorMsg = error.message || "Failed to add admin";
      console.error("Add admin error:", error);
      toast.error(errorMsg);
    }
  };

  const handleRemoveAdmin = async (principal: Principal) => {
    if (!confirm("Are you sure you want to remove this admin?")) return;

    try {
      await removeAdmin.mutateAsync(principal);
      toast.success("Admin removed successfully");
    } catch (error: any) {
      const errorMsg = error.message || "Failed to remove admin";
      console.error("Remove admin error:", error);
      toast.error(errorMsg);
    }
  };

  const totalPages = Math.ceil(adminsList.length / itemsPerPage);
  const paginatedAdmins = adminsList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <Card className="rounded-lg border-[#1A1A1A]">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Admin Management
            </CardTitle>
            <CardDescription>Manage system administrators</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-md bg-[#2A2A2A] border border-white hover:shadow-[0_0_10px_rgba(255,255,255,0.2)] transition-all duration-200 w-full sm:w-auto">
                Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-lg bg-[#181818]">
              <DialogHeader>
                <DialogTitle className="text-white">Add Admin</DialogTitle>
                <DialogDescription>
                  Add a new administrator to the system
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="principal" className="text-white">
                    Principal ID *
                  </Label>
                  <Input
                    id="principal"
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    placeholder="xxxxx-xxxxx-xxxxx-xxxxx-xxx"
                    required
                    className="rounded-md border-[#444444] text-white transition-all duration-200"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full rounded-md transition-all duration-200"
                  disabled={addAdmin.isPending}
                >
                  {addAdmin.isPending ? "Adding..." : "Add Admin"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {adminsLoading || adminsFetching || admins === undefined ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </div>
        ) : adminsList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No admins registered yet
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="mobile-card-table border border-[#1A1A1A] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#1A1A1A] hover:bg-transparent">
                      <TableHead className="min-w-[300px] text-white">
                        Principal ID
                      </TableHead>
                      <TableHead className="w-24 min-w-[96px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAdmins.map((adminPrincipal) => (
                      <AdminRow
                        key={adminPrincipal.toString()}
                        adminPrincipal={adminPrincipal}
                        onRemove={handleRemoveAdmin}
                        isRemoving={removeAdmin.isPending}
                        isCurrentUser={
                          identity
                            ? adminPrincipal.toString() ===
                              identity.getPrincipal().toString()
                            : false
                        }
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="mobile-card-list space-y-3">
              {paginatedAdmins.map((adminPrincipal) => (
                <AdminCard
                  key={adminPrincipal.toString()}
                  adminPrincipal={adminPrincipal}
                  onRemove={handleRemoveAdmin}
                  isRemoving={removeAdmin.isPending}
                  isCurrentUser={
                    identity
                      ? adminPrincipal.toString() ===
                        identity.getPrincipal().toString()
                      : false
                  }
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="h-9 w-9 rounded-md cursor-pointer transition-all duration-200"
                        data-ocid="admins.pagination_first.button"
                      >
                        <ChevronFirst className="h-4 w-4" />
                        <span className="sr-only">First page</span>
                      </Button>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        className={`cursor-pointer transition-all duration-200 rounded-md ${currentPage === 1 ? "pointer-events-none opacity-50" : ""}`}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer transition-all duration-200 rounded-md"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        className={`cursor-pointer transition-all duration-200 rounded-md ${currentPage === totalPages ? "pointer-events-none opacity-50" : ""}`}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="h-9 w-9 rounded-md cursor-pointer transition-all duration-200"
                        data-ocid="admins.pagination_last.button"
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
  );
}

function AdminRow({
  adminPrincipal,
  onRemove,
  isRemoving,
  isCurrentUser,
}: {
  adminPrincipal: Principal;
  onRemove: (principal: Principal) => void;
  isRemoving: boolean;
  isCurrentUser: boolean;
}) {
  const { data: reviewer } = useGetReviewer(adminPrincipal);
  const principalStr = adminPrincipal.toString();

  return (
    <TableRow className="border-b border-[#1A1A1A]">
      <TableCell>
        <div className="space-y-1">
          {reviewer && (
            <div className="font-medium text-foreground">
              {reviewer.nickname}
            </div>
          )}
          <div className="flex items-center gap-2">
            <CopyablePrincipal principal={principalStr} />
            {isCurrentUser && (
              <Badge variant="outline" className="text-xs rounded-md">
                You
              </Badge>
            )}
          </div>
          {reviewer?.forumProfileUrl && (
            <a
              href={reviewer.forumProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline transition-colors duration-200"
            >
              Forum Profile
            </a>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(adminPrincipal)}
          disabled={isRemoving}
          className="rounded-md transition-all duration-200"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function AdminCard({
  adminPrincipal,
  onRemove,
  isRemoving,
  isCurrentUser,
}: {
  adminPrincipal: Principal;
  onRemove: (principal: Principal) => void;
  isRemoving: boolean;
  isCurrentUser: boolean;
}) {
  const { data: reviewer } = useGetReviewer(adminPrincipal);
  const principalStr = adminPrincipal.toString();

  return (
    <div className="p-4 border border-[#1A1A1A] rounded-lg space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-1">
          {reviewer && (
            <div className="font-medium text-foreground">
              {reviewer.nickname}
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <CopyablePrincipal principal={principalStr} />
            {isCurrentUser && (
              <Badge variant="outline" className="text-xs rounded-md">
                You
              </Badge>
            )}
          </div>
          {reviewer?.forumProfileUrl && (
            <a
              href={reviewer.forumProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline transition-colors duration-200 inline-block"
            >
              Forum Profile
            </a>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(adminPrincipal)}
          disabled={isRemoving}
          className="rounded-md transition-all duration-200 flex-shrink-0"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function ReviewersTab({
  onNavigate,
  activeTab,
}: { onNavigate: (page: Page) => void; activeTab: string }) {
  const {
    data: allReviewers,
    isLoading: reviewersLoading,
    isFetching: reviewersFetching,
  } = useGetAllReviewers();
  const addReviewer = useAddOrUpdateReviewer();
  const updateReviewer = useUpdateReviewer();
  const removeReviewer = useRemoveReviewer();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingReviewer, setEditingReviewer] = useState<Reviewer | null>(null);
  const [principal, setPrincipal] = useState("");
  const [nickname, setNickname] = useState("");
  const [forumUrl, setForumUrl] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (activeTab === "reviewers") {
      setCurrentPage(1);
    }
  }, [activeTab]);

  const handleAddReviewer = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const principalObj = Principal.fromText(principal.trim());
      await addReviewer.mutateAsync({
        principal: principalObj,
        nickname: nickname.trim(),
        forumProfileUrl: forumUrl.trim(),
      });
      toast.success("Reviewer added successfully");
      setIsAddDialogOpen(false);
      setPrincipal("");
      setNickname("");
      setForumUrl("");
    } catch (error: any) {
      const errorMsg = error.message || "Failed to add reviewer";
      console.error("Add reviewer error:", error);
      toast.error(errorMsg);
    }
  };

  const handleEditReviewer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReviewer) return;

    try {
      const principalObj = Principal.fromText(principal.trim());
      await updateReviewer.mutateAsync({
        principal: principalObj,
        nickname: nickname.trim(),
        forumProfileUrl: forumUrl.trim(),
      });
      toast.success("Reviewer updated successfully");
      setIsEditDialogOpen(false);
      setEditingReviewer(null);
      setPrincipal("");
      setNickname("");
      setForumUrl("");
    } catch (error: any) {
      const errorMsg = error.message || "Failed to update reviewer";
      console.error("Update reviewer error:", error);
      toast.error(errorMsg);
    }
  };

  const openEditDialog = (reviewer: Reviewer) => {
    setEditingReviewer(reviewer);
    setPrincipal(reviewer.principal.toString());
    setNickname(reviewer.nickname);
    setForumUrl(reviewer.forumProfileUrl);
    setIsEditDialogOpen(true);
  };

  const handleRemoveReviewer = async (principal: Principal) => {
    if (!confirm("Are you sure you want to remove this reviewer?")) return;

    try {
      await removeReviewer.mutateAsync(principal);
      toast.success("Reviewer removed successfully");
    } catch (error: any) {
      const errorMsg = error.message || "Failed to remove reviewer";
      console.error("Remove reviewer error:", error);
      toast.error(errorMsg);
    }
  };

  const reviewers = allReviewers?.map((r) => r.reviewer) || [];
  const totalPages = Math.ceil(reviewers.length / itemsPerPage);
  const paginatedReviewers = reviewers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <Card className="rounded-lg border-[#1A1A1A]">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Reviewer Whitelist
            </CardTitle>
            <CardDescription>
              Manage whitelisted technical reviewers (both paid grantees and
              volunteers)
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-md bg-[#2A2A2A] border border-white hover:shadow-[0_0_10px_rgba(255,255,255,0.2)] transition-all duration-200 w-full sm:w-auto">
                Add Reviewer
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-lg bg-[#181818]">
              <DialogHeader>
                <DialogTitle className="text-white">Add Reviewer</DialogTitle>
                <DialogDescription>
                  Add a new reviewer to the whitelist
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddReviewer} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="principal" className="text-white">
                    Principal ID *
                  </Label>
                  <Input
                    id="principal"
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    placeholder="xxxxx-xxxxx-xxxxx-xxxxx-xxx"
                    required
                    className="rounded-md border-[#444444] text-white transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nickname" className="text-white">
                    Nickname *
                  </Label>
                  <Input
                    id="nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Enter nickname"
                    required
                    className="rounded-md border-[#444444] text-white transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="forumUrl" className="text-white">
                    Forum Profile URL
                  </Label>
                  <Input
                    id="forumUrl"
                    type="url"
                    value={forumUrl}
                    onChange={(e) => setForumUrl(e.target.value)}
                    placeholder="https://forum.dfinity.org/u/username"
                    className="rounded-md border-[#444444] text-white transition-all duration-200"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full rounded-md transition-all duration-200"
                  disabled={addReviewer.isPending}
                >
                  {addReviewer.isPending ? "Adding..." : "Add Reviewer"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {reviewersLoading || reviewersFetching || allReviewers === undefined ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </div>
        ) : reviewers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No reviewers added yet
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="mobile-card-table border border-[#1A1A1A] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#1A1A1A] hover:bg-transparent">
                      <TableHead className="w-32 min-w-[128px] text-white">
                        Nickname
                      </TableHead>
                      <TableHead className="min-w-[200px] text-white">
                        Principal
                      </TableHead>
                      <TableHead className="w-24 min-w-[96px] text-white">
                        Forum
                      </TableHead>
                      <TableHead className="w-32 min-w-[128px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReviewers.map((reviewer) => {
                      const principalStr = reviewer.principal.toString();

                      return (
                        <TableRow
                          key={reviewer.principal.toString()}
                          className="border-b border-[#1A1A1A]"
                        >
                          <TableCell className="font-medium">
                            <button
                              type="button"
                              onClick={() =>
                                onNavigate({
                                  type: "reviewer",
                                  principal: reviewer.principal.toString(),
                                })
                              }
                              className="hover:underline truncate max-w-[120px] block transition-colors duration-200"
                            >
                              {reviewer.nickname}
                            </button>
                          </TableCell>
                          <TableCell>
                            <CopyablePrincipal principal={principalStr} />
                          </TableCell>
                          <TableCell>
                            {reviewer.forumProfileUrl ? (
                              <a
                                href={reviewer.forumProfileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline text-sm transition-colors duration-200"
                              >
                                View
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(reviewer)}
                                className="rounded-md transition-all duration-200"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleRemoveReviewer(reviewer.principal)
                                }
                                disabled={removeReviewer.isPending}
                                className="rounded-md transition-all duration-200"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="mobile-card-list space-y-3">
              {paginatedReviewers.map((reviewer) => {
                const principalStr = reviewer.principal.toString();

                return (
                  <div
                    key={reviewer.principal.toString()}
                    className="p-4 border border-[#1A1A1A] rounded-lg space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 space-y-1">
                        <button
                          type="button"
                          onClick={() =>
                            onNavigate({
                              type: "reviewer",
                              principal: reviewer.principal.toString(),
                            })
                          }
                          className="font-medium hover:underline transition-colors duration-200 text-left"
                        >
                          {reviewer.nickname}
                        </button>
                        <CopyablePrincipal principal={principalStr} />
                        {reviewer.forumProfileUrl && (
                          <a
                            href={reviewer.forumProfileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline transition-colors duration-200 inline-block"
                          >
                            Forum Profile
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(reviewer)}
                          className="rounded-md transition-all duration-200"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleRemoveReviewer(reviewer.principal)
                          }
                          disabled={removeReviewer.isPending}
                          className="rounded-md transition-all duration-200"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
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
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        className={`cursor-pointer transition-all duration-200 rounded-md ${currentPage === 1 ? "pointer-events-none opacity-50" : ""}`}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer transition-all duration-200 rounded-md"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        className={`cursor-pointer transition-all duration-200 rounded-md ${currentPage === totalPages ? "pointer-events-none opacity-50" : ""}`}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
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

      {/* Edit Reviewer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-lg bg-[#181818]">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Reviewer</DialogTitle>
            <DialogDescription>Update reviewer information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditReviewer} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-principal" className="text-white">
                Principal ID *
              </Label>
              <Input
                id="edit-principal"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                placeholder="xxxxx-xxxxx-xxxxx-xxxxx-xxx"
                required
                className="rounded-md border-[#444444] text-white transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nickname" className="text-white">
                Nickname *
              </Label>
              <Input
                id="edit-nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter nickname"
                required
                className="rounded-md border-[#444444] text-white transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-forumUrl" className="text-white">
                Forum Profile URL
              </Label>
              <Input
                id="edit-forumUrl"
                type="url"
                value={forumUrl}
                onChange={(e) => setForumUrl(e.target.value)}
                placeholder="https://forum.dfinity.org/u/username"
                className="rounded-md border-[#444444] text-white transition-all duration-200"
              />
            </div>
            <Button
              type="submit"
              className="w-full rounded-md transition-all duration-200"
              disabled={updateReviewer.isPending}
            >
              {updateReviewer.isPending ? "Updating..." : "Update Reviewer"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function AssignmentsTab({ activeTab }: { activeTab: string }) {
  const {
    data: allReviewers,
    isLoading: reviewersLoading,
    isFetching: reviewersFetching,
  } = useGetAllReviewers();
  const { data: allTopics } = useGetAllTopics();
  const assignReviewer = useAssignReviewerToTopic();
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedReviewer, setSelectedReviewer] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (activeTab === "assignments") {
      setCurrentPage(1);
    }
  }, [activeTab]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!endDateTime) {
      toast.error("End date and time is required for paid grantee assignments");
      return;
    }

    try {
      const reviewerPrincipal = Principal.fromText(selectedReviewer);
      const topicId = BigInt(selectedTopic);
      const startTimestamp = BigInt(
        new Date(startDateTime).getTime() * 1_000_000,
      );
      const endTimestamp = BigInt(new Date(endDateTime).getTime() * 1_000_000);

      await assignReviewer.mutateAsync({
        reviewer: reviewerPrincipal,
        topic: topicId,
        startDate: startTimestamp,
        endDate: endTimestamp,
      });

      toast.success("Paid grantee assignment created successfully");
      setIsAssignDialogOpen(false);
      setSelectedReviewer("");
      setSelectedTopic("");
      setStartDateTime("");
      setEndDateTime("");
    } catch (error: any) {
      const errorMsg = error.message || "Failed to create assignment";
      console.error("Assignment error:", error);
      toast.error(errorMsg);
    }
  };

  // Filter reviewers with assignments
  const reviewersWithAssignments =
    allReviewers?.filter((r) => r.assignments.length > 0) || [];
  const totalPages = Math.ceil(reviewersWithAssignments.length / itemsPerPage);
  const paginatedAssignments = reviewersWithAssignments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <Card className="rounded-lg border-[#1A1A1A]">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Paid Grantee Assignments
            </CardTitle>
            <CardDescription>
              Assign reviewers as paid grantees for specific topics with start
              and end dates. Reviews submitted within these periods will be
              marked as paid.
            </CardDescription>
          </div>
          <Dialog
            open={isAssignDialogOpen}
            onOpenChange={setIsAssignDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="rounded-md bg-[#2A2A2A] border border-white hover:shadow-[0_0_10px_rgba(255,255,255,0.2)] transition-all duration-200 w-full sm:w-auto">
                Create Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-lg bg-[#181818]">
              <DialogHeader>
                <DialogTitle className="text-white">
                  Create Assignment
                </DialogTitle>
                <DialogDescription>
                  Assign a reviewer to a topic as a paid grantee
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAssign} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reviewer" className="text-white">
                    Reviewer *
                  </Label>
                  <Select
                    value={selectedReviewer}
                    onValueChange={setSelectedReviewer}
                    required
                  >
                    <SelectTrigger className="rounded-md border-[#444444] text-white transition-all duration-200">
                      <SelectValue placeholder="Select reviewer" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg bg-[#181818]">
                      {allReviewers?.map(({ reviewer }) => (
                        <SelectItem
                          key={reviewer.principal.toString()}
                          value={reviewer.principal.toString()}
                        >
                          {reviewer.nickname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topic" className="text-white">
                    Topic *
                  </Label>
                  <Select
                    value={selectedTopic}
                    onValueChange={setSelectedTopic}
                    required
                  >
                    <SelectTrigger className="rounded-md border-[#444444] text-white transition-all duration-200">
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg bg-[#181818]">
                      {allTopics?.map(([topicId, displayName]) => (
                        <SelectItem
                          key={topicId.toString()}
                          value={topicId.toString()}
                        >
                          {displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDateTime" className="text-white">
                    Start Date & Time *
                  </Label>
                  <Input
                    id="startDateTime"
                    type="datetime-local"
                    value={startDateTime}
                    onChange={(e) => setStartDateTime(e.target.value)}
                    required
                    className="rounded-md border-[#444444] text-white transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDateTime" className="text-white">
                    End Date & Time *
                  </Label>
                  <Input
                    id="endDateTime"
                    type="datetime-local"
                    value={endDateTime}
                    onChange={(e) => setEndDateTime(e.target.value)}
                    required
                    className="rounded-md border-[#444444] text-white transition-all duration-200"
                  />
                  <p className="text-xs text-muted-foreground">
                    End date and time is required for paid grantee assignments
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full rounded-md transition-all duration-200"
                  disabled={assignReviewer.isPending}
                >
                  {assignReviewer.isPending
                    ? "Creating..."
                    : "Create Assignment"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {reviewersLoading || reviewersFetching || allReviewers === undefined ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </div>
        ) : reviewersWithAssignments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No paid grantee assignments created yet
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {paginatedAssignments.map(({ reviewer, assignments }) => (
                <div
                  key={reviewer.principal.toString()}
                  className="border border-[#1A1A1A] rounded-lg p-4"
                >
                  <div className="font-medium mb-3">{reviewer.nickname}</div>
                  <div className="space-y-2">
                    {assignments.map(([topicId, assignment], index) => {
                      const isActive =
                        new Date() >=
                          new Date(Number(assignment.startDate) / 1_000_000) &&
                        new Date() <=
                          new Date(Number(assignment.endDate) / 1_000_000);

                      return (
                        <div
                          key={`${topicId.toString()}-${index}`}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm p-3 bg-muted rounded-md"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="font-medium block">
                              {topicIdToDisplayName(topicId)}
                            </span>
                            <span className="text-muted-foreground text-xs block mt-1">
                              {formatDateTimeShort(assignment.startDate)} -{" "}
                              {formatDateTimeShort(assignment.endDate)}
                            </span>
                          </div>
                          <Badge
                            variant={isActive ? "default" : "secondary"}
                            className="flex-shrink-0 rounded-md w-fit"
                          >
                            {isActive ? "Active" : "Ended"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="h-9 w-9 rounded-md cursor-pointer transition-all duration-200"
                        data-ocid="assignments.pagination_first.button"
                      >
                        <ChevronFirst className="h-4 w-4" />
                        <span className="sr-only">First page</span>
                      </Button>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        className={`cursor-pointer transition-all duration-200 rounded-md ${currentPage === 1 ? "pointer-events-none opacity-50" : ""}`}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer transition-all duration-200 rounded-md"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        className={`cursor-pointer transition-all duration-200 rounded-md ${currentPage === totalPages ? "pointer-events-none opacity-50" : ""}`}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="h-9 w-9 rounded-md cursor-pointer transition-all duration-200"
                        data-ocid="assignments.pagination_last.button"
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
  );
}

function ProposalsTab({ activeTab }: { activeTab: string }) {
  const {
    data: existingProposalIds,
    isLoading: loadingIds,
    isFetched: idsFetched,
  } = useGetAllProposalIds();
  const [allProposals, setAllProposals] = useState<ProposalWithStatus[]>([]);
  const [selectedProposals, setSelectedProposals] = useState<Set<string>>(
    new Set(),
  );
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveProposals = useSaveExternalProposals();
  const saveProposal = useSaveExternalProposal();
  const fetchIndividual = useFetchIndividualProposal();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Individual proposal fetch state
  const [proposalIdInput, setProposalIdInput] = useState("");
  const [fetchedIndividualProposal, setFetchedIndividualProposal] =
    useState<ProposalWithStatus | null>(null);
  const [isFetchingIndividual, setIsFetchingIndividual] = useState(false);

  useEffect(() => {
    if (activeTab === "proposals") {
      setCurrentPage(1);
    }
  }, [activeTab]);

  const fetchProposals = async () => {
    // Wait for existing proposal IDs to be loaded
    if (loadingIds || !idsFetched) {
      toast.info("Loading existing proposals from backend...");
      return;
    }

    setIsFetching(true);
    setError(null);
    setAllProposals([]);
    setSelectedProposals(new Set());

    try {
      const url =
        "https://ic-api.internetcomputer.org/api/v3/proposals?format=json&limit=100&include_status=OPEN&include_topic=TOPIC_APPLICATION_CANISTER_MANAGEMENT&include_topic=TOPIC_IC_OS_VERSION_ELECTION&include_topic=TOPIC_PROTOCOL_CANISTER_MANAGEMENT";
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Network error: ${response.status} ${response.statusText}`,
        );
      }

      const jsonData = await response.json();

      let proposals: ICProposal[] = [];
      if (jsonData && typeof jsonData === "object") {
        if (Array.isArray(jsonData.data)) {
          proposals = jsonData.data;
        } else if (Array.isArray(jsonData)) {
          proposals = jsonData;
        }
      }

      if (proposals.length === 0) {
        setError("No open proposals found matching the selected topics.");
        toast.info("No open proposals found");
        setIsFetching(false);
        return;
      }

      // Convert backend proposal IDs (bigint) to strings for comparison
      const existingIds = new Set(
        existingProposalIds?.map((id) => id.toString()) || [],
      );

      // Mark each proposal as already stored or new based on ID comparison
      const proposalsWithStatus: ProposalWithStatus[] = proposals.map((p) => {
        // Ensure proposal_id is converted to string for comparison
        const proposalIdStr = String(p.proposal_id);
        return {
          ...p,
          proposal_id: proposalIdStr,
          isAlreadyStored: existingIds.has(proposalIdStr),
        };
      });

      setIsFetching(false);

      // Count new vs already stored proposals
      const newProposalsCount = proposalsWithStatus.filter(
        (p) => !p.isAlreadyStored,
      ).length;
      const storedProposalsCount = proposalsWithStatus.filter(
        (p) => p.isAlreadyStored,
      ).length;

      if (newProposalsCount === 0) {
        toast.info(
          `No new open proposals for these topics. All ${storedProposalsCount} fetched proposal${storedProposalsCount !== 1 ? "s" : ""} already exist in the registry.`,
        );
      } else {
        toast.success(
          `Found ${newProposalsCount} new proposal${newProposalsCount !== 1 ? "s" : ""} to add${storedProposalsCount > 0 ? ` (${storedProposalsCount} already stored)` : ""}`,
        );
      }

      setAllProposals(proposalsWithStatus);
    } catch (error: any) {
      const errorMessage =
        error.message || "Failed to fetch proposals from IC API";
      setError(errorMessage);
      console.error("Fetch proposals error:", error);
      toast.error(errorMessage);
      setIsFetching(false);
    }
  };

  const fetchIndividualProposal = async () => {
    const trimmedId = proposalIdInput.trim();

    if (!trimmedId) {
      toast.error("Please enter a proposal ID");
      return;
    }

    // Validate numeric ID
    if (!/^\d+$/.test(trimmedId)) {
      toast.error("Proposal ID must be a valid number");
      return;
    }

    if (loadingIds || !idsFetched) {
      toast.info("Loading existing proposals from backend...");
      return;
    }

    setIsFetchingIndividual(true);
    setFetchedIndividualProposal(null);

    try {
      const proposalIdBigInt = BigInt(trimmedId);
      const jsonResponse = await fetchIndividual.mutateAsync(proposalIdBigInt);

      // Parse the response
      const proposal: ICProposal = {
        proposal_id: jsonResponse.proposal_id?.toString() || trimmedId,
        title: jsonResponse.title || "Untitled Proposal",
        proposal_timestamp_seconds:
          jsonResponse.proposal_timestamp_seconds || 0,
        deadline_timestamp_seconds:
          jsonResponse.deadline_timestamp_seconds || 0,
        topic: jsonResponse.topic || "",
      };

      // Validate topic
      const topicId = topicStringToId(proposal.topic);
      if (topicId === null) {
        toast.error(
          `This proposal's topic (${proposal.topic}) is not supported by this application. Only IC OS Version Election, Protocol Canister Management, and Application Canister Management proposals can be added.`,
        );
        setIsFetchingIndividual(false);
        return;
      }

      // Check if already stored
      const existingIds = new Set(
        existingProposalIds?.map((id) => id.toString()) || [],
      );
      const isAlreadyStored = existingIds.has(proposal.proposal_id);

      const proposalWithStatus: ProposalWithStatus = {
        ...proposal,
        isAlreadyStored,
      };

      setFetchedIndividualProposal(proposalWithStatus);
      setIsFetchingIndividual(false);

      if (isAlreadyStored) {
        toast.info(
          `Proposal #${proposal.proposal_id} already exists in the registry`,
        );
      } else {
        toast.success(`Proposal #${proposal.proposal_id} fetched successfully`);
      }
    } catch (error: any) {
      const errorMessage = error.message || "Failed to fetch proposal";
      console.error("Fetch individual proposal error:", error);

      if (errorMessage.includes("404") || errorMessage.includes("not found")) {
        toast.error(`Proposal #${trimmedId} not found`);
      } else {
        toast.error(errorMessage);
      }

      setIsFetchingIndividual(false);
    }
  };

  const saveIndividualProposal = async () => {
    if (!fetchedIndividualProposal) return;

    try {
      const topicId = topicStringToId(fetchedIndividualProposal.topic);
      if (topicId === null) {
        toast.error("Invalid topic for this proposal");
        return;
      }

      const proposalToSave: Proposal = {
        proposalId: BigInt(fetchedIndividualProposal.proposal_id),
        title: fetchedIndividualProposal.title,
        timestamp:
          BigInt(fetchedIndividualProposal.proposal_timestamp_seconds) *
          BigInt(1_000_000_000),
        deadline:
          BigInt(fetchedIndividualProposal.deadline_timestamp_seconds) *
          BigInt(1_000_000_000),
        creationDate:
          BigInt(fetchedIndividualProposal.proposal_timestamp_seconds) *
          BigInt(1_000_000_000),
        deadlineDate:
          BigInt(fetchedIndividualProposal.deadline_timestamp_seconds) *
          BigInt(1_000_000_000),
        topic: topicId,
      };

      await saveProposal.mutateAsync(proposalToSave);

      toast.success(
        `Proposal #${fetchedIndividualProposal.proposal_id} saved successfully`,
      );
      setFetchedIndividualProposal({
        ...fetchedIndividualProposal,
        isAlreadyStored: true,
      });
      setProposalIdInput("");
    } catch (error: any) {
      const errorMsg = error.message || "Failed to save proposal";
      console.error("Save individual proposal error:", error);
      toast.error(errorMsg);
    }
  };

  const toggleProposal = (id: string, isAlreadyStored: boolean) => {
    // Don't allow toggling already stored proposals
    if (isAlreadyStored) return;

    const newSelected = new Set(selectedProposals);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProposals(newSelected);
  };

  const toggleAll = () => {
    // Only toggle new proposals (not already stored)
    const newProposals = allProposals.filter((p) => !p.isAlreadyStored);
    const newProposalIds = newProposals.map((p) => p.proposal_id);

    if (
      selectedProposals.size === newProposalIds.length &&
      newProposalIds.length > 0
    ) {
      setSelectedProposals(new Set());
    } else {
      setSelectedProposals(new Set(newProposalIds));
    }
  };

  const saveSelected = async () => {
    const selected = allProposals.filter(
      (p) => selectedProposals.has(p.proposal_id) && !p.isAlreadyStored,
    );

    if (selected.length === 0) {
      toast.error("No new proposals selected");
      return;
    }

    try {
      const proposalsToSave: Proposal[] = [];
      const invalidProposals: string[] = [];

      for (const proposal of selected) {
        const topicId = topicStringToId(proposal.topic);

        if (topicId === null) {
          console.error(`Unknown topic: ${proposal.topic}`);
          invalidProposals.push(`#${proposal.proposal_id} (unknown topic)`);
          continue;
        }

        proposalsToSave.push({
          proposalId: BigInt(proposal.proposal_id),
          title: proposal.title,
          timestamp:
            BigInt(proposal.proposal_timestamp_seconds) * BigInt(1_000_000_000),
          deadline:
            BigInt(proposal.deadline_timestamp_seconds) * BigInt(1_000_000_000),
          creationDate:
            BigInt(proposal.proposal_timestamp_seconds) * BigInt(1_000_000_000),
          deadlineDate:
            BigInt(proposal.deadline_timestamp_seconds) * BigInt(1_000_000_000),
          topic: topicId,
        });
      }

      if (invalidProposals.length > 0) {
        toast.error(
          `Invalid proposals skipped: ${invalidProposals.join(", ")}`,
        );
      }

      if (proposalsToSave.length === 0) {
        toast.error("No valid proposals to save");
        return;
      }

      const savedIds = await saveProposals.mutateAsync(proposalsToSave);

      if (savedIds.length > 0) {
        toast.success(
          `Successfully saved ${savedIds.length} proposal${savedIds.length !== 1 ? "s" : ""} to registry`,
        );

        // Mark saved proposals as already stored
        const savedIdStrings = new Set(savedIds.map((id) => id.toString()));
        setAllProposals((prev) =>
          prev.map((p) =>
            savedIdStrings.has(p.proposal_id)
              ? { ...p, isAlreadyStored: true }
              : p,
          ),
        );
        setSelectedProposals(new Set());
      } else {
        toast.info("All selected proposals already exist in the registry");
      }
    } catch (error: any) {
      const errorMsg = error.message || "Failed to save proposals";
      console.error("Save proposals error:", error);

      if (errorMsg.includes("Unauthorized")) {
        toast.error("Unauthorized: Only admins can sync proposals");
      } else if (errorMsg.includes("already exists")) {
        toast.info("Some proposals already exist in the registry");
      } else {
        toast.error(errorMsg);
      }
    }
  };

  const totalPages = Math.ceil(allProposals.length / itemsPerPage);
  const paginatedProposals = allProposals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const hasProposals = allProposals.length > 0;
  const newProposalsCount = allProposals.filter(
    (p) => !p.isAlreadyStored,
  ).length;
  const storedProposalsCount = allProposals.filter(
    (p) => p.isAlreadyStored,
  ).length;
  const hasSelectedProposals = selectedProposals.size > 0;
  const canFetch = !isFetching && !loadingIds && idsFetched;
  const isProcessing = isFetching || loadingIds;

  return (
    <div className="space-y-6">
      {/* Individual Proposal Fetch Section */}
      <Card className="rounded-lg border-[#1A1A1A]">
        <CardHeader className="pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Fetch Individual Proposal
            </CardTitle>
            <CardDescription>
              Enter a specific proposal ID to fetch and add it to the registry
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Enter proposal ID (e.g., 140009)"
                  value={proposalIdInput}
                  onChange={(e) => setProposalIdInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      fetchIndividualProposal();
                    }
                  }}
                  disabled={isFetchingIndividual || loadingIds}
                  className="rounded-md border-[#444444] transition-all duration-200"
                />
              </div>
              <Button
                onClick={fetchIndividualProposal}
                disabled={
                  isFetchingIndividual || loadingIds || !proposalIdInput.trim()
                }
                className="rounded-md bg-[#2A2A2A] border border-white hover:shadow-[0_0_10px_rgba(255,255,255,0.2)] transition-all duration-200"
              >
                {isFetchingIndividual ? "Fetching..." : "Fetch Proposal"}
              </Button>
            </div>

            {fetchedIndividualProposal && (
              <div className="border border-[#1A1A1A] rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-medium">
                        #{fetchedIndividualProposal.proposal_id}
                      </span>
                      <Badge variant="outline" className="text-xs rounded-md">
                        {topicStringToId(fetchedIndividualProposal.topic) !==
                        null
                          ? topicIdToDisplayName(
                              topicStringToId(fetchedIndividualProposal.topic)!,
                            )
                          : "Unknown Topic"}
                      </Badge>
                      {fetchedIndividualProposal.isAlreadyStored && (
                        <Badge
                          variant="secondary"
                          className="text-xs rounded-md flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Already Stored
                        </Badge>
                      )}
                    </div>
                    <div className="font-medium text-foreground break-words">
                      {fetchedIndividualProposal.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created:{" "}
                      {new Date(
                        fetchedIndividualProposal.proposal_timestamp_seconds *
                          1000,
                      ).toLocaleString("en-US", {
                        year: "2-digit",
                        month: "numeric",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </div>
                  </div>
                  {!fetchedIndividualProposal.isAlreadyStored && (
                    <Button
                      onClick={saveIndividualProposal}
                      disabled={saveProposal.isPending}
                      className="rounded-md bg-[#2A2A2A] border border-white hover:shadow-[0_0_10px_rgba(255,255,255,0.2)] transition-all duration-200 flex-shrink-0"
                    >
                      {saveProposal.isPending
                        ? "Saving..."
                        : "Save to Registry"}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Proposal Sync Section */}
      <Card className="rounded-lg border-[#1A1A1A]">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Bulk Sync Open Proposals
              </CardTitle>
              <CardDescription>
                Fetch and import multiple open proposals from the IC API
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                onClick={fetchProposals}
                disabled={!canFetch}
                className="rounded-md bg-[#2A2A2A] border border-white hover:shadow-[0_0_10px_rgba(255,255,255,0.2)] transition-all duration-200"
              >
                {isFetching
                  ? "Fetching..."
                  : loadingIds
                    ? "Loading..."
                    : "Fetch Proposals"}
              </Button>
              {hasProposals && hasSelectedProposals && (
                <Button
                  onClick={saveSelected}
                  disabled={saveProposals.isPending}
                  className="rounded-md bg-[#2A2A2A] border border-white hover:shadow-[0_0_10px_rgba(255,255,255,0.2)] transition-all duration-200"
                >
                  {saveProposals.isPending
                    ? "Saving..."
                    : `Save ${selectedProposals.size} to Registry`}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isProcessing ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
              <p className="text-muted-foreground">
                {isFetching
                  ? "Fetching proposals from IC API..."
                  : "Loading existing proposals from backend..."}
              </p>
            </div>
          ) : !hasProposals && !error ? (
            <div className="text-center py-8 text-muted-foreground">
              Click "Fetch Proposals" to load proposals from the IC API
            </div>
          ) : hasProposals ? (
            <>
              {storedProposalsCount > 0 && (
                <Alert className="mb-4 rounded-lg border-[#2A2A2A]">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {newProposalsCount === 0
                      ? `No new open proposals for these topics. All ${allProposals.length} fetched proposal${allProposals.length !== 1 ? "s" : ""} already exist in the registry and are shown below with a dimmed appearance.`
                      : `${storedProposalsCount} of ${allProposals.length} proposal${allProposals.length !== 1 ? "s" : ""} already exist in the registry and are shown with a dimmed appearance.`}
                  </AlertDescription>
                </Alert>
              )}

              {/* Desktop Table View */}
              <div className="mobile-card-table border border-[#1A1A1A] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-[#1A1A1A] hover:bg-transparent">
                        <TableHead className="w-12 min-w-[48px]">
                          <Checkbox
                            checked={
                              selectedProposals.size === newProposalsCount &&
                              newProposalsCount > 0
                            }
                            onCheckedChange={toggleAll}
                            disabled={newProposalsCount === 0}
                            className="rounded"
                          />
                        </TableHead>
                        <TableHead className="w-20 min-w-[80px] text-white">
                          ID
                        </TableHead>
                        <TableHead className="min-w-[200px] max-w-[400px] text-white">
                          Title
                        </TableHead>
                        <TableHead className="w-48 min-w-[192px] text-white">
                          Topic
                        </TableHead>
                        <TableHead className="w-32 min-w-[128px] text-white">
                          Created
                        </TableHead>
                        <TableHead className="w-24 min-w-[96px] text-white">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProposals.map((proposal) => {
                        const topicId = topicStringToId(proposal.topic);
                        const displayName =
                          topicId !== null
                            ? topicIdToDisplayName(topicId)
                            : "Unknown Topic";
                        const isDisabled = proposal.isAlreadyStored;

                        return (
                          <TooltipProvider
                            key={proposal.proposal_id}
                            delayDuration={300}
                          >
                            <TableRow
                              className={`border-b border-[#1A1A1A] ${isDisabled ? "proposal-row-stored" : ""}`}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={selectedProposals.has(
                                    proposal.proposal_id,
                                  )}
                                  onCheckedChange={() =>
                                    toggleProposal(
                                      proposal.proposal_id,
                                      isDisabled,
                                    )
                                  }
                                  disabled={isDisabled}
                                  className="rounded"
                                />
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {proposal.proposal_id}
                              </TableCell>
                              <TableCell className="font-medium">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="truncate max-w-[400px]">
                                      {proposal.title}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    align="center"
                                    className="max-w-md rounded-lg bg-[#333333] text-white shadow-lg border px-4 py-3"
                                    sideOffset={5}
                                  >
                                    <p className="text-sm">{proposal.title}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="text-xs rounded-md"
                                >
                                  {displayName}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {new Date(
                                  proposal.proposal_timestamp_seconds * 1000,
                                ).toLocaleString("en-US", {
                                  year: "2-digit",
                                  month: "numeric",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </TableCell>
                              <TableCell>
                                {isDisabled && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>Stored</span>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          </TooltipProvider>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="mobile-card-list space-y-3">
                <div className="flex items-center gap-2 p-3 border border-[#1A1A1A] rounded-lg bg-muted">
                  <Checkbox
                    checked={
                      selectedProposals.size === newProposalsCount &&
                      newProposalsCount > 0
                    }
                    onCheckedChange={toggleAll}
                    disabled={newProposalsCount === 0}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">
                    Select All New ({newProposalsCount})
                  </span>
                </div>
                {paginatedProposals.map((proposal) => {
                  const topicId = topicStringToId(proposal.topic);
                  const displayName =
                    topicId !== null
                      ? topicIdToDisplayName(topicId)
                      : "Unknown Topic";
                  const isDisabled = proposal.isAlreadyStored;

                  return (
                    <div
                      key={proposal.proposal_id}
                      className={`p-4 border border-[#1A1A1A] rounded-lg space-y-3 ${isDisabled ? "proposal-card-stored" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedProposals.has(proposal.proposal_id)}
                          onCheckedChange={() =>
                            toggleProposal(proposal.proposal_id, isDisabled)
                          }
                          disabled={isDisabled}
                          className="rounded mt-1 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-medium">
                              #{proposal.proposal_id}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs rounded-md"
                            >
                              {displayName}
                            </Badge>
                            {isDisabled && (
                              <Badge
                                variant="secondary"
                                className="text-xs rounded-md flex items-center gap-1"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Already Stored
                              </Badge>
                            )}
                          </div>
                          <div className="font-medium text-foreground break-words">
                            {proposal.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Created:{" "}
                            {new Date(
                              proposal.proposal_timestamp_seconds * 1000,
                            ).toLocaleString("en-US", {
                              year: "2-digit",
                              month: "numeric",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="h-9 w-9 rounded-md cursor-pointer transition-all duration-200"
                          data-ocid="proposals_sync.pagination_first.button"
                        >
                          <ChevronFirst className="h-4 w-4" />
                          <span className="sr-only">First page</span>
                        </Button>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          className={`cursor-pointer transition-all duration-200 rounded-md ${currentPage === 1 ? "pointer-events-none opacity-50" : ""}`}
                        />
                      </PaginationItem>
                      {Array.from(
                        { length: Math.min(totalPages, 5) },
                        (_, i) => {
                          let page: number;
                          if (totalPages <= 5) {
                            page = i + 1;
                          } else if (currentPage <= 3) {
                            page = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            page = totalPages - 4 + i;
                          } else {
                            page = currentPage - 2 + i;
                          }
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
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
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          className={`cursor-pointer transition-all duration-200 rounded-md ${currentPage === totalPages ? "pointer-events-none opacity-50" : ""}`}
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          className="h-9 w-9 rounded-md cursor-pointer transition-all duration-200"
                          data-ocid="proposals_sync.pagination_last.button"
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
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
