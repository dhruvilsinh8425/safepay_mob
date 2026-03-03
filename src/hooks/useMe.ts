import { useQuery } from "@tanstack/react-query";

import { getMe } from "../services/me.service";
import { useAuth } from "./useAuth";

export const meQueryKey = ["me"] as const;

export function useMe() {
  const { status } = useAuth();
  return useQuery({
    queryKey: meQueryKey,
    queryFn: getMe,
    enabled: status === "authed",
  });
}
