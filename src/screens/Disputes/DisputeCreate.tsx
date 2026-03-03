import { useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import axios from "axios";
import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";

import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { Input } from "../../components/Input";
import { Skeleton } from "../../components/Skeleton";
import { useAuth } from "../../hooks/useAuth";
import { disputesQueryKey } from "../../hooks/useDisputes";
import { useMutations } from "../../hooks/useMutations";
import { getProjectQueryKey, useProject } from "../../hooks/useProject";
import { getApiErrorMessage } from "../../lib/api";
import { canDisputeMilestone } from "../../lib/guards";
import type { AppStackParamList } from "../../navigation/AppNavigator";
import { getMilestoneById } from "../../services/milestones.service";
import { MilestoneStatus } from "../../types/domain";

type Props = NativeStackScreenProps<AppStackParamList, "DisputeCreate">;

export function DisputeCreate({ navigation, route }: Props) {
  const { projectId, milestoneId } = route.params;
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const { disputeMilestoneMutation, isOffline } = useMutations();
  const projectQuery = useProject(projectId);

  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const milestone = projectQuery.data?.milestones.find((item) => item.id === milestoneId);

  const resolveLatestMilestoneStatus = async (): Promise<MilestoneStatus> => {
    const latestMilestone = await getMilestoneById(milestoneId);
    if (__DEV__) {
      console.log("[DisputeCreate] latest milestone status", {
        projectId,
        milestoneId,
        status: latestMilestone.status,
      });
    }
    return latestMilestone.status;
  };

  const finalizeSuccess = async () => {
    await queryClient.invalidateQueries({ queryKey: getProjectQueryKey(projectId) });
    await queryClient.invalidateQueries({ queryKey: disputesQueryKey });
    Alert.alert("Dispute created", "The dispute has been raised.");
    navigation.goBack();
  };

  const isSafeDisputeRetryError = (error: unknown): boolean => {
    if (!axios.isAxiosError(error)) {
      return false;
    }
    const status = error.response?.status ?? 0;
    return status === 400 || status === 409;
  };

  const submitDispute = async () => {
    if (disputeMilestoneMutation.isPending) {
      return;
    }
    setErrorMessage(null);
    const trimmedReason = reason.trim();
    const submitPayload = {
      projectId,
      milestoneId,
      reason: trimmedReason,
    };

    const sendDispute = async () => {
      if (__DEV__) {
        console.log("[DisputeCreate] dispute request payload", submitPayload);
      }
      return disputeMilestoneMutation.mutateAsync(submitPayload);
    };

    try {
      const latestStatus = await resolveLatestMilestoneStatus();
      if (!canDisputeMilestone(role, latestStatus)) {
        setErrorMessage(`Milestone is already ${latestStatus}; dispute not allowed.`);
        return;
      }

      await sendDispute();
      await finalizeSuccess();
    } catch (error) {
      if (!isSafeDisputeRetryError(error)) {
        setErrorMessage(getApiErrorMessage(error));
        return;
      }

      try {
        const latestStatus = await resolveLatestMilestoneStatus();
        if (!canDisputeMilestone(role, latestStatus)) {
          setErrorMessage(`Milestone is already ${latestStatus}; dispute not allowed.`);
          return;
        }
        if (__DEV__) {
          console.log("[DisputeCreate] retrying dispute once after status sync");
        }
        await sendDispute();
        await finalizeSuccess();
      } catch (retryError) {
        setErrorMessage(getApiErrorMessage(retryError));
      }
    }
  };

  const confirmSubmitDispute = () => {
    Alert.alert("Raise dispute?", "This will pause release.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Raise Dispute",
        style: "destructive",
        onPress: () => {
          void submitDispute();
        },
      },
    ]);
  };

  if (projectQuery.isLoading) {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="mt-4 h-56 w-full" />
      </View>
    );
  }

  if (projectQuery.error) {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <EmptyState
          title="Could not load milestone"
          subtitle={getApiErrorMessage(projectQuery.error)}
          actionLabel="Retry"
          onAction={() => void projectQuery.refetch()}
        />
      </View>
    );
  }

  if (!milestone) {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <EmptyState
          title="Milestone not found"
          subtitle="Unable to locate milestone for dispute."
          actionLabel="Back"
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  if (!canDisputeMilestone(role, milestone.status)) {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <EmptyState
          title="Action not allowed"
          subtitle="Disputes are allowed only from SUBMITTED or ACCEPTED."
          actionLabel="Back"
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-100" contentContainerClassName="p-4 pb-8">
      <Card title="Raise Dispute">
        <Input
          label="Reason"
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          placeholder="Describe the issue clearly"
        />

        {!reason.trim() ? (
          <EmptyState
            title="Reason required"
            subtitle="Please add a reason before submitting dispute."
          />
        ) : null}

        {errorMessage ? (
          <View className="mt-3">
            <EmptyState
              title="Dispute failed"
              subtitle={errorMessage}
              actionLabel="Retry"
              onAction={() => void submitDispute()}
            />
          </View>
        ) : null}

        <View className="mt-4">
          <Button
            label="Submit Dispute"
            variant="danger"
            onPress={confirmSubmitDispute}
            loading={disputeMilestoneMutation.isPending}
            disabled={isOffline || !reason.trim()}
          />
        </View>
      </Card>
    </ScrollView>
  );
}
