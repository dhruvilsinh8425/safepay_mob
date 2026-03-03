import { api } from "../lib/api";
import type {
  ListDisputesResponse,
  ResolveDisputeRequest,
  ResolveDisputeResponse,
} from "../types/api";
import {
  DisputeStatus,
  type Dispute,
  type DisputeResolution,
} from "../types/domain";

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

export function mapDispute(apiDispute: unknown): Dispute {
  const source = toRecord(apiDispute);
  const statusRaw = toStringOr(
    pickField<unknown>(source, ["status", "disputeStatus", "dispute_status"]),
    DisputeStatus.OPEN,
  ).toUpperCase();

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
    status: statusRaw === DisputeStatus.RESOLVED ? DisputeStatus.RESOLVED : DisputeStatus.OPEN,
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

function mapDisputesPayload(payload: unknown): Dispute[] {
  if (Array.isArray(payload)) {
    return payload.map(mapDispute);
  }
  const source = toRecord(payload);
  const items = pickField<unknown[]>(source, ["disputes", "items", "results", "data"]);
  if (Array.isArray(items)) {
    return items.map(mapDispute);
  }
  return [];
}

export async function listDisputes(): Promise<ListDisputesResponse> {
  const response = await api.get<unknown>("/disputes");
  return mapDisputesPayload(unwrapData<unknown>(response.data));
}

export async function resolveDispute(
  disputeId: string,
  payload: ResolveDisputeRequest,
): Promise<ResolveDisputeResponse> {
  const response = await api.patch<unknown>(`/disputes/${disputeId}/resolve`, payload);
  const unwrapped = unwrapData<unknown>(response.data);
  const source = toRecord(unwrapped);
  const disputeRaw = pickField<unknown>(source, ["dispute", "item"]) ?? unwrapped;
  return mapDispute(disputeRaw);
}
