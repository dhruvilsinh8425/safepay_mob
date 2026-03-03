import { Text, View } from "react-native";

import { useOnlineStatus } from "../lib/netinfo";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <View className="bg-amber-500 px-4 py-2">
      <Text className="text-center text-sm font-medium text-amber-950">
        You are offline. Mutations are disabled.
      </Text>
    </View>
  );
}

