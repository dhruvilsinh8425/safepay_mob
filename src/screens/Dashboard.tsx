import { useMemo } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import { StatusChip } from "../components/StatusChip";
import { useDisputes } from "../hooks/useDisputes";
import { useProjects } from "../hooks/useProjects";
import { isProjectActive } from "../lib/guards";
import { getApiErrorMessage } from "../lib/api";
import { DisputeStatus, MilestoneStatus } from "../types/domain";
import type { AppStackParamList } from "../navigation/AppNavigator";

type AppNavigation = NativeStackNavigationProp<AppStackParamList>;

const fundedStatuses = new Set<MilestoneStatus>([
  MilestoneStatus.FUNDED,
  MilestoneStatus.IN_PROGRESS,
  MilestoneStatus.SUBMITTED,
  MilestoneStatus.ACCEPTED,
  MilestoneStatus.RELEASED,
  MilestoneStatus.DISPUTED,
  MilestoneStatus.REFUNDED,
  MilestoneStatus.SPLIT_RESOLVED,
]);

export function Dashboard() {
  const navigation = useNavigation<AppNavigation>();
  const projectsQuery = useProjects();
  const disputesQuery = useDisputes();

  const refreshing = projectsQuery.isRefetching || disputesQuery.isRefetching;

  const overview = useMemo(() => {
    const projects = projectsQuery.data ?? [];
    const disputes = disputesQuery.data ?? [];
    const activeProjects = projects.filter((project) =>
      isProjectActive(project.milestones),
    ).length;
    const fundedMilestones = projects
      .flatMap((project) => project.milestones)
      .filter((milestone) => fundedStatuses.has(milestone.status)).length;
    const openDisputes = disputes.filter(
      (dispute) => dispute.status === DisputeStatus.OPEN,
    ).length;
    const recentProjects = [...projects]
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, 5);

    return { activeProjects, fundedMilestones, openDisputes, recentProjects };
  }, [disputesQuery.data, projectsQuery.data]);

  const hasError = Boolean(projectsQuery.error || disputesQuery.error);
  const errorMessage = projectsQuery.error
    ? getApiErrorMessage(projectsQuery.error)
    : disputesQuery.error
      ? getApiErrorMessage(disputesQuery.error)
      : "Failed to load dashboard";

  if (projectsQuery.isLoading || disputesQuery.isLoading) {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="mt-3 h-24 w-full" />
        <Skeleton className="mt-3 h-48 w-full" />
      </View>
    );
  }

  if (hasError) {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <EmptyState
          title="Could not load dashboard"
          subtitle={errorMessage}
          actionLabel="Retry"
          onAction={() => {
            void projectsQuery.refetch();
            void disputesQuery.refetch();
          }}
        />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-100"
      contentContainerClassName="p-4 pb-8"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void projectsQuery.refetch();
            void disputesQuery.refetch();
          }}
        />
      }
    >
      <Text className="mb-3 text-2xl font-bold text-slate-900">Dashboard</Text>

      <View className="gap-3">
        <Card>
          <Text className="text-sm text-slate-500">Active Projects</Text>
          <Text className="mt-1 text-2xl font-bold text-slate-900">
            {overview.activeProjects}
          </Text>
        </Card>
        <Card>
          <Text className="text-sm text-slate-500">Funded Milestones</Text>
          <Text className="mt-1 text-2xl font-bold text-slate-900">
            {overview.fundedMilestones}
          </Text>
        </Card>
        <Card>
          <Text className="text-sm text-slate-500">Open Disputes</Text>
          <Text className="mt-1 text-2xl font-bold text-slate-900">
            {overview.openDisputes}
          </Text>
        </Card>
      </View>

      <View className="mt-5">
        <Text className="mb-2 text-lg font-semibold text-slate-900">Recent Projects</Text>
        {overview.recentProjects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            subtitle="Create a project to see activity on this dashboard."
          />
        ) : (
          <View className="gap-3">
            {overview.recentProjects.map((project) => (
              <Card key={project.id}>
                <Text className="text-base font-semibold text-slate-900">{project.title}</Text>
                <Text className="mt-1 text-sm text-slate-600" numberOfLines={2}>
                  {project.description}
                </Text>
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {project.milestones.slice(0, 3).map((milestone) => (
                    <StatusChip key={milestone.id} status={milestone.status} />
                  ))}
                </View>
                <View className="mt-3">
                  <Text
                    className="text-sm font-medium text-brand-700"
                    onPress={() =>
                      navigation.navigate("ProjectDetails", { projectId: project.id })
                    }
                  >
                    Open Project
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

