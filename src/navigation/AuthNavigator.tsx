import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { Login } from "../screens/Auth/Login";
import { Register } from "../screens/Auth/Register";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Login" component={Login} options={{ title: "Login" }} />
      <Stack.Screen name="Register" component={Register} options={{ title: "Register" }} />
    </Stack.Navigator>
  );
}

