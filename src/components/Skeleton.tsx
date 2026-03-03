import { View } from "react-native";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <View className={`rounded-xl bg-slate-200 ${className}`} />;
}

