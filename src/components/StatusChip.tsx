import { Text, View } from "react-native";

import type { DisputeStatus, MilestoneStatus } from "../types/domain";

interface StatusChipProps {
  status: MilestoneStatus | DisputeStatus | string;
}

const chipStyles: Record<string, string> = {
  PENDING_FUNDING: "bg-slate-200 text-slate-800",
  FUNDED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-indigo-100 text-indigo-800",
  SUBMITTED: "bg-amber-100 text-amber-800",
  ACCEPTED: "bg-emerald-100 text-emerald-800",
  RELEASED: "bg-emerald-200 text-emerald-900",
  DISPUTED: "bg-rose-100 text-rose-800",
  REFUNDED: "bg-zinc-200 text-zinc-800",
  SPLIT_RESOLVED: "bg-fuchsia-100 text-fuchsia-900",
  OPEN: "bg-rose-100 text-rose-800",
  RESOLVED: "bg-emerald-100 text-emerald-900",
};

export function StatusChip({ status }: StatusChipProps) {
  const style = chipStyles[status] ?? "bg-slate-100 text-slate-700";
  const [bgClass, textClass] = style.split(" ");

  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${bgClass}`}>
      <Text className={`text-xs font-semibold ${textClass}`}>
        {status.replace(/_/g, " ")}
      </Text>
    </View>
  );
}

