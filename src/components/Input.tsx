import { Text, TextInput, type TextInputProps, View } from "react-native";

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Input({ label, error, ...props }: InputProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1 text-sm font-medium text-slate-700">{label}</Text>
      <TextInput
        {...props}
        className={`rounded-xl border px-4 py-3 text-slate-900 ${
          error ? "border-rose-500" : "border-slate-300"
        }`}
        placeholderTextColor="#94a3b8"
      />
      {error ? <Text className="mt-1 text-xs text-rose-600">{error}</Text> : null}
    </View>
  );
}

