import { View } from "react-native";

import { Skeleton } from "../components/Skeleton";
import { useAuth } from "../hooks/useAuth";
import { AppNavigator } from "./AppNavigator";
import { AuthNavigator } from "./AuthNavigator";

export function RootNavigator() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="mt-4 h-40 w-full" />
        <Skeleton className="mt-4 h-24 w-full" />
      </View>
    );
  }

  if (status === "guest") {
    return <AuthNavigator />;
  }

  return <AppNavigator />;
}

