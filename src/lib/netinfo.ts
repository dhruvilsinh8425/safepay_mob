import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";
import { useEffect, useState } from "react";

function mapOnline(
  state: Pick<
    Awaited<ReturnType<typeof NetInfo.fetch>>,
    "isConnected" | "isInternetReachable"
  >,
): boolean {
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

export function setupReactQueryOnlineManager(): void {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(mapOnline(state));
    }),
  );
}

export async function getIsOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return mapOnline(state);
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(mapOnline(state));
    });
    return unsubscribe;
  }, []);

  return isOnline;
}
