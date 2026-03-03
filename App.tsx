import "react-native-gesture-handler";
import "./global.css";

import { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { OfflineBanner } from "./src/components/OfflineBanner";
import { AuthProvider } from "./src/hooks/useAuth";
import { setupReactQueryOnlineManager } from "./src/lib/netinfo";
import { queryClient } from "./src/lib/queryClient";
import { RootNavigator } from "./src/navigation/RootNavigator";

function AppShell() {
  useEffect(() => {
    setupReactQueryOnlineManager();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={["top"]} className="flex-1 bg-slate-100">
        <OfflineBanner />
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
        <StatusBar style="dark" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </QueryClientProvider>
  );
}

