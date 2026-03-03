import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { Input } from "../../components/Input";
import { Skeleton } from "../../components/Skeleton";
import { StatusChip } from "../../components/StatusChip";
import { useAuth } from "../../hooks/useAuth";
import { useProjects } from "../../hooks/useProjects";
import { getApiErrorMessage } from "../../lib/api";
import {
  canCreateProject,
  isProjectActive,
  isProjectCompleted,
  isProjectDisputed,
} from "../../lib/guards";
import type { AppStackParamList } from "../../navigation/AppNavigator";

type AppNavigation = NativeStackNavigationProp<AppStackParamList>;
type FilterTab = "ALL" | "ACTIVE" | "COMPLETED" | "DISPUTED";

const tabs: FilterTab[] = ["ALL", "ACTIVE", "COMPLETED", "DISPUTED"];

export function ProjectsList() {
  const navigation = useNavigation<AppNavigation>();
  const { role } = useAuth();
  const projectsQuery = useProjects();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");

  const projects = projectsQuery.data ?? [];

  const filteredProjects = useMemo(() => {
    return projects
      .filter((project) => {
        const needle = search.trim().toLowerCase();
        if (!needle) {
          return true;
        }
        return (
          project.title.toLowerCase().includes(needle) ||
          project.description.toLowerCase().includes(needle) ||
          (project.freelancer?.email ?? project.freelancerEmail ?? "")
            .toLowerCase()
            .includes(needle)
        );
      })
      .filter((project) => {
        if (activeTab === "ALL") {
          return true;
        }
        if (activeTab === "ACTIVE") {
          return isProjectActive(project.milestones);
        }
        if (activeTab === "COMPLETED") {
          return isProjectCompleted(project.milestones);
        }
        return isProjectDisputed(project.milestones);
      });
  }, [activeTab, projects, search]);

  if (projectsQuery.isLoading) {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="mt-4 h-28 w-full" />
        <Skeleton className="mt-3 h-28 w-full" />
      </View>
    );
  }

  if (projectsQuery.error) {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <EmptyState
          title="Failed to load projects"
          subtitle={getApiErrorMessage(projectsQuery.error)}
          actionLabel="Retry"
          onAction={() => void projectsQuery.refetch()}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-100">
      <FlatList
        data={filteredProjects}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View className="p-4">
            <Text className="mb-3 text-2xl font-bold text-slate-900">Projects</Text>
            <Input
              label="Search"
              value={search}
              onChangeText={setSearch}
              placeholder="Title, description, or freelancer email"
            />
            <View className="mb-2 flex-row flex-wrap gap-2">
              {tabs.map((tab) => (
                <Pressable
                  key={tab}
                  className={`rounded-full px-3 py-2 ${
                    activeTab === tab ? "bg-brand-600" : "bg-slate-200"
                  }`}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      activeTab === tab ? "text-white" : "text-slate-700"
                    }`}
                  >
                    {tab}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            className="px-4 pb-3"
            onPress={() => navigation.navigate("ProjectDetails", { projectId: item.id })}
          >
            <Card>
              <Text className="text-base font-semibold text-slate-900">{item.title}</Text>
              <Text className="mt-1 text-sm text-slate-600" numberOfLines={2}>
                {item.description}
              </Text>
              <Text className="mt-2 text-xs text-slate-500">
                Freelancer: {item.freelancer?.email ?? item.freelancerEmail ?? "Unassigned"}
              </Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                {item.milestones.slice(0, 3).map((milestone) => (
                  <StatusChip key={milestone.id} status={milestone.status} />
                ))}
              </View>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="px-4 pb-8">
            <EmptyState
              title="No projects found"
              subtitle="Try a different search or filter."
              actionLabel="Reset Filters"
              onAction={() => {
                setSearch("");
                setActiveTab("ALL");
              }}
            />
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={projectsQuery.isRefetching}
            onRefresh={() => void projectsQuery.refetch()}
          />
        }
        contentContainerStyle={{ paddingBottom: 96 }}
      />

      {canCreateProject(role) ? (
        <View className="absolute bottom-6 right-4">
          <Button
            label="Create Project"
            onPress={() => navigation.navigate("ProjectCreateModal")}
            fullWidth={false}
          />
        </View>
      ) : null}
    </View>
  );
}

