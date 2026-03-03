import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { Input } from "../../components/Input";
import { Skeleton } from "../../components/Skeleton";
import { useAuth } from "../../hooks/useAuth";
import { useMutations } from "../../hooks/useMutations";
import { getApiErrorMessage } from "../../lib/api";
import { canCreateProject } from "../../lib/guards";
import type { AppStackParamList } from "../../navigation/AppNavigator";
import type { CreateProjectRequest } from "../../types/api";

type Props = NativeStackScreenProps<AppStackParamList, "ProjectCreateModal">;

interface MilestoneDraft {
  id: string;
  title: string;
  amount: string;
  dueDate: string;
}

function makeMilestoneDraft(seed: number): MilestoneDraft {
  return { id: `draft-${seed}`, title: "", amount: "", dueDate: "" };
}

const UUID_V4_OR_V1_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ProjectCreateModal({ navigation }: Props) {
  const { role, status } = useAuth();
  const { createProject, isOffline } = useMutations();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [freelancerEmail, setFreelancerEmail] = useState("");
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([makeMilestoneDraft(1)]);
  const [formError, setFormError] = useState<string | null>(null);
  const [retryPayload, setRetryPayload] = useState<CreateProjectRequest | null>(null);

  const pristine = useMemo(
    () => !title && !description && !freelancerEmail && milestones.every((m) => !m.title),
    [description, freelancerEmail, milestones, title],
  );

  const updateMilestone = (id: string, patch: Partial<MilestoneDraft>) => {
    setMilestones((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const addMilestone = () => {
    setMilestones((current) => [...current, makeMilestoneDraft(current.length + 1)]);
  };

  const removeMilestone = (id: string) => {
    setMilestones((current) => current.filter((item) => item.id !== id));
  };

  const validate = (): string | null => {
    if (!title.trim() || !description.trim() || !freelancerEmail.trim()) {
      return "Title, description, and freelancer ID are required";
    }
    if (!UUID_V4_OR_V1_REGEX.test(freelancerEmail.trim())) {
      return "Enter freelancer user ID (UUID). Email cannot assign projects.";
    }
    if (milestones.length < 1) {
      return "At least one milestone is required";
    }
    for (const milestone of milestones) {
      if (!milestone.title.trim()) {
        return "Each milestone needs a title";
      }
      const amount = Number(milestone.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return "Each milestone amount must be greater than 0";
      }
      if (!milestone.dueDate.trim()) {
        return "Each milestone needs a due date";
      }
    }
    return null;
  };

  const buildPayload = (): CreateProjectRequest => ({
    title: title.trim(),
    description: description.trim(),
    freelancerEmail: freelancerEmail.trim(),
    milestones: milestones.map((milestone) => ({
      title: milestone.title.trim(),
      amount: Number(milestone.amount),
      dueDate: milestone.dueDate.trim(),
    })),
  });

  const submit = async (payload: CreateProjectRequest) => {
    try {
      setFormError(null);
      await createProject.mutateAsync(payload);
      Alert.alert("Success", "Project created");
      navigation.goBack();
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  };

  const handleCreate = () => {
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    const payload = buildPayload();
    setRetryPayload(payload);
    void submit(payload);
  };

  if (status === "loading") {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="mt-4 h-72 w-full" />
      </View>
    );
  }

  if (!canCreateProject(role)) {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <EmptyState
          title="Not allowed"
          subtitle="Only clients can create projects."
          actionLabel="Back"
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-100" contentContainerClassName="p-4 pb-8">
      <Card title="New Project">
        <Input label="Title" value={title} onChangeText={setTitle} />
        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        <Input
          label="Freelancer ID (UUID)"
          value={freelancerEmail}
          onChangeText={setFreelancerEmail}
          autoCapitalize="none"
          placeholder="e.g. f9e34143-e1d8-4c64-b522-5b3f7a954e72"
        />

        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-slate-900">Milestones</Text>
          <Button label="Add" onPress={addMilestone} variant="secondary" fullWidth={false} />
        </View>

        {milestones.length === 0 ? (
          <EmptyState
            title="No milestones"
            subtitle="Add at least one milestone."
            actionLabel="Add Milestone"
            onAction={addMilestone}
          />
        ) : (
          milestones.map((milestone, index) => (
            <Card key={milestone.id} className="mb-3 border border-slate-200">
              <Text className="mb-2 text-sm font-medium text-slate-700">
                Milestone {index + 1}
              </Text>
              <Input
                label="Title"
                value={milestone.title}
                onChangeText={(text) => updateMilestone(milestone.id, { title: text })}
              />
              <Input
                label="Amount"
                value={milestone.amount}
                onChangeText={(text) => updateMilestone(milestone.id, { amount: text })}
                keyboardType="numeric"
              />
              <Input
                label="Due Date (YYYY-MM-DD)"
                value={milestone.dueDate}
                onChangeText={(text) => updateMilestone(milestone.id, { dueDate: text })}
              />
              {milestones.length > 1 ? (
                <Button
                  label="Remove"
                  variant="danger"
                  onPress={() => removeMilestone(milestone.id)}
                />
              ) : null}
            </Card>
          ))
        )}

        {formError ? (
          <View className="mb-3 rounded-lg bg-rose-50 p-3">
            <Text className="text-sm text-rose-700">{formError}</Text>
            {retryPayload ? (
              <View className="mt-2">
                <Button
                  label="Retry"
                  variant="secondary"
                  onPress={() => void submit(retryPayload)}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {isOffline ? (
          <Text className="mb-2 text-xs text-amber-700">
            You are offline. Project creation is disabled.
          </Text>
        ) : null}

        <Button
          label="Create Project"
          onPress={handleCreate}
          loading={createProject.isPending}
          disabled={isOffline}
        />
      </Card>

      {pristine ? (
        <View className="mt-4">
          <EmptyState title="Start typing" subtitle="Fill the form to create a project." />
        </View>
      ) : null}
    </ScrollView>
  );
}

