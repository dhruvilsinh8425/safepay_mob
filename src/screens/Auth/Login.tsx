import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import axios from "axios";
import { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";

import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { Input } from "../../components/Input";
import { Skeleton } from "../../components/Skeleton";
import { API_BASE_URL, getApiErrorMessage } from "../../lib/api";
import type { LoginRequest } from "../../types/api";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import { useAuth } from "../../hooks/useAuth";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function Login({ navigation }: Props) {
  const { login, status } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [retryPayload, setRetryPayload] = useState<LoginRequest | null>(null);

  const pristine = useMemo(() => !email && !password, [email, password]);
  const backendRoot = useMemo(
    () => API_BASE_URL.replace(/\/api\/v1\/?$/i, ""),
    [],
  );

  const submit = async (payload: LoginRequest) => {
    setIsSubmitting(true);
    setError(null);
    setRetryPayload(payload);
    try {
      await login(payload);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    void submit({ email: email.trim(), password });
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      await axios.get(`${backendRoot}/api/docs`, { timeout: 8000 });
      Alert.alert("Connection Success", `Backend reachable at ${backendRoot}`);
    } catch {
      try {
        await axios.get(`${backendRoot}/api/v1/health`, { timeout: 8000 });
        Alert.alert("Connection Success", `Backend reachable at ${backendRoot}`);
      } catch (err) {
        Alert.alert("Connection Failed", getApiErrorMessage(err));
      }
    } finally {
      setIsTestingConnection(false);
    }
  };

  if (status === "loading") {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="mt-4 h-40 w-full" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-100"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerClassName="p-4">
        <Card title="Welcome Back">
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="********"
          />
          {error ? (
            <View className="mb-3 rounded-lg bg-rose-50 p-3">
              <Text className="text-sm text-rose-700">{error}</Text>
              {retryPayload ? (
                <View className="mt-2">
                  <Button
                    label="Retry"
                    onPress={() => void submit(retryPayload)}
                    variant="secondary"
                  />
                </View>
              ) : null}
            </View>
          ) : null}
          <Button
            label="Login"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!email.trim() || !password}
          />
          <View className="mt-3">
            <Button
              label="Test Connection"
              variant="secondary"
              onPress={() => void handleTestConnection()}
              loading={isTestingConnection}
            />
          </View>
          <View className="mt-3">
            <Button
              label="Create Account"
              variant="secondary"
              onPress={() => navigation.navigate("Register")}
            />
          </View>
        </Card>
        {pristine ? (
          <View className="mt-4">
            <EmptyState
              title="Enter your credentials"
              subtitle="Use your SafePay account to continue."
            />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

