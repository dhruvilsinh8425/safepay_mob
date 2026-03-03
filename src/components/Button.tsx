import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-brand-600",
  secondary: "bg-slate-200",
  danger: "bg-rose-600",
};

const variantTextStyles: Record<ButtonVariant, string> = {
  primary: "text-white",
  secondary: "text-slate-900",
  danger: "text-white",
};

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  fullWidth = true,
  leftIcon,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`rounded-xl px-4 py-3 ${variantStyles[variant]} ${isDisabled ? "opacity-60" : ""} ${
        fullWidth ? "w-full" : ""
      }`}
    >
      <View className="flex-row items-center justify-center">
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === "secondary" ? "#0f172a" : "#ffffff"}
          />
        ) : (
          leftIcon
        )}
        <Text className={`ml-1 text-center font-semibold ${variantTextStyles[variant]}`}>{label}</Text>
      </View>
    </Pressable>
  );
}

