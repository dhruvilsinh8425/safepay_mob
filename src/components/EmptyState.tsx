import { Text, View } from "react-native";

import { Button } from "./Button";

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
      <Text className="text-lg font-semibold text-slate-900">{title}</Text>
      {subtitle ? <Text className="mt-2 text-center text-sm text-slate-600">{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <View className="mt-4 w-full">
          <Button label={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

