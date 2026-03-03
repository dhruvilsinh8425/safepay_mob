import { useQuery } from "@tanstack/react-query";

import { getProjectById } from "../services/projects.service";
import { useAuth } from "./useAuth";

export function getProjectQueryKey(projectId: string) {
  return ["project", projectId] as const;
}

export function useProject(projectId: string | undefined) {
  const { status } = useAuth();
  return useQuery({
    queryKey: projectId ? getProjectQueryKey(projectId) : ["project", "missing-id"],
    queryFn: () => {
      if (!projectId) {
        throw new Error("Missing project id");
      }
      return getProjectById(projectId);
    },
    enabled: status === "authed" && Boolean(projectId),
  });
}
