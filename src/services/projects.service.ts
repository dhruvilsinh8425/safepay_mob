import { api } from "../lib/api";
import type {
  CreateProjectRequest,
  CreateProjectResponse,
  GetProjectResponse,
  ListProjectsResponse,
} from "../types/api";
import { MilestoneStatus, type Milestone, type Project } from "../types/domain";

type UnknownRecord = Record<string, unknown>;
const projectFreelancerEmailCache = new Map<string, string>();
const UUID_V4_OR_V1_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function cacheProjectMilestones(projectId: string, milestones: Milestone[]): void {
  // Server-truth-first: milestone cache merging is intentionally disabled.
  void projectId;
  void milestones;
}

export function cacheProjectFreelancerEmail(projectId: string, freelancerEmail: string): void {
  const normalized = freelancerEmail.trim().toLowerCase();
  if (!projectId || !normalized) {
    return;
  }
  projectFreelancerEmailCache.set(projectId, normalized);
}

function unwrapData<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as { data?: unknown }).data !== undefined
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function toRecord(value: unknown): UnknownRecord {
  if (value && typeof value === "object") {
    return value as UnknownRecord;
  }
  return {};
}

function pickField<T>(record: UnknownRecord, keys: string[]): T | undefined {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key] as T;
    }
  }
  return undefined;
}

function toStringOr(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return fallback;
}

function normalizeMilestoneStatus(value: unknown): MilestoneStatus {
  const normalized = toStringOr(value, "").toUpperCase();
  const allowedStatuses: readonly MilestoneStatus[] = [
    MilestoneStatus.PENDING_FUNDING,
    MilestoneStatus.FUNDED,
    MilestoneStatus.IN_PROGRESS,
    MilestoneStatus.SUBMITTED,
    MilestoneStatus.ACCEPTED,
    MilestoneStatus.DISPUTED,
    MilestoneStatus.RELEASED,
    MilestoneStatus.REFUNDED,
    MilestoneStatus.SPLIT_RESOLVED,
  ];
  if (allowedStatuses.includes(normalized as MilestoneStatus)) {
    return normalized as MilestoneStatus;
  }
  return MilestoneStatus.PENDING_FUNDING;
}

function normalizeCurrency(value: unknown, fallback = "INR"): string {
  const currency = toStringOr(value, fallback).trim().toUpperCase();
  return currency || fallback;
}

function normalizeAmountBigint(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  return "0";
}

export function mapMilestone(apiMilestone: unknown, projectIdFallback = ""): Milestone {
  const source = toRecord(apiMilestone);
  const project = toRecord(pickField<unknown>(source, ["project"]));
  const rawStatus = pickField<unknown>(source, [
    "status",
    "milestoneStatus",
    "milestone_status",
  ]);

  const id = toStringOr(
    pickField<unknown>(source, ["id", "_id", "milestoneId", "milestone_id"]),
    "",
  );
  const projectId = toStringOr(
    pickField<unknown>(source, ["projectId", "project_id"]) ??
      pickField<unknown>(project, ["id", "_id"]),
    projectIdFallback,
  );
  const amountBigint = normalizeAmountBigint(
    pickField<unknown>(source, [
      "amountBigint",
      "amount_bigint",
      "amountMinor",
      "amount_minor",
      "amountCents",
      "amount_cents",
      "amount",
    ]),
  );

  if (__DEV__) {
    console.log("[mapMilestone] raw status", {
      id,
      rawStatus,
    });
  }

  return {
    id,
    projectId,
    title: toStringOr(pickField<unknown>(source, ["title", "name"]), "Untitled Milestone"),
    amountBigint,
    currency: normalizeCurrency(
      pickField<unknown>(source, ["currency"]) ??
        pickField<unknown>(project, ["currency"]),
    ),
    status: normalizeMilestoneStatus(
      rawStatus,
    ),
    dueDate: toStringOr(
      pickField<unknown>(source, ["dueDate", "due_date", "deadline"]),
      "",
    ) || undefined,
    submittedAt: toStringOr(
      pickField<unknown>(source, ["submittedAt", "submitted_at"]),
      "",
    ) || undefined,
    acceptedAt: toStringOr(
      pickField<unknown>(source, ["acceptedAt", "accepted_at"]),
      "",
    ) || undefined,
    releasedAt: toStringOr(
      pickField<unknown>(source, ["releasedAt", "released_at"]),
      "",
    ) || undefined,
    description:
      toStringOr(pickField<unknown>(source, ["description"]), "") || undefined,
    notes: toStringOr(pickField<unknown>(source, ["notes"]), "") || undefined,
    paymentIntentId:
      toStringOr(
        pickField<unknown>(source, ["paymentIntentId", "payment_intent_id"]),
        "",
      ) || undefined,
    deliverables: pickField<Milestone["deliverables"]>(source, [
      "deliverables",
      "files",
      "attachments",
    ]),
    createdAt: toStringOr(
      pickField<unknown>(source, ["createdAt", "created_at"]),
      "",
    ) || undefined,
    updatedAt: toStringOr(
      pickField<unknown>(source, ["updatedAt", "updated_at"]),
      "",
    ) || undefined,
  };
}

export function mapProject(apiProject: unknown): Project {
  const source = toRecord(apiProject);
  const freelancer = toRecord(pickField<unknown>(source, ["freelancer"]));
  const client = toRecord(pickField<unknown>(source, ["client"]));

  const projectId = toStringOr(
    pickField<unknown>(source, ["id", "_id", "projectId", "project_id"]),
    "",
  );
  const milestonesRaw = pickField<unknown[]>(source, [
    "milestones",
    "milestone_list",
    "items",
    "projectMilestones",
    "project_milestones",
  ]);
  const apiMilestones = Array.isArray(milestonesRaw)
    ? milestonesRaw.map((item) => mapMilestone(item, projectId))
    : [];
  const milestones = apiMilestones;

  const fallbackCurrency =
    normalizeCurrency(pickField<unknown>(source, ["currency"]), "") ||
    milestones[0]?.currency ||
    "INR";

  return {
    id: projectId,
    title: toStringOr(pickField<unknown>(source, ["title", "name"]), "Untitled Project"),
    description: toStringOr(pickField<unknown>(source, ["description"]), ""),
    status: toStringOr(
      pickField<unknown>(source, ["status", "projectStatus", "project_status"]),
      "ACTIVE",
    ),
    currency: normalizeCurrency(fallbackCurrency),
    clientId: toStringOr(
      pickField<unknown>(source, ["clientId", "client_id"]) ??
        pickField<unknown>(client, ["id", "_id"]),
      "",
    ),
    freelancerId: toStringOr(
      pickField<unknown>(source, ["freelancerId", "freelancer_id"]) ??
        pickField<unknown>(freelancer, ["id", "_id"]),
      "",
    ),
    freelancerEmail:
      toStringOr(
        pickField<unknown>(source, ["freelancerEmail", "freelancer_email"]) ??
          pickField<unknown>(freelancer, ["email"]),
        "",
      ) ||
      projectFreelancerEmailCache.get(projectId) ||
      undefined,
    client: Object.keys(client).length
      ? {
          id: toStringOr(pickField<unknown>(client, ["id", "_id"]), ""),
          name: toStringOr(pickField<unknown>(client, ["name"]), ""),
          email: toStringOr(pickField<unknown>(client, ["email"]), ""),
        }
      : undefined,
    freelancer: Object.keys(freelancer).length
      ? {
          id: toStringOr(pickField<unknown>(freelancer, ["id", "_id"]), ""),
          name: toStringOr(pickField<unknown>(freelancer, ["name"]), ""),
          email: toStringOr(pickField<unknown>(freelancer, ["email"]), ""),
        }
      : undefined,
    milestones,
    createdAt: toStringOr(
      pickField<unknown>(source, ["createdAt", "created_at"]),
      "",
    ) || undefined,
    updatedAt: toStringOr(
      pickField<unknown>(source, ["updatedAt", "updated_at"]),
      "",
    ) || undefined,
  };
}

function mapProjectListPayload(payload: unknown): Project[] {
  if (Array.isArray(payload)) {
    return payload.map(mapProject);
  }
  const source = toRecord(payload);
  const candidates = pickField<unknown[]>(source, [
    "projects",
    "items",
    "results",
    "data",
  ]);
  if (Array.isArray(candidates)) {
    return candidates.map(mapProject);
  }
  return [];
}

function mapSingleProjectPayload(payload: unknown): Project {
  const source = toRecord(payload);
  const candidate =
    pickField<unknown>(source, ["project", "item", "result", "data"]) ?? payload;
  return mapProject(candidate);
}

function mapProjectMilestonesPayload(payload: unknown, projectId: string): Milestone[] {
  if (Array.isArray(payload)) {
    return payload.map((item) => mapMilestone(item, projectId));
  }

  const source = toRecord(payload);
  const candidates = pickField<unknown[]>(source, [
    "milestones",
    "items",
    "results",
    "data",
    "projectMilestones",
    "project_milestones",
  ]);

  if (Array.isArray(candidates)) {
    return candidates.map((item) => mapMilestone(item, projectId));
  }

  return [];
}

async function fetchProjectMilestones(projectId: string): Promise<Milestone[]> {
  const milestoneEndpoints = [
    `/milestones/project/${projectId}`,
    `/milestones?projectId=${projectId}`,
  ];

  for (const endpoint of milestoneEndpoints) {
    try {
      const response = await api.get<unknown>(endpoint);
      const mapped = mapProjectMilestonesPayload(unwrapData<unknown>(response.data), projectId);
      if (mapped.length > 0) {
        return mapped;
      }
    } catch {
      // Try next endpoint shape.
    }
  }

  return [];
}

export async function listProjects(): Promise<ListProjectsResponse> {
  const response = await api.get<unknown>("/projects");
  return mapProjectListPayload(unwrapData<unknown>(response.data));
}

export async function createProject(
  payload: CreateProjectRequest,
): Promise<CreateProjectResponse> {
  const backendPayload: { title: string; description: string; freelancerId?: string } = {
    title: payload.title,
    description: payload.description,
  };
  const candidateFreelancer = payload.freelancerEmail.trim();
  if (candidateFreelancer && !UUID_V4_OR_V1_REGEX.test(candidateFreelancer)) {
    throw new Error("Freelancer must be a valid user ID (UUID), not email.");
  }
  if (UUID_V4_OR_V1_REGEX.test(candidateFreelancer)) {
    backendPayload.freelancerId = candidateFreelancer;
  }
  const response = await api.post<unknown>("/projects", backendPayload);
  return mapSingleProjectPayload(unwrapData<unknown>(response.data));
}

export async function getProjectById(projectId: string): Promise<GetProjectResponse> {
  const response = await api.get<unknown>(`/projects/${projectId}`);
  const project = mapSingleProjectPayload(unwrapData<unknown>(response.data));

  if (project.milestones.length > 0) {
    return project;
  }

  const fallbackMilestones = await fetchProjectMilestones(projectId);
  if (fallbackMilestones.length === 0) {
    return project;
  }

  return {
    ...project,
    milestones: fallbackMilestones,
  };
}
