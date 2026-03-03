import {
  DisputeStatus,
  type Milestone,
  MilestoneStatus,
  Role,
} from "../types/domain";

function isMilestoneActor(role: Role | null | undefined): boolean {
  return role === Role.CLIENT || role === Role.FREELANCER;
}

export function canCreateProject(role?: Role | null): boolean {
  return role === Role.CLIENT;
}

export function canFundMilestone(
  role: Role | null | undefined,
  milestoneStatus: MilestoneStatus,
): boolean {
  if (role === Role.ADMIN) {
    return false;
  }
  return role === Role.CLIENT && milestoneStatus === MilestoneStatus.PENDING_FUNDING;
}

export function canSubmitMilestone(
  role: Role | null | undefined,
  milestoneStatus: MilestoneStatus,
): boolean {
  if (role === Role.ADMIN) {
    return false;
  }
  return role === Role.FREELANCER && milestoneStatus === MilestoneStatus.FUNDED;
}

export function canAcceptMilestone(
  role: Role | null | undefined,
  milestoneStatus: MilestoneStatus,
): boolean {
  if (role === Role.ADMIN) {
    return false;
  }
  return role === Role.CLIENT && milestoneStatus === MilestoneStatus.SUBMITTED;
}

export function canDisputeMilestone(
  role: Role | null | undefined,
  milestoneStatus: MilestoneStatus,
): boolean {
  if (!isMilestoneActor(role)) {
    return false;
  }
  const allowedStatus =
    milestoneStatus === MilestoneStatus.SUBMITTED ||
    milestoneStatus === MilestoneStatus.ACCEPTED;
  return allowedStatus;
}

export function canRaiseDispute(
  role: Role | null | undefined,
  milestoneStatus: MilestoneStatus,
): boolean {
  return canDisputeMilestone(role, milestoneStatus);
}

export function getPrimaryActionLabel(
  role: Role | null | undefined,
  milestoneStatus: MilestoneStatus,
): string | null {
  if (canFundMilestone(role, milestoneStatus)) {
    return "Fund";
  }
  if (canSubmitMilestone(role, milestoneStatus)) {
    return "Submit Work";
  }
  if (canAcceptMilestone(role, milestoneStatus)) {
    return "Accept";
  }
  if (canDisputeMilestone(role, milestoneStatus)) {
    return "Raise Dispute";
  }
  return null;
}

export function canResolveDispute(role?: Role | null): boolean {
  return role === Role.ADMIN;
}

export function isDisputeOpen(status: DisputeStatus): boolean {
  return status === DisputeStatus.OPEN;
}

export function isProjectCompleted(milestones: Milestone[]): boolean {
  return milestones.length > 0 &&
    milestones.every((milestone) =>
      [
        MilestoneStatus.RELEASED,
        MilestoneStatus.REFUNDED,
        MilestoneStatus.SPLIT_RESOLVED,
      ].includes(milestone.status)
    );
}

export function isProjectDisputed(milestones: Milestone[]): boolean {
  return milestones.some((milestone) => milestone.status === MilestoneStatus.DISPUTED);
}

export function isProjectActive(milestones: Milestone[]): boolean {
  if (milestones.length === 0) {
    return false;
  }
  return !isProjectCompleted(milestones) && !isProjectDisputed(milestones);
}
