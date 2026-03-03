export enum Role {
  CLIENT = "CLIENT",
  FREELANCER = "FREELANCER",
  ADMIN = "ADMIN",
}

export enum MilestoneStatus {
  PENDING_FUNDING = "PENDING_FUNDING",
  FUNDED = "FUNDED",
  IN_PROGRESS = "IN_PROGRESS",
  SUBMITTED = "SUBMITTED",
  ACCEPTED = "ACCEPTED",
  RELEASED = "RELEASED",
  DISPUTED = "DISPUTED",
  REFUNDED = "REFUNDED",
  SPLIT_RESOLVED = "SPLIT_RESOLVED",
}

export enum DisputeStatus {
  OPEN = "OPEN",
  RESOLVED = "RESOLVED",
}

export enum DisputeResolution {
  RELEASE_TO_FREELANCER = "RELEASE_TO_FREELANCER",
  REFUND_TO_CLIENT = "REFUND_TO_CLIENT",
  SPLIT = "SPLIT",
}

export type ID = string;

export interface User {
  id: ID;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeliverableMetadata {
  name: string;
  size?: number;
  mimeType?: string;
  uri: string;
}

export interface Milestone {
  id: ID;
  projectId: ID;
  title: string;
  amountBigint: string;
  currency: string;
  status: MilestoneStatus;
  dueDate?: string;
  submittedAt?: string;
  acceptedAt?: string;
  releasedAt?: string;
  description?: string;
  notes?: string;
  deliverables?: DeliverableMetadata[];
  paymentIntentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: ID;
  title: string;
  description: string;
  status: string;
  currency: string;
  clientId: ID;
  freelancerId: ID;
  freelancerEmail?: string;
  client?: Pick<User, "id" | "name" | "email">;
  freelancer?: Pick<User, "id" | "name" | "email">;
  milestones: Milestone[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Dispute {
  id: ID;
  milestoneId: ID;
  status: DisputeStatus;
  reason: string;
  createdAt: string;
  projectId?: ID;
  resolution?: DisputeResolution;
  splitPercent?: number;
  updatedAt?: string;
  raisedById?: ID;
  raisedByRole?: Role;
  milestone?: Milestone;
  project?: Project;
}
