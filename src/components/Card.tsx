import type { ReactNode } from "react";
import { Text, View } from "react-native";

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, children, className = "" }: CardProps) {
  return (
    <View className={`rounded-2xl bg-white p-4 shadow-sm ${className}`}>
      {title ? <Text className="mb-3 text-base font-semibold text-slate-900">{title}</Text> : null}
      {children}
    </View>
  );
}

