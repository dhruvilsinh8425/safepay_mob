import type { Dispute, DisputeResolution, Milestone, Project, Role, User } from "./domain";

export interface ApiErrorPayload {
  message: string | string[];
  error?: string;
  statusCode?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: Exclude<Role, Role.ADMIN>;
}

export interface RegisterResponse {
  user: User;
  tokens: AuthTokens;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
}

export type MeResponse = User;

export interface CreateMilestoneRequest {
  title: string;
  description?: string;
  amount: number;
  dueDate: string;
}

export interface CreateProjectRequest {
  title: string;
  description: string;
  freelancerEmail: string;
  milestones: CreateMilestoneRequest[];
}

export type CreateProjectResponse = Project;
export type ListProjectsResponse = Project[];
export type GetProjectResponse = Project;

export interface FundMilestoneResponse {
  checkoutUrl: string;
  paymentIntentId?: string;
}

export interface SubmitMilestoneRequest {
  notes: string;
  files: Array<
    | string
    | {
        uri?: string;
        name?: string;
        url?: string;
        fileUrl?: string;
      }
  >;
}

export interface SubmitMilestoneResponse {
  milestone: Milestone;
}

export interface AcceptMilestoneResponse {
  milestone: Milestone;
}

export interface DisputeMilestoneRequest {
  reason: string;
}

export interface DisputeMilestoneResponse {
  dispute: Dispute;
  milestone?: Milestone;
}
export type ListDisputesResponse = Dispute[];

export interface ResolveDisputeRequest {
  resolution: DisputeResolution;
  splitPercent?: number;
}

export type ResolveDisputeResponse = Dispute;

export interface HealthResponse {
  status: string;
  timestamp?: string;
}
