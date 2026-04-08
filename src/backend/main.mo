import Set "mo:core/Set";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Int "mo:core/Int";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import AccessControl "mo:caffeineai-authorization/access-control";



actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let admins = Set.empty<Principal>();

  var authorizedProposalSubmitter : ?Principal = null;

  type Reviewer = {
    principal : Principal;
    nickname : Text;
    forumProfileUrl : Text;
  };

  type ReviewerAssignment = {
    startDate : Int;
    endDate : Int;
  };

  type Recommendation = {
    #adopt;
    #reject;
  };

  type Proposal = {
    proposalId : Nat;
    title : Text;
    timestamp : Int;
    deadline : Int;
    creationDate : Int;
    deadlineDate : Int;
    topic : Nat;
  };

  type ProposalWithCounts = {
    proposalId : Nat;
    title : Text;
    timestamp : Int;
    deadline : Int;
    creationDate : Int;
    deadlineDate : Int;
    topic : Nat;
    adoptCount : Nat;
    rejectCount : Nat;
    totalReviewCount : Nat;
  };

  type Review = {
    proposalId : Nat;
    reviewer : Reviewer;
    link : Text;
    status : { #paid; #volunteer };
    timestamp : Int;
    topic : Nat;
    recommendation : Recommendation;
  };

  type UserProfile = {
    nickname : Text;
    forumProfileUrl : Text;
  };

  type ReviewerWithAssignments = {
    reviewer : Reviewer;
    assignments : [(Nat, ReviewerAssignment)];
  };

  type ReviewerStatus = {
    #volunteer;
    #volunteerFormerGrantee;
    #paidGrantee;
  };

  type ReviewerDetail = {
    reviewer : Reviewer;
    status : ReviewerStatus;
    totalReviews : Nat;
    paidReviews : Nat;
    voluntaryReviews : Nat;
    currentAssignments : [(Nat, ReviewerAssignment)];
    allAssignments : [(Nat, ReviewerAssignment)];
  };

  type FixReviewStatusResult = {
    #fixedReviewStatus;
    #alreadyCorrect;
    #invalidReviewer;
    #invalidProposal;
  };

  type AddOrUpdateResult = {
    #success;
    #duplicateError;
    #notFoundError;
    #updateError;
  };

  type AuditActionType = {
    #addReview;
    #removeReview;
    #editReviewLink;
    #fixReviewStatus;
  };

  type AuditLogEntry = {
    id : Nat;
    timestamp : Int;
    adminPrincipal : Principal;
    actionType : AuditActionType;
    proposalId : Nat;
    proposalTitle : Text;
    reviewerPrincipal : Principal;
    reviewerNickname : Text;
    comment : Text;
    beforeValue : ?Text;
    afterValue : ?Text;
  };

  let proposals = Map.empty<Nat, Proposal>();
  let reviews = Map.empty<Nat, [Review]>();
  let reviewers = Map.empty<Principal, Reviewer>();
  let reviewerAssignments = Map.empty<Principal, Map.Map<Nat, ReviewerAssignment>>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let auditLog = Map.empty<Nat, AuditLogEntry>();
  var auditLogCounter : Nat = 0;

  module TopicMapper {
    public let TOPIC_IC_OS_VERSION_ELECTION = 5;
    public let TOPIC_APPLICATION_CANISTER_MANAGEMENT = 0;
    public let TOPIC_PROTOCOL_CANISTER_MANAGEMENT = 3;

    public func topicFromApiString(apiTopic : Text) : ?Nat {
      switch (apiTopic) {
        case ("TOPIC_IC_OS_VERSION_ELECTION") { ?TOPIC_IC_OS_VERSION_ELECTION };
        case ("TOPIC_APPLICATION_CANISTER_MANAGEMENT") { ?TOPIC_APPLICATION_CANISTER_MANAGEMENT };
        case ("TOPIC_PROTOCOL_CANISTER_MANAGEMENT") { ?TOPIC_PROTOCOL_CANISTER_MANAGEMENT };
        case (_) { null };
      };
    };

    public func displayNameFromTopicId(topicId : Nat) : Text {
      if (topicId == TOPIC_IC_OS_VERSION_ELECTION) {
        "IC OS Version Election";
      } else if (topicId == TOPIC_APPLICATION_CANISTER_MANAGEMENT) {
        "Application Canister Management";
      } else if (topicId == TOPIC_PROTOCOL_CANISTER_MANAGEMENT) {
        "Protocol Canister Management";
      } else {
        "Unknown Topic";
      };
    };
  };

  // Check if caller is the authorized submitter
  func isAuthorizedProposalSubmitter(principal : Principal) : Bool {
    switch (authorizedProposalSubmitter) {
      case (null) { false };
      case (?submitter) { Principal.equal(principal, submitter) };
    };
  };

  // Write an audit log entry
  func writeAuditLog(
    adminPrincipal : Principal,
    actionType : AuditActionType,
    proposalId : Nat,
    proposalTitle : Text,
    reviewerPrincipal : Principal,
    reviewerNickname : Text,
    comment : Text,
    beforeValue : ?Text,
    afterValue : ?Text,
  ) {
    let entry : AuditLogEntry = {
      id = auditLogCounter;
      timestamp = Time.now();
      adminPrincipal;
      actionType;
      proposalId;
      proposalTitle;
      reviewerPrincipal;
      reviewerNickname;
      comment;
      beforeValue;
      afterValue;
    };
    auditLog.add(auditLogCounter, entry);
    auditLogCounter += 1;
  };

  // Admin actions for proposal submitter management
  public shared ({ caller }) func setAuthorizedProposalSubmitter(principal : ?Principal) : async () {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can set the proposal submitter");
    };
    authorizedProposalSubmitter := principal;
  };

  public query ({ caller }) func getAuthorizedProposalSubmitter() : async ?Principal {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can view the proposal submitter");
    };
    authorizedProposalSubmitter;
  };

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    userProfiles.get(caller);
  };

  public query func getUserProfile(user : Principal) : async ?UserProfile {
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    userProfiles.add(caller, profile);
  };

  // Admin Management
  public query ({ caller }) func isAdmin(principal : Principal) : async Bool {
    isAdminPrincipal(principal);
  };

  func validateTopic(topic : Nat) {
    let validTopics = [
      TopicMapper.TOPIC_IC_OS_VERSION_ELECTION,
      TopicMapper.TOPIC_APPLICATION_CANISTER_MANAGEMENT,
      TopicMapper.TOPIC_PROTOCOL_CANISTER_MANAGEMENT,
    ];
    var isValid = false;
    for (t in validTopics.values()) {
      if (t == topic) {
        isValid := true;
      };
    };
    if (not isValid) {
      Runtime.trap("Invalid topic");
    };
  };

  func isAdminPrincipal(principal : Principal) : Bool {
    if (admins.contains(principal)) { return true };
    AccessControl.isAdmin(accessControlState, principal);
  };

  func isReviewerPrincipal(principal : Principal) : Bool {
    reviewers.containsKey(principal);
  };

  func getReviewerStatus(reviewerPrincipal : Principal) : ReviewerStatus {
    let currentTime = Time.now();
    let assignments = switch (reviewerAssignments.get(reviewerPrincipal)) {
      case (null) { return #volunteer };
      case (?a) { a };
    };

    var hasActiveAssignment = false;
    var hasPastAssignment = false;

    for ((topic, assignment) in assignments.entries()) {
      if (currentTime >= assignment.startDate and currentTime <= assignment.endDate) {
        hasActiveAssignment := true;
      } else if (currentTime > assignment.endDate) {
        hasPastAssignment := true;
      };
    };

    if (hasActiveAssignment) {
      #paidGrantee;
    } else if (hasPastAssignment) {
      #volunteerFormerGrantee;
    } else {
      #volunteer;
    };
  };

  func getReviewerReviews(reviewerPrincipal : Principal) : [Review] {
    var allReviews : [Review] = [];
    for ((proposalId, reviewList) in reviews.entries()) {
      for (review in reviewList.vals()) {
        if (Principal.equal(review.reviewer.principal, reviewerPrincipal)) {
          allReviews := allReviews.concat([review]);
        };
      };
    };
    allReviews;
  };

  // Admin actions
  public shared ({ caller }) func addAdmin(principal : Principal) : async () {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can add new admins");
    };
    admins.add(principal);
    AccessControl.assignRole(accessControlState, caller, principal, #admin);
  };

  public shared ({ caller }) func removeAdmin(principal : Principal) : async () {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can remove admins");
    };
    admins.remove(principal);
  };

  public query ({ caller }) func getAllAdmins() : async [Principal] {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can view the admin list");
    };
    admins.toArray();
  };

  // Reviewer Management
  public shared ({ caller }) func addOrUpdateReviewer(
    principal : Principal,
    nickname : Text,
    forumProfileUrl : Text,
  ) : async AddOrUpdateResult {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can add reviewers");
    };

    switch (reviewers.get(principal)) {
      case (null) {
        let reviewer : Reviewer = {
          principal;
          nickname;
          forumProfileUrl;
        };
        reviewers.add(principal, reviewer);
        AccessControl.assignRole(accessControlState, caller, principal, #user);
        #success;
      };
      case (?_) { #duplicateError };
    };
  };

  public shared ({ caller }) func updateReviewer(
    principal : Principal,
    nickname : Text,
    forumProfileUrl : Text,
  ) : async AddOrUpdateResult {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can update reviewers");
    };

    switch (reviewers.get(principal)) {
      case (null) { #notFoundError };
      case (?_) {
        let reviewer : Reviewer = {
          principal;
          nickname;
          forumProfileUrl;
        };
        reviewers.add(principal, reviewer);
        #success;
      };
    };
  };

  public shared ({ caller }) func removeReviewer(principal : Principal) : async () {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can remove reviewers");
    };
    reviewers.remove(principal);
    reviewerAssignments.remove(principal);
  };

  public shared ({ caller }) func assignReviewerToTopic(
    reviewer : Principal,
    topic : Nat,
    startDate : Int,
    endDate : Int,
  ) : async () {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can assign reviewers");
    };

    validateTopic(topic);

    switch (reviewers.get(reviewer)) {
      case (null) { Runtime.trap("Reviewer must be registered first") };
      case (?_) {};
    };

    let assignment : ReviewerAssignment = {
      startDate;
      endDate;
    };

    let topicAssignments = switch (reviewerAssignments.get(reviewer)) {
      case (null) { Map.empty<Nat, ReviewerAssignment>() };
      case (?existing) { existing };
    };

    topicAssignments.add(topic, assignment);
    reviewerAssignments.add(reviewer, topicAssignments);
  };

  // Reviewer Queries
  public query func getAllReviewers() : async [ReviewerWithAssignments] {
    var result : [ReviewerWithAssignments] = [];
    for ((principal, reviewer) in reviewers.entries()) {
      let assignments = switch (reviewerAssignments.get(principal)) {
        case (null) { [] };
        case (?a) { a.entries().toArray() };
      };
      result := result.concat([{
        reviewer;
        assignments;
      }]);
    };
    result;
  };

  public query func getReviewer(principal : Principal) : async ?Reviewer {
    reviewers.get(principal);
  };

  public query func getReviewerDetail(principal : Principal) : async ?ReviewerDetail {
    switch (reviewers.get(principal)) {
      case (null) { null };
      case (?reviewer) {
        let status = getReviewerStatus(principal);
        let allReviews = getReviewerReviews(principal);
        
        var paidCount = 0;
        var voluntaryCount = 0;
        for (review in allReviews.vals()) {
          switch (review.status) {
            case (#paid) { paidCount += 1 };
            case (#volunteer) { voluntaryCount += 1 };
          };
        };

        let currentTime = Time.now();
        let allAssignments = switch (reviewerAssignments.get(principal)) {
          case (null) { [] };
          case (?a) { a.entries().toArray() };
        };

        let currentAssignments = allAssignments.filter(
          func((topic, assignment)) {
            currentTime >= assignment.startDate and currentTime <= assignment.endDate
          }
        );

        ?{
          reviewer;
          status;
          totalReviews = allReviews.size();
          paidReviews = paidCount;
          voluntaryReviews = voluntaryCount;
          currentAssignments;
          allAssignments;
        };
      };
    };
  };

  public query func getReviewerAssignments(principal : Principal) : async [(Nat, ReviewerAssignment)] {
    switch (reviewerAssignments.get(principal)) {
      case (null) { [] };
      case (?assignments) { assignments.entries().toArray() };
    };
  };

  public query func getReviewerReviewHistory(principal : Principal) : async [Review] {
    let allReviews = getReviewerReviews(principal);
    allReviews.sort(func(r1, r2) { Int.compare(r2.timestamp, r1.timestamp) });
  };

  public query func getReviewerTodos(principal : Principal) : async [Proposal] {
    let currentTime = Time.now();
    let assignments = switch (reviewerAssignments.get(principal)) {
      case (null) { return [] };
      case (?a) { a };
    };

    var todos : [Proposal] = [];
    
    for ((proposalId, proposal) in proposals.entries()) {
      // Check if proposal is still open
      if (currentTime < proposal.deadline) {
        // Check if proposal was created during an active assignment
        for ((topic, assignment) in assignments.entries()) {
          if (proposal.topic == topic and 
              proposal.creationDate >= assignment.startDate and 
              proposal.creationDate <= assignment.endDate) {
            
            // Check if reviewer hasn't submitted a review yet
            let hasReview = switch (reviews.get(proposalId)) {
              case (null) { false };
              case (?reviewList) {
                var found = false;
                for (review in reviewList.vals()) {
                  if (Principal.equal(review.reviewer.principal, principal)) {
                    found := true;
                  };
                };
                found;
              };
            };

            if (not hasReview) {
              todos := todos.concat([proposal]);
            };
          };
        };
      };
    };
    todos;
  };

  public query func getReviewerMissedProposals(principal : Principal) : async [Proposal] {
    let currentTime = Time.now();
    let assignments = switch (reviewerAssignments.get(principal)) {
      case (null) { return [] };
      case (?a) { a };
    };

    var missed : [Proposal] = [];
    
    for ((proposalId, proposal) in proposals.entries()) {
      // Check if deadline has passed
      if (currentTime >= proposal.deadline) {
        // Check if proposal was created during an active assignment
        for ((topic, assignment) in assignments.entries()) {
          if (proposal.topic == topic and 
              proposal.creationDate >= assignment.startDate and 
              proposal.creationDate <= assignment.endDate) {
            
            // Check if reviewer didn't submit a review
            let hasReview = switch (reviews.get(proposalId)) {
              case (null) { false };
              case (?reviewList) {
                var found = false;
                for (review in reviewList.vals()) {
                  if (Principal.equal(review.reviewer.principal, principal)) {
                    found := true;
                  };
                };
                found;
              };
            };

            if (not hasReview) {
              missed := missed.concat([proposal]);
            };
          };
        };
      };
    };
    missed;
  };

  // Proposal Management
  public shared ({ caller }) func addProposal(
    proposalId : Nat,
    title : Text,
    timestamp : Int,
    deadline : Int,
    creationDate : Int,
    deadlineDate : Int,
    topic : Nat,
  ) : async () {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can add proposals");
    };

    validateTopic(topic);

    let proposal : Proposal = {
      proposalId;
      title;
      timestamp;
      deadline;
      creationDate;
      deadlineDate;
      topic;
    };
    proposals.add(proposalId, proposal);
  };

  public shared ({ caller }) func removeProposal(proposalId : Nat) : async () {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can remove proposals");
    };
    proposals.remove(proposalId);
  };

  // Review Submission
  public shared ({ caller }) func submitReview(
    proposalId : Nat,
    reviewLink : Text,
    recommendation : Recommendation,
  ) : async () {
    // Must be authenticated
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };

    // Admins cannot submit reviews
    if (isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Admins are not permitted to submit reviews");
    };

    // Must be a registered reviewer
    if (not isReviewerPrincipal(caller)) {
      Runtime.trap("Unauthorized: You must be registered as a reviewer");
    };

    let reviewer = switch (reviewers.get(caller)) {
      case (null) { Runtime.trap("Unauthorized: You must be registered as a reviewer") };
      case (?r) { r };
    };

    let proposal = switch (proposals.get(proposalId)) {
      case (null) { Runtime.trap("Proposal not found") };
      case (?p) { p };
    };

    // Check deadline
    if (Time.now() > proposal.deadline) {
      Runtime.trap("Review deadline for this proposal has passed");
    };

    let assignment = switch (reviewerAssignments.get(caller)) {
      case (null) { null };
      case (?assignments) {
        switch (assignments.get(proposal.topic)) {
          case (null) { null };
          case (?a) { ?a };
        };
      };
    };

    // Check for duplicate review
    let existingReviews = switch (reviews.get(proposalId)) {
      case (null) { [] };
      case (?revs) { revs };
    };

    for (existingReview in existingReviews.vals()) {
      if (Principal.equal(existingReview.reviewer.principal, caller)) {
        Runtime.trap("You have already submitted a review for this proposal");
      };
    };

    let currentTimeNs = Time.now();

    let status = switch (assignment) {
      case (null) { #volunteer };
      case (?a) {
        let isProposalInRange = proposal.creationDate >= a.startDate and proposal.creationDate <= a.endDate;
        if (isProposalInRange) {
          #paid;
        } else {
          #volunteer;
        };
      };
    };

    let review : Review = {
      proposalId;
      reviewer;
      link = reviewLink;
      status;
      timestamp = currentTimeNs;
      topic = proposal.topic;
      recommendation;
    };

    let updatedReviews = existingReviews.concat([review]);
    reviews.add(proposalId, updatedReviews);
  };

  // Admin: Add review on behalf of a reviewer (bypasses deadline)
  public shared ({ caller }) func adminAddReview(
    proposalId : Nat,
    reviewerPrincipal : Principal,
    reviewLink : Text,
    recommendation : Recommendation,
    comment : Text,
  ) : async () {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can add reviews on behalf of reviewers");
    };

    if (comment == "") {
      Runtime.trap("A comment is required for admin actions");
    };

    let reviewer = switch (reviewers.get(reviewerPrincipal)) {
      case (null) { Runtime.trap("Reviewer not found") };
      case (?r) { r };
    };

    let proposal = switch (proposals.get(proposalId)) {
      case (null) { Runtime.trap("Proposal not found") };
      case (?p) { p };
    };

    // Check for duplicate review
    let existingReviews = switch (reviews.get(proposalId)) {
      case (null) { [] };
      case (?revs) { revs };
    };

    for (existingReview in existingReviews.vals()) {
      if (Principal.equal(existingReview.reviewer.principal, reviewerPrincipal)) {
        Runtime.trap("This reviewer has already submitted a review for this proposal");
      };
    };

    // Determine paid/volunteer status based on assignment and proposal creation date
    let assignment = switch (reviewerAssignments.get(reviewerPrincipal)) {
      case (null) { null };
      case (?assignments) {
        switch (assignments.get(proposal.topic)) {
          case (null) { null };
          case (?a) { ?a };
        };
      };
    };

    let status = switch (assignment) {
      case (null) { #volunteer };
      case (?a) {
        let isProposalInRange = proposal.creationDate >= a.startDate and proposal.creationDate <= a.endDate;
        if (isProposalInRange) { #paid } else { #volunteer };
      };
    };

    let review : Review = {
      proposalId;
      reviewer;
      link = reviewLink;
      status;
      timestamp = Time.now();
      topic = proposal.topic;
      recommendation;
    };

    let updatedReviews = existingReviews.concat([review]);
    reviews.add(proposalId, updatedReviews);

    writeAuditLog(
      caller,
      #addReview,
      proposalId,
      proposal.title,
      reviewerPrincipal,
      reviewer.nickname,
      comment,
      null,
      ?reviewLink,
    );
  };

  // Admin: Remove a review
  public shared ({ caller }) func adminRemoveReview(
    proposalId : Nat,
    reviewerPrincipal : Principal,
    comment : Text,
  ) : async () {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can remove reviews");
    };

    if (comment == "") {
      Runtime.trap("A comment is required for admin actions");
    };

    let proposal = switch (proposals.get(proposalId)) {
      case (null) { Runtime.trap("Proposal not found") };
      case (?p) { p };
    };

    let reviewList = switch (reviews.get(proposalId)) {
      case (null) { Runtime.trap("No reviews found for this proposal") };
      case (?revs) { revs };
    };

    var removedReview : ?Review = null;
    let updatedReviewList = reviewList.filter(
      func(review) {
        if (Principal.equal(review.reviewer.principal, reviewerPrincipal)) {
          removedReview := ?review;
          false;
        } else {
          true;
        };
      }
    );

    switch (removedReview) {
      case (null) { Runtime.trap("Review not found for the specified reviewer and proposal") };
      case (?removed) {
        reviews.add(proposalId, updatedReviewList);

        let reviewerNickname = switch (reviewers.get(reviewerPrincipal)) {
          case (null) { "Unknown" };
          case (?r) { r.nickname };
        };

        writeAuditLog(
          caller,
          #removeReview,
          proposalId,
          proposal.title,
          reviewerPrincipal,
          reviewerNickname,
          comment,
          ?removed.link,
          null,
        );
      };
    };
  };

  // Update review link (with mandatory audit comment)
  public shared ({ caller }) func updateReviewLink(
    proposalId : Nat,
    reviewerPrincipal : Principal,
    newLink : Text,
    comment : Text,
  ) : async Bool {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can update review links");
    };

    if (comment == "") {
      Runtime.trap("A comment is required for admin actions");
    };

    switch (proposals.get(proposalId)) {
      case (null) { Runtime.trap("Proposal not found") };
      case (?proposal) {
        switch (reviews.get(proposalId)) {
          case (null) { Runtime.trap("No reviews found for this proposal") };
          case (?reviewList) {
            var found = false;
            var oldLink : Text = "";
            let updatedReviewList = reviewList.map(
              func(review) {
                if (not found) {
                  if (Principal.equal(review.reviewer.principal, reviewerPrincipal)) {
                    found := true;
                    oldLink := review.link;
                    { review with link = newLink };
                  } else {
                    review;
                  };
                } else {
                  review;
                };
              }
            );

            if (found) {
              reviews.add(proposalId, updatedReviewList);

              let reviewerNickname = switch (reviewers.get(reviewerPrincipal)) {
                case (null) { "Unknown" };
                case (?r) { r.nickname };
              };

              writeAuditLog(
                caller,
                #editReviewLink,
                proposalId,
                proposal.title,
                reviewerPrincipal,
                reviewerNickname,
                comment,
                ?oldLink,
                ?newLink,
              );

              true;
            } else {
              Runtime.trap("Review not found for the specified reviewer and proposal");
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func fixReviewStatus(
    proposalId : Nat,
    reviewerPrincipal : Principal,
    comment : Text,
  ) : async FixReviewStatusResult {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can fix review statuses");
    };

    if (comment == "") {
      Runtime.trap("A comment is required for admin actions");
    };

    let reviewer = switch (reviewers.get(reviewerPrincipal)) {
      case (null) { return #invalidReviewer };
      case (?r) { r };
    };

    let proposal = switch (proposals.get(proposalId)) {
      case (null) { return #invalidProposal };
      case (?p) { p };
    };

    let assignment = switch (reviewerAssignments.get(reviewerPrincipal)) {
      case (null) { null };
      case (?assignments) {
        switch (assignments.get(proposal.topic)) {
          case (null) { null };
          case (?a) { ?a };
        };
      };
    };

    let reviewList = switch (reviews.get(proposalId)) {
      case (null) { return #invalidProposal };
      case (?revs) { revs };
    };

    var targetIndex : ?Nat = null;
    for (i in Nat.range(0, reviewList.size())) {
      if (Principal.equal(reviewList[i].reviewer.principal, reviewerPrincipal)) {
        targetIndex := ?i;
      };
    };

    let targetReview = switch (targetIndex) {
      case (null) { return #invalidReviewer };
      case (?i) { reviewList[i] };
    };

    let newStatus = switch (assignment) {
      case (null) { #volunteer };
      case (?a) {
        let isProposalInRange = proposal.creationDate >= a.startDate and proposal.creationDate <= a.endDate;
        if (isProposalInRange) {
          #paid;
        } else {
          #volunteer;
        };
      };
    };

    if (targetReview.status == newStatus) {
      return #alreadyCorrect;
    };

    let oldStatusText = switch (targetReview.status) {
      case (#paid) { "paid" };
      case (#volunteer) { "volunteer" };
    };
    let newStatusText = switch (newStatus) {
      case (#paid) { "paid" };
      case (#volunteer) { "volunteer" };
    };

    let updatedReview = {
      targetReview with
      status = newStatus
    };

    var allReviews : [Review] = [];
    for (i in Nat.range(0, reviewList.size())) {
      if (reviewList[i] == targetReview) {
        allReviews := allReviews.concat([updatedReview]);
      } else {
        allReviews := allReviews.concat([reviewList[i]]);
      };
    };

    reviews.add(proposalId, allReviews);

    writeAuditLog(
      caller,
      #fixReviewStatus,
      proposalId,
      proposal.title,
      reviewerPrincipal,
      reviewer.nickname,
      comment,
      ?oldStatusText,
      ?newStatusText,
    );

    #fixedReviewStatus;
  };

  // Proposal Queries
  public query func getProposals(topicFilter : ?Nat) : async [ProposalWithCounts] {
    let allProposals = proposals.values().toArray();
    let filtered = switch (topicFilter) {
      case (null) { allProposals };
      case (?topic) {
        allProposals.filter(func(p) { p.topic == topic })
      };
    };
    filtered.map<Proposal, ProposalWithCounts>(func(p) {
      let reviewList = switch (reviews.get(p.proposalId)) {
        case (null) { [] };
        case (?revs) { revs };
      };
      var adoptCount = 0;
      var rejectCount = 0;
      for (review in reviewList.vals()) {
        switch (review.recommendation) {
          case (#adopt) { adoptCount += 1 };
          case (#reject) { rejectCount += 1 };
        };
      };
      { p with adoptCount; rejectCount; totalReviewCount = adoptCount + rejectCount };
    });
  };

  public query func getProposal(proposalId : Nat) : async ?Proposal {
    proposals.get(proposalId);
  };

  public query func getAllProposalIds() : async [Nat] {
    proposals.keys().toArray();
  };

  public query func getRecommendationCounts(proposalId : Nat) : async (Nat, Nat) {
    let reviewList = switch (reviews.get(proposalId)) {
      case (null) { [] };
      case (?revs) { revs };
    };

    var adoptCount = 0;
    var rejectCount = 0;

    for (review in reviewList.vals()) {
      switch (review.recommendation) {
        case (#adopt) { adoptCount += 1 };
        case (#reject) { rejectCount += 1 };
      };
    };

    (adoptCount, rejectCount);
  };

  public query func getProposalReviews(proposalId : Nat) : async [Review] {
    let result = switch (reviews.get(proposalId)) {
      case (null) { [] };
      case (?revs) { revs };
    };
    result.sort(
      func(r1, r2) { Int.compare(r2.timestamp, r1.timestamp) }
    );
  };

  // Audit Log Queries
  public query func getAuditLog(page : Nat, pageSize : Nat) : async [AuditLogEntry] {
    let allEntries = auditLog.values().toArray();
    // Sort newest first by id (higher id = newer)
    let sorted = allEntries.sort(func(a, b) { Nat.compare(b.id, a.id) });
    let start = page * pageSize;
    if (start >= sorted.size()) {
      return [];
    };
    let end = Nat.min(start + pageSize, sorted.size());
    var result : [AuditLogEntry] = [];
    for (i in Nat.range(start, end)) {
      result := result.concat([sorted[i]]);
    };
    result;
  };

  public query func getAuditLogSize() : async Nat {
    auditLog.size();
  };

  // Proposal Sync - Admin or authorized submitter
  public shared ({ caller }) func saveExternalProposal(
    newProposal : Proposal
  ) : async Bool {
    if (not isAdminPrincipal(caller) and not isAuthorizedProposalSubmitter(caller)) {
      Runtime.trap("Unauthorized: Only admins or the authorized proposal submitter can sync proposals");
    };

    switch (proposals.get(newProposal.proposalId)) {
      case (null) {
        proposals.add(newProposal.proposalId, newProposal);
        true;
      };
      case (?existing) {
        false;
      };
    };
  };

  public shared ({ caller }) func saveExternalProposals(newProposals : [Proposal]) : async [Nat] {
    if (not isAdminPrincipal(caller) and not isAuthorizedProposalSubmitter(caller)) {
      Runtime.trap("Unauthorized: Only admins or the authorized proposal submitter can sync proposals");
    };

    var addedProposalIds : [Nat] = [];
    for (p in newProposals.values()) {
      switch (proposals.get(p.proposalId)) {
        case (null) {
          proposals.add(p.proposalId, p);
          addedProposalIds := addedProposalIds.concat([p.proposalId]);
        };
        case (?existing) {};
      };
    };
    addedProposalIds;
  };

  // Topic Queries
  public query func getTopicDisplayName(topicId : Nat) : async Text {
    TopicMapper.displayNameFromTopicId(topicId);
  };

  public query func getAllTopics() : async [(Nat, Text)] {
    [
      (
        TopicMapper.TOPIC_IC_OS_VERSION_ELECTION,
        TopicMapper.displayNameFromTopicId(TopicMapper.TOPIC_IC_OS_VERSION_ELECTION),
      ),
      (
        TopicMapper.TOPIC_APPLICATION_CANISTER_MANAGEMENT,
        TopicMapper.displayNameFromTopicId(TopicMapper.TOPIC_APPLICATION_CANISTER_MANAGEMENT),
      ),
      (
        TopicMapper.TOPIC_PROTOCOL_CANISTER_MANAGEMENT,
        TopicMapper.displayNameFromTopicId(TopicMapper.TOPIC_PROTOCOL_CANISTER_MANAGEMENT),
      ),
    ];
  };

  // Clear proposals
  public shared ({ caller }) func clearAllProposals() : async () {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can clear proposals");
    };

    for (proposalId in proposals.keys()) {
      proposals.remove(proposalId);
    };
    for (proposalId in reviews.keys()) {
      reviews.remove(proposalId);
    };
  };

  // Check if caller is a reviewer
  public query ({ caller }) func isReviewer() : async Bool {
    if (caller.isAnonymous()) {
      return false;
    };
    isReviewerPrincipal(caller);
  };

  // HTTP Outcall for Individual Proposal Fetch
  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  public shared ({ caller }) func fetchIndividualProposal(proposalId : Nat) : async Text {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can fetch individual proposals");
    };

    let url = "https://ic-api.internetcomputer.org/api/v3/proposals/" # proposalId.toText();
    await OutCall.httpGetRequest(url, [], transform);
  };
};
