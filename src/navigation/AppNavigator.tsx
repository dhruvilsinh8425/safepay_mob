import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { DisputeResolve } from "../screens/Admin/DisputeResolve";
import { Dashboard } from "../screens/Dashboard";
import { DisputeCreate } from "../screens/Disputes/DisputeCreate";
import { DisputesList } from "../screens/Disputes/DisputesList";
import { SubmitDeliverables } from "../screens/Milestones/SubmitDeliverables";
import { ProjectCreateModal } from "../screens/Projects/ProjectCreateModal";
import { ProjectDetails } from "../screens/Projects/ProjectDetails";
import { ProjectsList } from "../screens/Projects/ProjectsList";
import { Profile } from "../screens/Profile";

export type AppTabsParamList = {
  Dashboard: undefined;
  Projects: undefined;
  Disputes: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  MainTabs: undefined;
  ProjectCreateModal: undefined;
  ProjectDetails: { projectId: string };
  SubmitDeliverables: { projectId: string; milestoneId: string };
  DisputeCreate: { projectId: string; milestoneId: string };
  DisputeResolve: { disputeId: string; projectId?: string; milestoneId?: string };
};

const Tabs = createBottomTabNavigator<AppTabsParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function TabsNavigator() {
  return (
    <Tabs.Navigator>
      <Tabs.Screen name="Dashboard" component={Dashboard} />
      <Tabs.Screen name="Projects" component={ProjectsList} />
      <Tabs.Screen name="Disputes" component={DisputesList} />
      <Tabs.Screen name="Profile" component={Profile} />
    </Tabs.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={TabsNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProjectCreateModal"
        component={ProjectCreateModal}
        options={{ presentation: "modal", title: "Create Project" }}
      />
      <Stack.Screen
        name="ProjectDetails"
        component={ProjectDetails}
        options={{ title: "Project Details" }}
      />
      <Stack.Screen
        name="SubmitDeliverables"
        component={SubmitDeliverables}
        options={{ title: "Submit Deliverables" }}
      />
      <Stack.Screen
        name="DisputeCreate"
        component={DisputeCreate}
        options={{ presentation: "modal", title: "Raise Dispute" }}
      />
      <Stack.Screen
        name="DisputeResolve"
        component={DisputeResolve}
        options={{ title: "Resolve Dispute" }}
      />
    </Stack.Navigator>
  );
}

