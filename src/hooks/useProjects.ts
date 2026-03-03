import { useQuery } from "@tanstack/react-query";

import { listProjects } from "../services/projects.service";
import { useAuth } from "./useAuth";

export const projectsQueryKey = ["projects"] as const;

export function useProjects() {
  const { status } = useAuth();
  return useQuery({
    queryKey: projectsQueryKey,
    queryFn: listProjects,
    enabled: status === "authed",
  });
}
