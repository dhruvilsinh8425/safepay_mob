import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Alert } from "react-native";

import { useOnlineStatus } from "../lib/netinfo";
import {
  acceptMilestone,
  createMilestone,
  disputeMilestone,
  fundMilestone,
  submitMilestone,
} from "../services/milestones.service";
import {
  cacheProjectFreelancerEmail,
  cacheProjectMilestones,
  createProject,
} from "../services/projects.service";
import { resolveDispute } from "../services/disputes.service";
import type {
  CreateProjectRequest,
  ResolveDisputeRequest,
  SubmitMilestoneRequest,
} from "../types/api";
import { disputesQueryKey } from "./useDisputes";
import { getProjectQueryKey } from "./useProject";
import { projectsQueryKey } from "./useProjects";

interface ProjectScopedPayload {
  projectId: string;
}

interface FundMilestonePayload extends ProjectScopedPayload {
  milestoneId: string;
}

interface SubmitMilestonePayload extends ProjectScopedPayload {
  milestoneId: string;
  data: SubmitMilestoneRequest;
}

interface AcceptMilestonePayload extends ProjectScopedPayload {
  milestoneId: string;
}

interface DisputeMilestonePayload extends ProjectScopedPayload {
  milestoneId: string;
  reason: string;
}

interface ResolveDisputePayload extends ResolveDisputeRequest {
  disputeId: string;
  projectId?: string;
}

export function useMutations() {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  const ensureOnline = () => {
    if (!isOnline) {
      Alert.alert("Offline", "You're offline. Please reconnect and try again.");
      throw new Error("Offline");
    }
  };

  const logMutationError = (action: string, error: unknown) => {
    if (!__DEV__) {
      return;
    }
    if (axios.isAxiosError(error)) {
      console.log(`[mutations.${action}] error`, {
        status: error.response?.status,
        data: error.response?.data,
      });
      return;
    }
    console.log(`[mutations.${action}] error`, error);
  };

  const createProjectMutation = useMutation({
    mutationFn: async (payload: CreateProjectRequest) => {
      ensureOnline();
      const project = await createProject(payload);
      cacheProjectFreelancerEmail(project.id, payload.freelancerEmail);
      const createdMilestones = [];
      for (const milestone of payload.milestones) {
        const created = await createMilestone(project.id, milestone);
        createdMilestones.push(created);
      }
      cacheProjectMilestones(project.id, createdMilestones);
      return project;
    },
    onSuccess: async (project) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
        queryClient.invalidateQueries({ queryKey: getProjectQueryKey(project.id) }),
      ]);
    },
  });

  const fundMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId }: FundMilestonePayload) => {
      ensureOnline();
      return fundMilestone(milestoneId);
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getProjectQueryKey(variables.projectId) }),
        queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
      ]);
    },
  });

  const submitMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, data }: SubmitMilestonePayload) => {
      ensureOnline();
      return submitMilestone(milestoneId, data);
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getProjectQueryKey(variables.projectId) }),
        queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
      ]);
    },
  });

  const acceptMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, projectId }: AcceptMilestonePayload) => {
      ensureOnline();
      if (__DEV__) {
        console.log("[mutations.accept] request", { projectId, milestoneId });
      }
      return acceptMilestone(milestoneId);
    },
    onSuccess: async (response, variables) => {
      if (__DEV__) {
        console.log("[mutations.accept] response milestone status", {
          projectId: variables.projectId,
          milestoneId: variables.milestoneId,
          status: response?.milestone?.status,
        });
      }

      await queryClient.invalidateQueries({
        queryKey: getProjectQueryKey(variables.projectId),
      });
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey });
    },
    onError: (error) => {
      logMutationError("accept", error);
    },
  });

  const disputeMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, reason, projectId }: DisputeMilestonePayload) => {
      ensureOnline();
      if (__DEV__) {
        console.log("[mutations.dispute] request", {
          projectId,
          milestoneId,
          payload: { reason },
        });
      }
      return disputeMilestone(milestoneId, { reason });
    },
    onSuccess: async (response, variables) => {
      if (__DEV__) {
        console.log("[mutations.dispute] response payload", {
          projectId: variables.projectId,
          milestoneId: variables.milestoneId,
          milestoneStatus: response?.milestone?.status,
          disputeStatus: response?.dispute?.status,
          disputeId: response?.dispute?.id,
        });
      }

      await queryClient.invalidateQueries({
        queryKey: getProjectQueryKey(variables.projectId),
      });
      await queryClient.invalidateQueries({ queryKey: disputesQueryKey });
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey });
    },
    onError: (error) => {
      logMutationError("dispute", error);
    },
  });

  const resolveDisputeMutation = useMutation({
    mutationFn: async ({ disputeId, projectId: _projectId, ...data }: ResolveDisputePayload) => {
      ensureOnline();
      return resolveDispute(disputeId, data);
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: disputesQueryKey }),
        queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
      ]);
      if (variables.projectId) {
        await queryClient.invalidateQueries({
          queryKey: getProjectQueryKey(variables.projectId),
        });
      }
    },
  });

  return {
    isOffline: !isOnline,
    createProject: createProjectMutation,
    fundMilestoneMutation,
    submitMilestoneMutation,
    acceptMilestoneMutation,
    disputeMilestoneMutation,
    resolveDisputeMutation,

    // Backward-compatible aliases
    fund: fundMilestoneMutation,
    submit: submitMilestoneMutation,
    accept: acceptMilestoneMutation,
    dispute: disputeMilestoneMutation,
    resolveDispute: resolveDisputeMutation,
  };
}
