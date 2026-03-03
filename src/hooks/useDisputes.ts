import { useQuery } from "@tanstack/react-query";

import { listDisputes } from "../services/disputes.service";
import { useAuth } from "./useAuth";

export const disputesQueryKey = ["disputes"] as const;

export function useDisputes() {
  const { status } = useAuth();
  return useQuery({
    queryKey: disputesQueryKey,
    queryFn: listDisputes,
    enabled: status === "authed",
  });
}
