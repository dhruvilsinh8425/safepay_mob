import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";

import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { Input } from "../../components/Input";
import { Skeleton } from "../../components/Skeleton";
import { useAuth } from "../../hooks/useAuth";
import { useMutations } from "../../hooks/useMutations";
import { getProjectQueryKey, useProject } from "../../hooks/useProject";
import { getApiErrorMessage } from "../../lib/api";
import { canSubmitMilestone } from "../../lib/guards";
import type { AppStackParamList } from "../../navigation/AppNavigator";
import { cacheProjectMilestones } from "../../services/projects.service";
import type { DeliverableMetadata, Project } from "../../types/domain";

import { useQueryClient } from "@tanstack/react-query";

type Props = NativeStackScreenProps<AppStackParamList, "SubmitDeliverables">;

export function SubmitDeliverables({ navigation, route }: Props) {
  const queryClient = useQueryClient();

  const { projectId, milestoneId } = route.params;
  const { role } = useAuth();
  const { submitMilestoneMutation, isOffline } = useMutations();
  const projectQuery = useProject(projectId);

  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<DeliverableMetadata[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const milestone = projectQuery.data?.milestones.find((item) => item.id === milestoneId);
  const notesTooShort = notes.trim().length > 0 && notes.trim().length < 3;

  const pickFiles = async () => {
    setErrorMessage(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: false,
      });
      if (result.canceled) {
        return;
      }
      const metadata: DeliverableMetadata[] = result.assets.map((asset) => ({
        name: asset.name,
        size: asset.size,
        mimeType: asset.mimeType,
        uri: asset.uri,
      }));
      setFiles(metadata);
    } catch (pickError) {
      setErrorMessage(getApiErrorMessage(pickError));
    }
  };

  const submitDeliverables = async () => {
    setErrorMessage(null);
    try {
      const fileRefs = files
        .map((file) => file.uri?.trim() || file.name?.trim() || "")
        .filter((value) => value.length > 0);

      const payload = { notes: notes.trim(), files: fileRefs };

      if (__DEV__) {
        console.log("[SubmitDeliverables] payload", payload);
      }

      const res = await submitMilestoneMutation.mutateAsync({
        projectId,
        milestoneId,
        data: payload,
      });

      if (res?.milestone) {
        cacheProjectMilestones(projectId, [res.milestone]);
      }

      const projectQueryKey = getProjectQueryKey(projectId);
      queryClient.setQueryData<Project | undefined>(projectQueryKey, (old) => {
        if (!old || !res?.milestone) {
          return old;
        }

        return {
          ...old,
          milestones: old.milestones.map((milestone) =>
            milestone.id === milestoneId ? res.milestone : milestone,
          ),
        };
      });

      await queryClient.invalidateQueries({ queryKey: projectQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });

      Alert.alert("Submitted", "Deliverables sent successfully.");
      navigation.goBack();
    } catch (submitError) {
      setErrorMessage(getApiErrorMessage(submitError));
    }
  };

  if (projectQuery.isLoading) {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="mt-4 h-64 w-full" />
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
          subtitle="This milestone is unavailable."
          actionLabel="Back"
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  if (!canSubmitMilestone(role, milestone.status)) {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <EmptyState
          title="Action not allowed"
          subtitle="Submit is available only for FUNDED milestones as FREELANCER."
          actionLabel="Back"
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-100" contentContainerClassName="p-4 pb-8">
      <Card title="Submit Deliverables">
        <Input
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          placeholder="Work summary (recommended)"
        />
        {notesTooShort ? (
          <Text className="mb-2 text-xs text-amber-700">
            Notes shorter than 3 characters are allowed but not recommended.
          </Text>
        ) : null}

        <Button
          label="Pick Files"
          variant="secondary"
          onPress={() => void pickFiles()}
          disabled={isOffline || submitMilestoneMutation.isPending}
        />

        <View className="mt-3">
          {files.length === 0 ? (
            <EmptyState
              title="No files selected"
              subtitle="You can still submit notes only, or attach metadata for documents."
            />
          ) : (
            <View className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              {files.map((file) => (
                <View key={file.uri} className="mb-2">
                  <Text className="text-sm font-medium text-slate-800">{file.name}</Text>
                  <Text className="text-xs text-slate-500">
                    {(file.mimeType ?? "unknown").toLowerCase()} - {file.size ?? 0} bytes
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {errorMessage ? (
          <View className="mt-3">
            <EmptyState
              title="Submission failed"
              subtitle={errorMessage}
              actionLabel="Retry"
              onAction={() => void submitDeliverables()}
            />
          </View>
        ) : null}

        {isOffline ? (
          <Text className="mt-3 text-xs text-amber-700">
            You are offline. Submissions are disabled.
          </Text>
        ) : null}

        <View className="mt-4">
          <Button
            label="Submit Deliverables"
            onPress={() => void submitDeliverables()}
            loading={submitMilestoneMutation.isPending}
            disabled={isOffline}
          />
        </View>
      </Card>
    </ScrollView>
  );
}

