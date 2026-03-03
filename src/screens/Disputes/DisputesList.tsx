import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { StatusChip } from "../../components/StatusChip";
import { useAuth } from "../../hooks/useAuth";
import { useDisputes } from "../../hooks/useDisputes";
import { getApiErrorMessage } from "../../lib/api";
import { canResolveDispute } from "../../lib/guards";
import type { AppStackParamList } from "../../navigation/AppNavigator";
import { DisputeStatus } from "../../types/domain";

type AppNavigation = NativeStackNavigationProp<AppStackParamList>;
type FilterTab = "OPEN" | "RESOLVED";

export function DisputesList() {
  const navigation = useNavigation<AppNavigation>();
  const { role } = useAuth();
  const disputesQuery = useDisputes();
  const [filter, setFilter] = useState<FilterTab>("OPEN");

  const filteredDisputes = useMemo(() => {
    const disputes = disputesQuery.data ?? [];
    return disputes.filter((dispute) =>
      filter === "OPEN"
        ? dispute.status === DisputeStatus.OPEN
        : dispute.status === DisputeStatus.RESOLVED,
    );
  }, [disputesQuery.data, filter]);

  if (disputesQuery.isLoading) {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="mt-4 h-24 w-full" />
        <Skeleton className="mt-3 h-24 w-full" />
      </View>
    );
  }

  if (disputesQuery.error) {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <EmptyState
          title="Failed to load disputes"
          subtitle={getApiErrorMessage(disputesQuery.error)}
          actionLabel="Retry"
          onAction={() => void disputesQuery.refetch()}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-100">
      <FlatList
        data={filteredDisputes}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View className="p-4">
            <Text className="mb-3 text-2xl font-bold text-slate-900">Disputes</Text>
            <View className="mb-2 flex-row gap-2">
              <Pressable
                className={`rounded-full px-3 py-2 ${
                  filter === "OPEN" ? "bg-brand-600" : "bg-slate-200"
                }`}
                onPress={() => setFilter("OPEN")}
              >
                <Text
                  className={`text-xs font-semibold ${
                    filter === "OPEN" ? "text-white" : "text-slate-700"
                  }`}
                >
                  OPEN
                </Text>
              </Pressable>
              <Pressable
                className={`rounded-full px-3 py-2 ${
                  filter === "RESOLVED" ? "bg-brand-600" : "bg-slate-200"
                }`}
                onPress={() => setFilter("RESOLVED")}
              >
                <Text
                  className={`text-xs font-semibold ${
                    filter === "RESOLVED" ? "text-white" : "text-slate-700"
                  }`}
                >
                  RESOLVED
                </Text>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            className="px-4 pb-3"
            onPress={() => {
              if (!canResolveDispute(role)) {
                return;
              }
              navigation.navigate("DisputeResolve", {
                disputeId: item.id,
                projectId: item.projectId,
                milestoneId: item.milestoneId,
              });
            }}
          >
            <Card>
              <View className="flex-row items-start justify-between">
                <Text className="mr-3 flex-1 text-sm text-slate-800">{item.reason}</Text>
                <StatusChip status={item.status} />
              </View>
              <Text className="mt-2 text-xs text-slate-500">
                Milestone ID: {item.milestoneId}
              </Text>
              {canResolveDispute(role) ? (
                <Text className="mt-2 text-sm font-medium text-brand-700">Tap to resolve</Text>
              ) : null}
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="px-4 pb-8">
            <EmptyState
              title={`No ${filter.toLowerCase()} disputes`}
              subtitle={
                filter === "OPEN"
                  ? "Active disputes will appear here."
                  : "Resolved disputes will appear here."
              }
              actionLabel="Refresh"
              onAction={() => void disputesQuery.refetch()}
            />
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={disputesQuery.isRefetching}
            onRefresh={() => void disputesQuery.refetch()}
          />
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

