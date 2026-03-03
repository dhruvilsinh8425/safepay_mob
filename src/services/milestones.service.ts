import { api } from "../lib/api";
import type {
  AcceptMilestoneResponse,
  CreateMilestoneRequest,
  DisputeMilestoneRequest,
  DisputeMilestoneResponse,
  FundMilestoneResponse,
  SubmitMilestoneRequest,
  SubmitMilestoneResponse,
} from "../types/api";
import {
  DisputeStatus,
  type Dispute,
  type DisputeResolution,
  type Milestone,
} from "../types/domain";
import { mapMilestone } from "./projects.service";

type UnknownRecord = Record<string, unknown>;

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

function normalizeFilesToStrings(files: unknown): string[] {
  if (!Array.isArray(files)) return [];

  return files
    .map((f) => {
      if (typeof f === "string") return f;
      if (f && typeof f === "object") {
        const rec = f as {
          uri?: unknown;
          name?: unknown;
          url?: unknown;
          fileUrl?: unknown;
        };
        if (typeof rec.url === "string" && rec.url.length) return rec.url;
        if (typeof rec.fileUrl === "string" && rec.fileUrl.length) return rec.fileUrl;
        if (typeof rec.uri === "string" && rec.uri.length) return rec.uri;
        if (typeof rec.name === "string" && rec.name.length) return rec.name;
      }
      return null;
    })
    .filter((x): x is string => typeof x === "string" && x.length > 0);
}

function normalizeFilesToUrlObjects(files: unknown): Array<{ url: string }> {
  return normalizeFilesToStrings(files).map((value) => ({ url: value }));
}

function mapDispute(apiDispute: unknown): Dispute {
  const source = toRecord(apiDispute);
  const status = toStringOr(
    pickField<unknown>(source, ["status", "disputeStatus", "dispute_status"]),
    DisputeStatus.OPEN,
  ).toUpperCase();
  const normalizedStatus =
    status === DisputeStatus.RESOLVED ? DisputeStatus.RESOLVED : DisputeStatus.OPEN;

  const resolutionRaw = toStringOr(
    pickField<unknown>(source, ["resolution", "resolvedAs", "resolved_as"]),
    "",
  ).toUpperCase();

  const resolution = (["RELEASE_TO_FREELANCER", "REFUND_TO_CLIENT", "SPLIT"] as const).includes(
    resolutionRaw as DisputeResolution,
  )
    ? (resolutionRaw as DisputeResolution)
    : undefined;

  return {
    id: toStringOr(pickField<unknown>(source, ["id", "_id"]), ""),
    milestoneId: toStringOr(
      pickField<unknown>(source, ["milestoneId", "milestone_id"]),
      "",
    ),
    status: normalizedStatus,
    reason: toStringOr(pickField<unknown>(source, ["reason", "message"]), ""),
    createdAt: toStringOr(
      pickField<unknown>(source, ["createdAt", "created_at"]),
      new Date().toISOString(),
    ),
    projectId:
      toStringOr(pickField<unknown>(source, ["projectId", "project_id"]), "") || undefined,
    resolution,
    splitPercent: Number(
      pickField<unknown>(source, ["splitPercent", "split_percent"]) ?? 0,
    ) || undefined,
    updatedAt:
      toStringOr(pickField<unknown>(source, ["updatedAt", "updated_at"]), "") || undefined,
  };
}

function getMilestoneFromPayload(payload: unknown): Milestone {
  const source = toRecord(payload);
  const milestoneRaw =
    pickField<unknown>(source, ["milestone", "updatedMilestone", "item"]) ?? payload;
  return mapMilestone(milestoneRaw);
}

function getOptionalMilestoneFromPayload(payload: unknown): Milestone | undefined {
  const source = toRecord(payload);
  const milestoneRaw = pickField<unknown>(source, ["milestone", "updatedMilestone", "item"]);
  return milestoneRaw ? mapMilestone(milestoneRaw) : undefined;
}

export async function fundMilestone(milestoneId: string): Promise<FundMilestoneResponse> {
  const parseFundPayload = (payload: unknown): FundMilestoneResponse => {
    const source = toRecord(payload);
    return {
      checkoutUrl: toStringOr(
        pickField<unknown>(source, ["checkoutUrl", "checkout_url", "url"]),
        "",
      ),
      paymentIntentId:
        toStringOr(
          pickField<unknown>(source, ["paymentIntentId", "payment_intent_id"]),
          "",
        ) || undefined,
    };
  };

  try {
    const response = await api.post<unknown>(`/payments/milestones/${milestoneId}/checkout`);
    return parseFundPayload(unwrapData<unknown>(response.data));
  } catch {
    const response = await api.post<unknown>(`/milestones/${milestoneId}/fund`);
    return parseFundPayload(unwrapData<unknown>(response.data));
  }
}

export async function createMilestone(
  projectId: string,
  payload: CreateMilestoneRequest,
): Promise<Milestone> {
  const amountCents = Math.round(Number(payload.amount) * 100);
  const response = await api.post<unknown>(`/milestones/project/${projectId}`, {
    title: payload.title,
    description: payload.description,
    amountCents: Number.isFinite(amountCents) ? amountCents : 0,
    currency: "INR",
  });
  return getMilestoneFromPayload(unwrapData<unknown>(response.data));
}

export async function getMilestoneById(milestoneId: string): Promise<Milestone> {
  const response = await api.get<unknown>(`/milestones/${milestoneId}`);
  return getMilestoneFromPayload(unwrapData<unknown>(response.data));
}

export async function submitMilestone(
  milestoneId: string,
  payload: SubmitMilestoneRequest,
): Promise<SubmitMilestoneResponse> {
  const safePayload: { notes: string; files: Array<{ url: string }> } = {
    notes: typeof payload.notes === "string" ? payload.notes.trim() : "",
    // Backend validation rejects `name`/`uri` keys. Send only canonical `url`.
    files: normalizeFilesToUrlObjects(payload.files),
  };

  const response = await api.post<unknown>(
    `/milestones/${milestoneId}/submit`,
    safePayload,
  );

  return { milestone: getMilestoneFromPayload(unwrapData<unknown>(response.data)) };
}

export async function acceptMilestone(milestoneId: string): Promise<AcceptMilestoneResponse> {
  const response = await api.post<unknown>(`/milestones/${milestoneId}/accept`);
  const unwrapped = unwrapData<unknown>(response.data);
  return { milestone: getMilestoneFromPayload(unwrapped) };
}

export async function disputeMilestone(
  milestoneId: string,
  payload: DisputeMilestoneRequest,
): Promise<DisputeMilestoneResponse> {
  const safePayload = { reason: payload.reason.trim() };
  const response = await api.post<unknown>(`/milestones/${milestoneId}/dispute`, safePayload);
  const unwrapped = unwrapData<unknown>(response.data);
  const source = toRecord(unwrapped);

  const disputeRaw = pickField<unknown>(source, ["dispute", "item"]) ?? unwrapped;
  const milestone = getOptionalMilestoneFromPayload(unwrapped);

  return {
    dispute: mapDispute(disputeRaw),
    milestone,
  };
}

