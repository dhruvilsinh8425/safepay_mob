import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Platform, RefreshControl, Text, ToastAndroid, View } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { MilestoneTimeline } from "../../components/MilestoneTimeline";
import { Skeleton } from "../../components/Skeleton";
import { StatusChip } from "../../components/StatusChip";
import { useAuth } from "../../hooks/useAuth";
import { useMutations } from "../../hooks/useMutations";
import { useProject } from "../../hooks/useProject";
import { getApiErrorMessage } from "../../lib/api";
import {
  canAcceptMilestone,
  canDisputeMilestone,
  canFundMilestone,
  canSubmitMilestone,
  getPrimaryActionLabel,
} from "../../lib/guards";
import { formatMoney } from "../../lib/money";
import type { AppStackParamList } from "../../navigation/AppNavigator";
import { getProjectQueryKey } from "../../hooks/useProject";
import { getMilestoneById } from "../../services/milestones.service";
import { MilestoneStatus, Role, type Milestone } from "../../types/domain";

type Props = NativeStackScreenProps<AppStackParamList, "ProjectDetails">;
type ActionType = "fund" | "accept";

const fundedOrLaterStatuses = new Set<MilestoneStatus>([
  MilestoneStatus.FUNDED,
  MilestoneStatus.IN_PROGRESS,
  MilestoneStatus.SUBMITTED,
  MilestoneStatus.ACCEPTED,
  MilestoneStatus.RELEASED,
  MilestoneStatus.DISPUTED,
  MilestoneStatus.REFUNDED,
  MilestoneStatus.SPLIT_RESOLVED,
]);
const releasePollingStopStatuses = new Set<MilestoneStatus>([
  MilestoneStatus.RELEASED,
  MilestoneStatus.REFUNDED,
  MilestoneStatus.DISPUTED,
]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function showToast(message: string): void {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }
  Alert.alert("Info", message);
}

export function ProjectDetails({ navigation, route }: Props) {
  const { projectId } = route.params;
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const projectQuery = useProject(projectId);
  const {
    isOffline,
    fundMilestoneMutation,
    acceptMilestoneMutation,
  } = useMutations();

  const [fundingMilestoneId, setFundingMilestoneId] = useState<string | null>(null);
  const [acceptingMilestoneId, setAcceptingMilestoneId] = useState<string | null>(null);
  const [pendingFundMilestoneId, setPendingFundMilestoneId] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<{
    type: ActionType;
    milestoneId: string;
  } | null>(null);
  const isMountedRef = useRef(true);

  const project = projectQuery.data;

  useFocusEffect(
    useCallback(() => {
      void projectQuery.refetch();
    }, [projectQuery.refetch]),
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!__DEV__ || !project) {
      return;
    }
    console.log(
      "[ProjectDetails] API milestone statuses",
      project.milestones.map((milestone) => ({
        id: milestone.id,
        status: milestone.status,
      })),
    );
    project.milestones.forEach((milestone) => {
      console.log("[ProjectDetails] milestone-action-check", {
        projectId,
        milestoneId: milestone.id,
        role,
        status: milestone.status,
      });
    });
  }, [project, projectId, role]);

  const retryAction = () => {
    if (!lastAction) {
      return;
    }
    if (lastAction.type === "fund") {
      void handleFund(lastAction.milestoneId);
      return;
    }
    const milestoneStatus = projectQuery.data?.milestones.find(
      (item) => item.id === lastAction.milestoneId,
    )?.status;
    if (!milestoneStatus) {
      return;
    }
    void confirmAccept(lastAction.milestoneId, milestoneStatus);
  };

  const syncMilestoneState = async (milestoneId: string): Promise<MilestoneStatus | undefined> => {
    try {
      const milestone = await getMilestoneById(milestoneId);
      await queryClient.invalidateQueries({ queryKey: getProjectQueryKey(projectId) });
      await projectQuery.refetch();
      return milestone.status;
    } catch {
      await queryClient.invalidateQueries({ queryKey: getProjectQueryKey(projectId) });
      const next = await projectQuery.refetch();
      return next.data?.milestones.find((item) => item.id === milestoneId)?.status;
    }
  };

  const logRefetchedMilestoneStatus = (
    source: string,
    milestoneId: string,
    status: MilestoneStatus | undefined,
  ) => {
    if (!__DEV__) {
      return;
    }
    console.log("[ProjectDetails] status after refetch", {
      source,
      projectId,
      milestoneId,
      status,
    });
  };

  const refetchUntilFundedOrLater = async (milestoneId: string) => {
    const delays = [3_000, 10_000];

    for (const delayMs of delays) {
      await sleep(delayMs);
      const status = await syncMilestoneState(milestoneId);

      if (status && fundedOrLaterStatuses.has(status)) {
        setPendingFundMilestoneId(null);
        setInfoMessage("Payment detected. Milestone status updated.");
        return;
      }
    }

    setPendingFundMilestoneId(null);
    setInfoMessage("If payment succeeded, pull to refresh.");
  };

  const handleFund = async (milestoneId: string) => {
    setActionError(null);
    setLastAction({ type: "fund", milestoneId });
    setFundingMilestoneId(milestoneId);

    try {
      const data = await fundMilestoneMutation.mutateAsync({ projectId, milestoneId });
      if (!data.checkoutUrl) {
        throw new Error("Checkout URL not returned by server");
      }

      await WebBrowser.openBrowserAsync(data.checkoutUrl);
      setInfoMessage("Payment processing. We'll refresh automatically.");
      setPendingFundMilestoneId(milestoneId);
      await refetchUntilFundedOrLater(milestoneId);
    } catch (error) {
      const message = getApiErrorMessage(error);
      if (/not in pending_funding/i.test(message)) {
        setActionError(null);
        setInfoMessage("Payment already processed. Refreshing milestone status.");
        setPendingFundMilestoneId(milestoneId);
        await refetchUntilFundedOrLater(milestoneId);
      } else {
        setActionError(message);
      }
    } finally {
      setFundingMilestoneId(null);
    }
  };

  const performAccept = async (milestoneId: string) => {
    if (acceptMilestoneMutation.isPending) {
      return;
    }
    setActionError(null);
    setLastAction({ type: "accept", milestoneId });
    setAcceptingMilestoneId(milestoneId);

    try {
      const response = await acceptMilestoneMutation.mutateAsync({ projectId, milestoneId });
      if (__DEV__) {
        console.log("[ProjectDetails] accept response", {
          projectId,
          milestoneId,
          milestoneStatus: response?.milestone?.status,
        });
      }
      const message = "Accepted. Releasing soon.";
      setInfoMessage(message);
      showToast(message);

      await queryClient.invalidateQueries({ queryKey: getProjectQueryKey(projectId) });
      const refetched = await projectQuery.refetch();
      const refetchedStatus = refetched.data?.milestones.find(
        (item) => item.id === milestoneId,
      )?.status;
      logRefetchedMilestoneStatus("accept-success", milestoneId, refetchedStatus);

      if (refetchedStatus === MilestoneStatus.ACCEPTED) {
        void (async () => {
          for (const delayMs of [2_000, 8_000]) {
            if (!isMountedRef.current) {
              return;
            }
            await sleep(delayMs);
            if (!isMountedRef.current) {
              return;
            }
            const next = await projectQuery.refetch();
            const nextStatus = next.data?.milestones.find((item) => item.id === milestoneId)
              ?.status;
            logRefetchedMilestoneStatus(`accept-poll-${delayMs}`, milestoneId, nextStatus);
            if (nextStatus && releasePollingStopStatuses.has(nextStatus)) {
              return;
            }
          }
        })();
      }
    } catch (error) {
      const message = getApiErrorMessage(error);
      const statusAfterError = await syncMilestoneState(milestoneId);
      logRefetchedMilestoneStatus("accept-error-sync", milestoneId, statusAfterError);

      // If backend already moved state (e.g. already ACCEPTED), treat this as synced state, not a blocking error.
      if (statusAfterError && statusAfterError !== MilestoneStatus.SUBMITTED) {
        setActionError(null);
        setInfoMessage(`Milestone is now ${statusAfterError}.`);
        return;
      }

      setActionError(message);
    } finally {
      setAcceptingMilestoneId(null);
    }
  };

  const confirmAccept = (milestoneId: string, milestoneStatus: MilestoneStatus) => {
    if (acceptMilestoneMutation.isPending) {
      return;
    }
    if (__DEV__) {
      console.log("[ProjectDetails] accept pressed", {
        projectId,
        milestoneId,
        role,
        status: milestoneStatus,
      });
    }
    Alert.alert(
      "Accept this milestone?",
      "This will release funds.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          style: "default",
          onPress: () => {
            void performAccept(milestoneId);
          },
        },
      ],
    );
  };

  const title = useMemo(() => project?.title ?? "Project", [project?.title]);

  if (projectQuery.isLoading) {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="mt-4 h-40 w-full" />
        <Skeleton className="mt-3 h-40 w-full" />
        <Skeleton className="mt-3 h-40 w-full" />
      </View>
    );
  }

  if (projectQuery.error) {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <EmptyState
          title="Could not load project"
          subtitle={getApiErrorMessage(projectQuery.error)}
          actionLabel="Retry"
          onAction={() => void projectQuery.refetch()}
        />
      </View>
    );
  }

  if (!project) {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <EmptyState
          title="Project not found"
          subtitle="The requested project does not exist."
          actionLabel="Back"
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  const renderMilestone = ({ item }: { item: Milestone }) => {
    const isFundingThis = fundingMilestoneId === item.id && fundMilestoneMutation.isPending;
    const isAcceptingThis =
      acceptingMilestoneId === item.id && acceptMilestoneMutation.isPending;
    const primaryAction = getPrimaryActionLabel(role, item.status);

    return (
      <View className="px-4 pb-3">
        <Card>
          <View className="flex-row items-start justify-between">
            <View className="mr-3 flex-1">
              <Text className="text-base font-semibold text-slate-900">{item.title}</Text>
              <Text className="mt-1 text-sm text-slate-600">
                {formatMoney(item.amountBigint, item.currency || project.currency)}
              </Text>
              {item.dueDate ? (
                <Text className="mt-1 text-xs text-slate-500">Due: {item.dueDate}</Text>
              ) : null}
              {primaryAction ? (
                <Text className="mt-1 text-[11px] text-slate-500">
                  Primary action: {primaryAction}
                </Text>
              ) : null}
            </View>
            <StatusChip status={item.status} />
          </View>

          <MilestoneTimeline status={item.status} />

          {role !== Role.ADMIN ? (
            <View className="mt-4 gap-2">
              {canFundMilestone(role, item.status) ? (
                <Button
                  label="Fund"
                  onPress={() => void handleFund(item.id)}
                  loading={isFundingThis}
                  disabled={isOffline || isFundingThis}
                />
              ) : null}

              {canSubmitMilestone(role, item.status) ? (
                <Button
                  label="Submit Work"
                  onPress={() =>
                    navigation.navigate("SubmitDeliverables", {
                      projectId,
                      milestoneId: item.id,
                    })
                  }
                  disabled={isOffline}
                />
              ) : null}

              {canAcceptMilestone(role, item.status) ? (
                <Button
                  label="Accept"
                  onPress={() => void confirmAccept(item.id, item.status)}
                  loading={isAcceptingThis}
                  disabled={isOffline || isAcceptingThis}
                />
              ) : null}

              {canDisputeMilestone(role, item.status) ? (
                <Button
                  label="Raise Dispute"
                  variant="danger"
                  onPress={() => {
                    if (__DEV__) {
                      console.log("[ProjectDetails] dispute pressed", {
                        projectId,
                        milestoneId: item.id,
                        role,
                        status: item.status,
                      });
                    }
                    navigation.navigate("DisputeCreate", {
                      projectId,
                      milestoneId: item.id,
                    });
                  }}
                  disabled={isOffline}
                />
              ) : null}
            </View>
          ) : null}
        </Card>
      </View>
    );
  };

  return (
    <FlatList
      className="flex-1 bg-slate-100"
      data={project.milestones}
      keyExtractor={(item) => item.id}
      renderItem={renderMilestone}
      ListHeaderComponent={
        <View className="p-4 pb-3">
          <Card>
            <View className="flex-row items-start justify-between">
              <View className="mr-3 flex-1">
                <Text className="text-xl font-bold text-slate-900">{title}</Text>
                <Text className="mt-1 text-sm text-slate-600">{project.description}</Text>
                <Text className="mt-2 text-xs text-slate-500">
                  Freelancer: {project.freelancerEmail ?? project.freelancer?.email ?? "N/A"}
                </Text>
              </View>
              <StatusChip status={project.status} />
            </View>
          </Card>

          {infoMessage ? (
            <View className="mt-3 rounded-xl bg-blue-50 p-3">
              <Text className="text-sm text-blue-700">{infoMessage}</Text>
              {pendingFundMilestoneId ? (
                <Text className="mt-1 text-xs text-blue-600">
                  Waiting for webhook update on milestone {pendingFundMilestoneId}.
                </Text>
              ) : null}
            </View>
          ) : null}

          {actionError ? (
            <View className="mt-3">
              <EmptyState
                title="Action failed"
                subtitle={actionError}
                actionLabel="Retry"
                onAction={retryAction}
              />
            </View>
          ) : null}

          <Text className="mt-4 text-lg font-semibold text-slate-900">Milestones</Text>
        </View>
      }
      ListEmptyComponent={
        <View className="px-4 pb-8">
          <EmptyState
            title="No milestones"
            subtitle="Milestones will appear here once the project is configured."
            actionLabel="Retry"
            onAction={() => void projectQuery.refetch()}
          />
        </View>
      }
      refreshControl={
        <RefreshControl
          refreshing={projectQuery.isRefetching}
          onRefresh={() => void projectQuery.refetch()}
        />
      }
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}
