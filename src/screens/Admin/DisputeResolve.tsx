import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { Input } from "../../components/Input";
import { Skeleton } from "../../components/Skeleton";
import { StatusChip } from "../../components/StatusChip";
import { useAuth } from "../../hooks/useAuth";
import { useDisputes } from "../../hooks/useDisputes";
import { useMutations } from "../../hooks/useMutations";
import { getApiErrorMessage } from "../../lib/api";
import { canResolveDispute } from "../../lib/guards";
import type { AppStackParamList } from "../../navigation/AppNavigator";
import { DisputeResolution } from "../../types/domain";

type Props = NativeStackScreenProps<AppStackParamList, "DisputeResolve">;

const resolutionOptions = [
  DisputeResolution.RELEASE_TO_FREELANCER,
  DisputeResolution.REFUND_TO_CLIENT,
  DisputeResolution.SPLIT,
] as const;

export function DisputeResolve({ navigation, route }: Props) {
  const { disputeId, projectId } = route.params;
  const { role } = useAuth();
  const disputesQuery = useDisputes();
  const { resolveDispute, isOffline } = useMutations();
  const [resolution, setResolution] = useState<DisputeResolution>(
    DisputeResolution.RELEASE_TO_FREELANCER,
  );
  const [splitPercent, setSplitPercent] = useState("50");
  const [error, setError] = useState<string | null>(null);

  const dispute = useMemo(
    () => disputesQuery.data?.find((item) => item.id === disputeId),
    [disputeId, disputesQuery.data],
  );

  const submitResolution = async () => {
    setError(null);
    const splitValue = Number(splitPercent);
    if (resolution === DisputeResolution.SPLIT) {
      if (!Number.isInteger(splitValue) || splitValue < 1 || splitValue > 99) {
        setError("Split percent must be between 1 and 99.");
        return;
      }
    }

    try {
      await resolveDispute.mutateAsync({
        disputeId,
        projectId,
        resolution,
        splitPercent:
          resolution === DisputeResolution.SPLIT ? Number(splitPercent) : undefined,
      });
      Alert.alert("Resolved", "Dispute resolution submitted.");
      navigation.goBack();
    } catch (resolveError) {
      setError(getApiErrorMessage(resolveError));
    }
  };

  if (!canResolveDispute(role)) {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <EmptyState
          title="Admin only"
          subtitle="Only admins can resolve disputes."
          actionLabel="Back"
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  if (disputesQuery.isLoading) {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="mt-4 h-56 w-full" />
      </View>
    );
  }

  if (disputesQuery.error) {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <EmptyState
          title="Could not load dispute"
          subtitle={getApiErrorMessage(disputesQuery.error)}
          actionLabel="Retry"
          onAction={() => void disputesQuery.refetch()}
        />
      </View>
    );
  }

  if (!dispute) {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <EmptyState
          title="Dispute not found"
          subtitle="This dispute may have been resolved already."
          actionLabel="Back"
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-100" contentContainerClassName="p-4 pb-8">
      <Card title="Resolve Dispute">
        <StatusChip status={dispute.status} />
        <Text className="mt-2 text-sm text-slate-700">{dispute.reason}</Text>
        <Text className="mt-2 text-xs text-slate-500">Milestone ID: {dispute.milestoneId}</Text>

        <View className="mt-4 gap-2">
          {resolutionOptions.map((option) => (
            <Button
              key={option}
              label={option.replace(/_/g, " ")}
              variant={resolution === option ? "primary" : "secondary"}
              onPress={() => setResolution(option)}
            />
          ))}
        </View>

        {resolution === DisputeResolution.SPLIT ? (
          <View className="mt-4">
            <Input
              label="Split Percent To Freelancer (1-99)"
              value={splitPercent}
              onChangeText={setSplitPercent}
              keyboardType="numeric"
            />
          </View>
        ) : null}

        {error ? (
          <View className="mt-3">
            <EmptyState
              title="Resolution failed"
              subtitle={error}
              actionLabel="Retry"
              onAction={() => void submitResolution()}
            />
          </View>
        ) : null}

        <View className="mt-4">
          <Button
            label="Submit Resolution"
            onPress={() => void submitResolution()}
            loading={resolveDispute.isPending}
            disabled={isOffline}
          />
        </View>
      </Card>
    </ScrollView>
  );
}

