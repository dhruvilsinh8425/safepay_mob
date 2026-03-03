import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";

import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { Input } from "../../components/Input";
import { Skeleton } from "../../components/Skeleton";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../lib/api";
import type { RegisterRequest } from "../../types/api";
import { Role } from "../../types/domain";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

type FormErrors = {
  name?: string;
  email?: string;
  password?: string;
};

export function Register({ navigation }: Props) {
  const { register, status } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Exclude<Role, Role.ADMIN>>(Role.CLIENT);
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryPayload, setRetryPayload] = useState<RegisterRequest | null>(null);

  const pristine = useMemo(() => !name && !email && !password, [email, name, password]);

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!name.trim()) {
      nextErrors.name = "Name is required";
    }
    if (!email.trim().includes("@")) {
      nextErrors.email = "Valid email is required";
    }
    if (password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (payload: RegisterRequest) => {
    setIsSubmitting(true);
    setError(null);
    setRetryPayload(payload);
    try {
      await register(payload);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (!validate()) {
      return;
    }
    void submit({
      name: name.trim(),
      email: email.trim(),
      password,
      role,
    });
  };

  if (status === "loading") {
    return (
      <View className="flex-1 bg-slate-100 p-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="mt-4 h-56 w-full" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-100"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerClassName="p-4">
        <Card title="Create Account">
          <Input label="Name" value={name} onChangeText={setName} error={errors.name} />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={errors.password}
          />
          <Text className="mb-2 text-sm font-medium text-slate-700">Role</Text>
          <View className="mb-4 flex-row">
            <Button
              label="Client"
              variant={role === Role.CLIENT ? "primary" : "secondary"}
              onPress={() => setRole(Role.CLIENT)}
              fullWidth={false}
            />
            <View className="w-2" />
            <Button
              label="Freelancer"
              variant={role === Role.FREELANCER ? "primary" : "secondary"}
              onPress={() => setRole(Role.FREELANCER)}
              fullWidth={false}
            />
          </View>
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
          <Button label="Register" onPress={handleSubmit} loading={isSubmitting} />
          <View className="mt-3">
            <Button
              label="Back To Login"
              variant="secondary"
              onPress={() => navigation.navigate("Login")}
            />
          </View>
        </Card>
        {pristine ? (
          <View className="mt-4">
            <EmptyState
              title="Get started"
              subtitle="Register as Client or Freelancer. Admin registration is disabled."
            />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

