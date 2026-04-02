# NNS Technical Review Hub

## Current State
- Full-stack app with Motoko backend and React/TypeScript frontend
- Proposals are synced from the NNS Dashboard API
- Reviewers are managed by admins (add/edit/remove)
- Reviews can be submitted by registered reviewers before the initial deadline
- Admins can fix review status, edit review links, and add proposals
- Admin features: manage reviewers, admins, grant assignments, authorized proposal submitter
- Public pages: Proposals overview, Reviewer profiles, Proposal detail

## Requested Changes (Diff)

### Add
- **`AuditLogEntry` type in backend**: timestamp, admin principal, action type (add_review / remove_review / edit_review_link / fix_review_status), proposal ID, reviewer nickname + principal, mandatory admin comment, before/after snapshot fields
- **`auditLog` stable storage** (ordered list, newest-first for queries)
- **`adminAddReview` backend function**: admin-only, picks any registered reviewer, all review fields required (link + recommendation), bypasses deadline, writes audit log entry
- **`adminRemoveReview` backend function**: admin-only, permanently removes review, writes audit log entry
- **Updated `updateReviewLink`**: now accepts mandatory `comment` parameter, writes audit log entry
- **Updated `fixReviewStatus`**: now accepts mandatory `comment` parameter, writes audit log entry
- **`getAuditLog(page, pageSize)` query**: public, paginated, sorted newest-first
- **`getAuditLogSize` query**: public, returns total count for pagination
- **Admin UI - Add Review button** in Proposal Detail View: opens modal to pick reviewer + enter link + recommendation + comment
- **Admin UI - Remove button** per review in Proposal Detail View: opens confirmation modal requiring comment
- **Comment field** added to existing Edit Link and Fix Status dialogs (mandatory)
- **New Audit Log page**: public, accessible from main navigation, paginated table of all logged actions
- **Notice on Audit Log page**: states when audit log was introduced and that past actions are not captured

### Modify
- `updateReviewLink` backend: add `comment: Text` parameter
- `fixReviewStatus` backend: add `comment: Text` parameter
- `backend.d.ts`: add AuditLogEntry type, new function signatures
- `useQueries.ts`: add hooks for adminAddReview, adminRemoveReview, getAuditLog; update useUpdateReviewLink and useFixReviewStatus to pass comment
- `ProposalDetailPage.tsx`: add admin add/remove review UI and comment fields in existing dialogs
- `App.tsx`: add audit log page route
- `Header.tsx`: add Audit Log navigation tab (public)

### Remove
- Nothing removed

## Implementation Plan
1. Update `main.mo`: add AuditLogEntry type, auditLog storage, adminAddReview, adminRemoveReview, update updateReviewLink + fixReviewStatus signatures, add getAuditLog + getAuditLogSize queries
2. Update `backend.d.ts` with new types and function signatures
3. Update `useQueries.ts` with new hooks and updated existing hooks
4. Update `ProposalDetailPage.tsx` with admin add/remove review UI + comment fields in all admin dialogs
5. Create `AuditLogPage.tsx` with paginated audit log table and introductory notice
6. Update `App.tsx` to add audit log route
7. Update `Header.tsx` to add Audit Log tab in navigation
