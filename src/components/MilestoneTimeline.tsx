import { Text, View } from "react-native";

import { MilestoneStatus } from "../types/domain";

interface MilestoneTimelineProps {
  status: MilestoneStatus;
}

const ORDERED_STATUSES: MilestoneStatus[] = [
  MilestoneStatus.PENDING_FUNDING,
  MilestoneStatus.FUNDED,
  MilestoneStatus.SUBMITTED,
  MilestoneStatus.ACCEPTED,
  MilestoneStatus.RELEASED,
];

function statusIndex(status: MilestoneStatus): number {
  const index = ORDERED_STATUSES.indexOf(status);
  return index === -1 ? 0 : index;
}

export function MilestoneTimeline({ status }: MilestoneTimelineProps) {
  const isDisputed = status === MilestoneStatus.DISPUTED;
  const currentIndex = statusIndex(status);

  return (
    <View className="mt-3">
      <View className="flex-row items-center">
        {ORDERED_STATUSES.map((item, index) => {
          const reached = index <= currentIndex;
          const active = item === status;
          return (
            <View key={item} className="mr-2 items-center">
              <View
                className={`h-2.5 w-2.5 rounded-full ${
                  reached ? "bg-brand-600" : "bg-slate-300"
                } ${active ? "border-2 border-brand-200" : ""}`}
              />
              <Text className="mt-1 text-[10px] text-slate-500">
                {item.replace(/_/g, " ").replace("PENDING FUNDING", "PENDING")}
              </Text>
            </View>
          );
        })}
      </View>
      {isDisputed ? (
        <View className="mt-2 self-start rounded-full bg-rose-100 px-2 py-1">
          <Text className="text-[10px] font-semibold text-rose-700">DISPUTED</Text>
        </View>
      ) : null}
    </View>
  );
}

