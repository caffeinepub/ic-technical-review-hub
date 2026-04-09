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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { Textarea } from "@/components/ui/textarea";
import { Principal } from "@dfinity/principal";
import { useNavigate, useParams, useRouter } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  Edit,
  ExternalLink,
  Heart,
  PlusCircle,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAdminAddReview,
  useAdminRemoveReview,
  useFixReviewStatus,
  useGetAllReviewers,
  useGetProposal,
  useGetProposalReviews,
  useIsCallerAdmin,
  useIsCallerReviewer,
  useSubmitReview,
  useUpdateReviewLink,
} from "../hooks/useQueries";
import { formatDateTime, isInitialDeadlinePassed } from "../lib/dateUtils";
import { FixReviewStatusResult, Recommendation } from "../lib/domainTypes";
import type { Review } from "../lib/domainTypes";
import { topicIdToDisplayName } from "../lib/topicUtils";

export default function ProposalDetailPage() {
  const { proposalId: proposalIdStr } = useParams({
    from: "/proposal/$proposalId",
  });
  const router = useRouter();
  const navigate = useNavigate();

  // Parse proposalId defensively
  let proposalId: bigint;
  try {
    proposalId = BigInt(proposalIdStr);
  } catch {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: "/" })}
          className="mb-6 rounded-md transition-all duration-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Proposals
        </Button>
        <Card className="rounded-lg">
          <CardContent className="py-12 text-center text-muted-foreground">
            Proposal not found
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ProposalDetailContent
      proposalId={proposalId}
      router={router}
      navigate={navigate}
    />
  );
}

function ProposalDetailContent({
  proposalId,
  router,
  navigate,
}: {
  proposalId: bigint;
  router: ReturnType<typeof useRouter>;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { isFetching: actorFetching } = useActor();
  const { data: proposal, isLoading: proposalLoading } =
    useGetProposal(proposalId);
  const {
    data: reviews,
    isLoading: reviewsLoading,
    isFetching: reviewsFetching,
  } = useGetProposalReviews(proposalId);
  const { data: isReviewer } = useIsCallerReviewer();
  const { data: isAdmin } = useIsCallerAdmin();
  const { data: allReviewers } = useGetAllReviewers();
  const { identity } = useInternetIdentity();
  const submitReview = useSubmitReview();
  const fixReviewStatus = useFixReviewStatus();
  const updateReviewLink = useUpdateReviewLink();
  const adminAddReview = useAdminAddReview();
  const adminRemoveReview = useAdminRemoveReview();

  const [reviewLink, setReviewLink] = useState("");
  const [recommendation, setRecommendation] = useState<"adopt" | "reject" | "">(
    "",
  );

  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editedLink, setEditedLink] = useState("");
  const [editComment, setEditComment] = useState("");

  const [fixingReview, setFixingReview] = useState<Review | null>(null);
  const [fixComment, setFixComment] = useState("");

  const [removingReview, setRemovingReview] = useState<Review | null>(null);
  const [removeComment, setRemoveComment] = useState("");

  const [addReviewDialogOpen, setAddReviewDialogOpen] = useState(false);
  const [adminReviewerPrincipal, setAdminReviewerPrincipal] = useState("");
  const [adminReviewLink, setAdminReviewLink] = useState("");
  const [adminRecommendation, setAdminRecommendation] = useState<
    "adopt" | "reject" | ""
  >("");
  const [adminComment, setAdminComment] = useState("");

  const isAuthenticated = !!identity;
  const userPrincipal = identity?.getPrincipal().toString();
  const hasSubmittedReview = reviews?.some(
    (r) => r.reviewer.principal.toString() === userPrincipal,
  );
  const initialDeadlinePassed = proposal
    ? isInitialDeadlinePassed(proposal.deadline)
    : false;

  const paidReviews = reviews?.filter((r) => r.status === "paid") || [];
  const volunteerReviews =
    reviews?.filter((r) => r.status === "volunteer") || [];

  const canSubmitReview =
    isAuthenticated &&
    isReviewer &&
    !hasSubmittedReview &&
    !initialDeadlinePassed;

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewLink.trim()) {
      toast.error("Please enter a review link");
      return;
    }
    if (!recommendation) {
      toast.error("Please select a vote recommendation (Adopt or Reject)");
      return;
    }
    try {
      const recommendationEnum =
        recommendation === "adopt"
          ? Recommendation.adopt
          : Recommendation.reject;
      await submitReview.mutateAsync({
        proposalId,
        reviewLink: reviewLink.trim(),
        recommendation: recommendationEnum,
      });
      toast.success("Review submitted successfully");
      setReviewLink("");
      setRecommendation("");
    } catch (error: unknown) {
      const errorMessage =
        (error as { message?: string }).message || "Failed to submit review";
      if (errorMessage.includes("deadline")) {
        toast.error("Review initial deadline for this proposal has passed");
      } else if (errorMessage.includes("Admins are not permitted")) {
        toast.error("Admins cannot submit reviews");
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleOpenFixDialog = (review: Review) => {
    setFixingReview(review);
    setFixComment("");
  };

  const handleCloseFixDialog = () => {
    setFixingReview(null);
    setFixComment("");
  };

  const handleFixReviewStatus = async () => {
    if (!fixingReview) return;
    if (!fixComment.trim()) {
      toast.error("Please enter a comment before fixing status");
      return;
    }
    try {
      const result = await fixReviewStatus.mutateAsync({
        proposalId,
        reviewerPrincipal: fixingReview.reviewer.principal,
        comment: fixComment.trim(),
      });
      if (result === FixReviewStatusResult.fixedReviewStatus) {
        toast.success("Review status corrected successfully");
      } else if (result === FixReviewStatusResult.alreadyCorrect) {
        toast.info("Review status is already correct");
      } else if (result === FixReviewStatusResult.invalidReviewer) {
        toast.error("Invalid reviewer");
      } else if (result === FixReviewStatusResult.invalidProposal) {
        toast.error("Invalid proposal");
      }
      handleCloseFixDialog();
    } catch (error: unknown) {
      toast.error(
        (error as { message?: string }).message ||
          "Failed to fix review status",
      );
    }
  };

  const handleOpenEditDialog = (review: Review) => {
    setEditingReview(review);
    setEditedLink(review.link);
    setEditComment("");
  };

  const handleCloseEditDialog = () => {
    setEditingReview(null);
    setEditedLink("");
    setEditComment("");
  };

  const handleUpdateReviewLink = async () => {
    if (!editingReview) return;
    if (!editedLink.trim()) {
      toast.error("Please enter a review link");
      return;
    }
    if (!editComment.trim()) {
      toast.error("Please enter a comment explaining this change");
      return;
    }
    try {
      await updateReviewLink.mutateAsync({
        proposalId,
        reviewerPrincipal: editingReview.reviewer.principal,
        newLink: editedLink.trim(),
        comment: editComment.trim(),
      });
      toast.success("Review link updated successfully");
      handleCloseEditDialog();
    } catch (error: unknown) {
      const errorMessage =
        (error as { message?: string }).message ||
        "Failed to update review link";
      if (errorMessage.includes("Unauthorized")) {
        toast.error("Only admins can update review links");
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleOpenRemoveDialog = (review: Review) => {
    setRemovingReview(review);
    setRemoveComment("");
  };

  const handleCloseRemoveDialog = () => {
    setRemovingReview(null);
    setRemoveComment("");
  };

  const handleRemoveReview = async () => {
    if (!removingReview) return;
    if (!removeComment.trim()) {
      toast.error(
        "Please enter a comment explaining why you are removing this review",
      );
      return;
    }
    try {
      await adminRemoveReview.mutateAsync({
        proposalId,
        reviewerPrincipal: removingReview.reviewer.principal,
        comment: removeComment.trim(),
      });
      toast.success("Review removed successfully");
      handleCloseRemoveDialog();
    } catch (error: unknown) {
      toast.error(
        (error as { message?: string }).message || "Failed to remove review",
      );
    }
  };

  const handleOpenAddReviewDialog = () => {
    setAddReviewDialogOpen(true);
    setAdminReviewerPrincipal("");
    setAdminReviewLink("");
    setAdminRecommendation("");
    setAdminComment("");
  };

  const handleCloseAddReviewDialog = () => {
    setAddReviewDialogOpen(false);
    setAdminReviewerPrincipal("");
    setAdminReviewLink("");
    setAdminRecommendation("");
    setAdminComment("");
  };

  const handleAdminAddReview = async () => {
    if (!adminReviewerPrincipal) {
      toast.error("Please select a reviewer");
      return;
    }
    if (!adminReviewLink.trim()) {
      toast.error("Please enter a review link");
      return;
    }
    if (!adminRecommendation) {
      toast.error("Please select a vote recommendation");
      return;
    }
    if (!adminComment.trim()) {
      toast.error(
        "Please enter a comment explaining why you are adding this review",
      );
      return;
    }
    try {
      const rec =
        adminRecommendation === "adopt"
          ? Recommendation.adopt
          : Recommendation.reject;
      await adminAddReview.mutateAsync({
        proposalId,
        reviewerPrincipal: Principal.fromText(adminReviewerPrincipal),
        reviewLink: adminReviewLink.trim(),
        recommendation: rec,
        comment: adminComment.trim(),
      });
      toast.success("Review added on behalf of reviewer");
      handleCloseAddReviewDialog();
    } catch (error: unknown) {
      toast.error(
        (error as { message?: string }).message || "Failed to add review",
      );
    }
  };

  const handleBack = () => {
    router.history.back();
  };

  if (actorFetching || proposalLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <Skeleton className="h-9 w-24 mb-6 rounded-md" />
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-lg" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: "/" })}
          className="mb-6 rounded-md transition-all duration-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Proposals
        </Button>
        <Card className="rounded-lg">
          <CardContent className="py-12 text-center text-muted-foreground">
            Proposal not found
          </CardContent>
        </Card>
      </div>
    );
  }

  const nnsUrl = `https://nns.ic0.app/proposal/?u=qoctq-giaaa-aaaaa-aaaea-cai&proposal=${proposal.proposalId}`;
  const dashboardUrl = `https://dashboard.internetcomputer.org/proposal/${proposal.proposalId}`;

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8">
      <Button
        variant="ghost"
        onClick={handleBack}
        className="mb-6 rounded-md transition-all duration-200"
        data-ocid="proposal_detail.back.button"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="space-y-6">
        <Card className="border-border rounded-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 min-w-0">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-mono text-muted-foreground">
                    #{proposal.proposalId.toString()}
                  </span>
                  <Badge variant="outline" className="rounded-md">
                    {topicIdToDisplayName(proposal.topic)}
                  </Badge>
                </div>
                <CardTitle className="text-2xl break-words">
                  {proposal.title}
                </CardTitle>
                <CardDescription className="space-y-1">
                  <div>Created: {formatDateTime(proposal.timestamp)}</div>
                  <div>
                    Initial Deadline: {formatDateTime(proposal.deadline)}
                  </div>
                </CardDescription>
              </div>
              <div className="flex flex-col md:flex-row gap-2 w-full lg:w-auto flex-shrink-0">
                <Button
                  asChild
                  variant="outline"
                  className="rounded-md transition-all duration-200 border-border hover:bg-accent hover:shadow-md w-full md:w-auto"
                >
                  <a href={nnsUrl} target="_blank" rel="noopener noreferrer">
                    Vote on NNS <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-md transition-all duration-200 border-border hover:bg-accent hover:shadow-md w-full md:w-auto"
                >
                  <a
                    href={dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on ICP Dashboard{" "}
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {canSubmitReview && (
          <Card className="border-border rounded-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Submit Your Review</CardTitle>
              <CardDescription>
                Share your technical review and vote recommendation for this
                proposal. All reviewers can submit reviews for any topic before
                the initial deadline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reviewLink">Review Link</Label>
                  <Input
                    id="reviewLink"
                    type="url"
                    value={reviewLink}
                    onChange={(e) => setReviewLink(e.target.value)}
                    placeholder="https://forum.dfinity.org/..."
                    required
                    className="rounded-md transition-all duration-200"
                    data-ocid="proposal_detail.review_link.input"
                  />
                </div>
                <div className="space-y-3">
                  <Label>Vote Recommendation *</Label>
                  <RadioGroup
                    value={recommendation}
                    onValueChange={(value) =>
                      setRecommendation(value as "adopt" | "reject")
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="adopt" id="adopt" />
                      <Label
                        htmlFor="adopt"
                        className="font-normal cursor-pointer"
                      >
                        Adopt
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="reject" id="reject" />
                      <Label
                        htmlFor="reject"
                        className="font-normal cursor-pointer"
                      >
                        Reject
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <Button
                  type="submit"
                  disabled={submitReview.isPending}
                  className="rounded-md transition-all duration-200 w-full sm:w-auto"
                  data-ocid="proposal_detail.submit_review.button"
                >
                  {submitReview.isPending ? "Submitting..." : "Submit Review"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {initialDeadlinePassed &&
          isAuthenticated &&
          isReviewer &&
          !hasSubmittedReview && (
            <Card className="border-destructive/50 rounded-lg">
              <CardContent className="py-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <p className="text-sm font-medium">
                    The review initial deadline for this proposal has passed.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

        <Card className="border-border rounded-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <CardTitle className="text-lg">
                  Reviews ({reviews?.length || 0})
                </CardTitle>
              </div>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenAddReviewDialog}
                  className="rounded-md transition-all duration-200 border-border hover:bg-accent"
                  data-ocid="proposal_detail.add_review.open_modal_button"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Review (Admin)
                </Button>
              )}
            </div>
            <CardDescription>
              Reviews are marked as paid grantee reviews when submitted within
              an active assignment period, otherwise as voluntary submissions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {actorFetching ||
            reviewsLoading ||
            reviewsFetching ||
            reviews === undefined ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            ) : reviews && reviews.length === 0 ? (
              <div
                className="text-center py-8 text-muted-foreground"
                data-ocid="proposal_detail.reviews.empty_state"
              >
                No reviews submitted yet
              </div>
            ) : (
              <div className="space-y-6">
                {paidReviews.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Award className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm">
                        Paid Grantee Reviews ({paidReviews.length})
                      </h3>
                    </div>
                    <ReviewTable
                      reviews={paidReviews}
                      isAdmin={isAdmin || false}
                      onFixStatus={handleOpenFixDialog}
                      onEditLink={handleOpenEditDialog}
                      onRemove={handleOpenRemoveDialog}
                    />
                  </div>
                )}
                {volunteerReviews.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Heart className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-sm">
                        Voluntary Submissions ({volunteerReviews.length})
                      </h3>
                    </div>
                    <ReviewTable
                      reviews={volunteerReviews}
                      isAdmin={isAdmin || false}
                      onFixStatus={handleOpenFixDialog}
                      onEditLink={handleOpenEditDialog}
                      onRemove={handleOpenRemoveDialog}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Link Dialog */}
      <Dialog
        open={!!editingReview}
        onOpenChange={(open) => !open && handleCloseEditDialog()}
      >
        <DialogContent
          className="sm:max-w-[500px] rounded-lg bg-[#181818] border border-[#333333]"
          data-ocid="proposal_detail.edit_link.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-white">Edit Review Link</DialogTitle>
            <DialogDescription className="text-[#999999]">
              Update the review link for {editingReview?.reviewer.nickname}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editLink" className="text-white">
                Review Link
              </Label>
              <Input
                id="editLink"
                type="url"
                value={editedLink}
                onChange={(e) => setEditedLink(e.target.value)}
                placeholder="https://forum.dfinity.org/..."
                className="rounded-md transition-all duration-200 bg-[#1A1A1A] border-[#444444] text-white"
                data-ocid="proposal_detail.edit_link.input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editComment" className="text-white">
                Reason for change <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="editComment"
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Explain why the review link is being updated..."
                className="rounded-md transition-all duration-200 min-h-[80px] bg-[#1A1A1A] border-[#444444] text-white"
                data-ocid="proposal_detail.edit_link.textarea"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseEditDialog}
              disabled={updateReviewLink.isPending}
              className="rounded-md transition-all duration-200"
              data-ocid="proposal_detail.edit_link.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateReviewLink}
              disabled={updateReviewLink.isPending}
              className="rounded-md transition-all duration-200"
              data-ocid="proposal_detail.edit_link.save_button"
            >
              {updateReviewLink.isPending ? "Updating..." : "Update Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fix Status Dialog */}
      <Dialog
        open={!!fixingReview}
        onOpenChange={(open) => !open && handleCloseFixDialog()}
      >
        <DialogContent
          className="sm:max-w-[500px] rounded-lg bg-[#181818] border border-[#333333]"
          data-ocid="proposal_detail.fix_status.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-white">Fix Review Status</DialogTitle>
            <DialogDescription className="text-[#999999]">
              Re-evaluate and correct the paid/voluntary status for{" "}
              {fixingReview?.reviewer.nickname}&apos;s review based on their
              grant assignments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fixComment" className="text-white">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="fixComment"
                value={fixComment}
                onChange={(e) => setFixComment(e.target.value)}
                placeholder="Explain why the review status is being corrected..."
                className="rounded-md transition-all duration-200 min-h-[80px] bg-[#1A1A1A] border-[#444444] text-white"
                data-ocid="proposal_detail.fix_status.textarea"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseFixDialog}
              disabled={fixReviewStatus.isPending}
              className="rounded-md transition-all duration-200"
              data-ocid="proposal_detail.fix_status.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleFixReviewStatus}
              disabled={fixReviewStatus.isPending}
              className="rounded-md transition-all duration-200"
              data-ocid="proposal_detail.fix_status.confirm_button"
            >
              {fixReviewStatus.isPending ? "Fixing..." : "Fix Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Review Dialog */}
      <Dialog
        open={!!removingReview}
        onOpenChange={(open) => !open && handleCloseRemoveDialog()}
      >
        <DialogContent
          className="sm:max-w-[500px] rounded-lg bg-[#181818] border border-[#333333]"
          data-ocid="proposal_detail.remove_review.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-white">Remove Review</DialogTitle>
            <DialogDescription className="text-[#999999]">
              You are about to permanently remove the review submitted by{" "}
              <strong>{removingReview?.reviewer.nickname}</strong> for proposal{" "}
              #{proposalId.toString()}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="removeComment" className="text-white">
                Reason for removal <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="removeComment"
                value={removeComment}
                onChange={(e) => setRemoveComment(e.target.value)}
                placeholder="Explain why this review is being removed..."
                className="rounded-md transition-all duration-200 min-h-[80px] bg-[#1A1A1A] border-[#444444] text-white"
                data-ocid="proposal_detail.remove_review.textarea"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseRemoveDialog}
              disabled={adminRemoveReview.isPending}
              className="rounded-md transition-all duration-200"
              data-ocid="proposal_detail.remove_review.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveReview}
              disabled={adminRemoveReview.isPending}
              className="rounded-md transition-all duration-200"
              data-ocid="proposal_detail.remove_review.confirm_button"
            >
              {adminRemoveReview.isPending ? "Removing..." : "Remove Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Add Review Dialog */}
      <Dialog
        open={addReviewDialogOpen}
        onOpenChange={(open) => !open && handleCloseAddReviewDialog()}
      >
        <DialogContent
          className="sm:max-w-[550px] rounded-lg bg-[#181818] border border-[#333333]"
          data-ocid="proposal_detail.admin_add_review.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-white">
              Add Review on Behalf of Reviewer
            </DialogTitle>
            <DialogDescription className="text-[#999999]">
              As an admin you can add a review for any registered reviewer. This
              bypasses the deadline restriction. The action will be recorded in
              the audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="adminReviewerSelect" className="text-white">
                Reviewer <span className="text-destructive">*</span>
              </Label>
              <Select
                value={adminReviewerPrincipal}
                onValueChange={setAdminReviewerPrincipal}
              >
                <SelectTrigger
                  id="adminReviewerSelect"
                  className="rounded-md bg-[#1A1A1A] border-[#444444] text-white"
                  data-ocid="proposal_detail.admin_add_review.select"
                >
                  <SelectValue placeholder="Select a reviewer..." />
                </SelectTrigger>
                <SelectContent className="rounded-md bg-[#1A1A1A] border-[#333333]">
                  {allReviewers
                    ?.map((rwa) => rwa.reviewer)
                    .sort((a, b) => a.nickname.localeCompare(b.nickname))
                    .map((reviewer) => (
                      <SelectItem
                        key={reviewer.principal.toString()}
                        value={reviewer.principal.toString()}
                        className="text-white"
                      >
                        {reviewer.nickname}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminReviewLink" className="text-white">
                Review Link <span className="text-destructive">*</span>
              </Label>
              <Input
                id="adminReviewLink"
                type="url"
                value={adminReviewLink}
                onChange={(e) => setAdminReviewLink(e.target.value)}
                placeholder="https://forum.dfinity.org/..."
                className="rounded-md transition-all duration-200 bg-[#1A1A1A] border-[#444444] text-white"
                data-ocid="proposal_detail.admin_add_review.input"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-white">
                Vote Recommendation <span className="text-destructive">*</span>
              </Label>
              <RadioGroup
                value={adminRecommendation}
                onValueChange={(v) =>
                  setAdminRecommendation(v as "adopt" | "reject")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="adopt" id="adminAdopt" />
                  <Label
                    htmlFor="adminAdopt"
                    className="font-normal cursor-pointer text-white"
                  >
                    Adopt
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="reject" id="adminReject" />
                  <Label
                    htmlFor="adminReject"
                    className="font-normal cursor-pointer text-white"
                  >
                    Reject
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminAddComment" className="text-white">
                Reason / Comment <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="adminAddComment"
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder="Explain why you are adding this review on behalf of the reviewer..."
                className="rounded-md transition-all duration-200 min-h-[80px] bg-[#1A1A1A] border-[#444444] text-white"
                data-ocid="proposal_detail.admin_add_review.textarea"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseAddReviewDialog}
              disabled={adminAddReview.isPending}
              className="rounded-md transition-all duration-200"
              data-ocid="proposal_detail.admin_add_review.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdminAddReview}
              disabled={adminAddReview.isPending}
              className="rounded-md transition-all duration-200"
              data-ocid="proposal_detail.admin_add_review.submit_button"
            >
              {adminAddReview.isPending ? "Adding..." : "Add Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ReviewTableProps {
  reviews: Review[];
  isAdmin: boolean;
  onFixStatus: (review: Review) => void;
  onEditLink: (review: Review) => void;
  onRemove: (review: Review) => void;
}

function ReviewTable({
  reviews,
  isAdmin,
  onFixStatus,
  onEditLink,
  onRemove,
}: ReviewTableProps) {
  const navigate = useNavigate();

  return (
    <>
      {/* Desktop Table View */}
      <div className="mobile-card-table border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="min-w-[150px] text-foreground">
                  Reviewer
                </TableHead>
                <TableHead className="w-32 min-w-[128px] text-foreground">
                  Recommendation
                </TableHead>
                <TableHead className="w-40 min-w-[160px] text-foreground">
                  Submitted
                </TableHead>
                <TableHead className="min-w-[200px] text-foreground">
                  Review Link
                </TableHead>
                {isAdmin && (
                  <TableHead className="w-48 min-w-[190px] text-foreground">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((review, index) => (
                <TableRow
                  key={review.reviewer.principal.toString()}
                  className="border-b border-border"
                >
                  <TableCell>
                    <button
                      type="button"
                      onClick={() =>
                        navigate({
                          to: "/reviewer/$principal",
                          params: {
                            principal: review.reviewer.principal.toString(),
                          },
                          search: {},
                        })
                      }
                      className="font-medium text-foreground hover:underline transition-colors duration-200"
                    >
                      {review.reviewer.nickname}
                    </button>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`recommendation-badge ${
                        review.recommendation === Recommendation.adopt
                          ? "recommendation-adopt"
                          : "recommendation-reject"
                      }`}
                    >
                      {review.recommendation === Recommendation.adopt
                        ? "Adopt"
                        : "Reject"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(review.timestamp)}
                  </TableCell>
                  <TableCell>
                    <a
                      href={review.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1 transition-colors duration-200 break-all"
                    >
                      View Review <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex gap-1.5 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditLink(review)}
                          className="rounded-md transition-all duration-200 border-border hover:bg-accent hover:shadow-md text-xs"
                          data-ocid={`proposal_detail.edit_link.button.${index + 1}`}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit Link
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onFixStatus(review)}
                          className="rounded-md transition-all duration-200 border-border hover:bg-accent hover:shadow-md text-xs"
                          data-ocid={`proposal_detail.fix_status.button.${index + 1}`}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Fix Status
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRemove(review)}
                          className="rounded-md transition-all duration-200 border-destructive/50 text-destructive hover:bg-destructive/10 text-xs"
                          data-ocid={`proposal_detail.remove_review.delete_button.${index + 1}`}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="mobile-card-list space-y-3">
        {reviews.map((review, index) => (
          <div
            key={review.reviewer.principal.toString()}
            className="p-4 border border-border rounded-lg space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      to: "/reviewer/$principal",
                      params: {
                        principal: review.reviewer.principal.toString(),
                      },
                      search: {},
                    })
                  }
                  className="font-medium text-foreground hover:underline transition-colors duration-200"
                >
                  {review.reviewer.nickname}
                </button>
                <span
                  className={`recommendation-badge ${
                    review.recommendation === Recommendation.adopt
                      ? "recommendation-adopt"
                      : "recommendation-reject"
                  }`}
                >
                  {review.recommendation === Recommendation.adopt
                    ? "Adopt"
                    : "Reject"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDateTime(review.timestamp)}
              </div>
            </div>
            <a
              href={review.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1 transition-colors duration-200 break-all"
            >
              View Review <ExternalLink className="h-3 w-3" />
            </a>
            {isAdmin && (
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditLink(review)}
                  className="rounded-md transition-all duration-200 border-border hover:bg-accent hover:shadow-md w-full"
                  data-ocid={`proposal_detail.edit_link.button.${index + 1}`}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onFixStatus(review)}
                  className="rounded-md transition-all duration-200 border-border hover:bg-accent hover:shadow-md w-full"
                  data-ocid={`proposal_detail.fix_status.button.${index + 1}`}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Fix Status
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRemove(review)}
                  className="rounded-md transition-all duration-200 border-destructive/50 text-destructive hover:bg-destructive/10 w-full"
                  data-ocid={`proposal_detail.remove_review.delete_button.${index + 1}`}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Remove
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
