import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../lib/api";

export function Profile() {
  const { user, role, status, logout, bootstrap } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setError(null);
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (logoutError) {
      setError(getApiErrorMessage(logoutError));
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (status === "loading") {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="mt-4 h-48 w-full" />
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <EmptyState
          title="No profile loaded"
          subtitle="Your session is missing user information."
          actionLabel="Retry"
          onAction={() => void bootstrap()}
        />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-100" contentContainerClassName="p-4 pb-8">
      <Card title="Profile">
        <Text className="text-base font-semibold text-slate-900">{user.name}</Text>
        <Text className="mt-1 text-sm text-slate-600">{user.email}</Text>
        <Text className="mt-1 text-xs text-slate-500">Role: {role}</Text>

        {error ? (
          <View className="mt-3">
            <EmptyState
              title="Operation failed"
              subtitle={error}
              actionLabel="Retry"
              onAction={() => void handleLogout()}
            />
          </View>
        ) : null}

        <View className="mt-4 gap-2">
          <Button label="Logout" variant="danger" onPress={() => void handleLogout()} loading={isLoggingOut} />
          <Button
            label="Demo Reset"
            variant="secondary"
            onPress={() => void handleLogout()}
            disabled={isLoggingOut}
          />
        </View>
      </Card>
    </ScrollView>
  );
}

