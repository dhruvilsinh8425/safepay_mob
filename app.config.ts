import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "safe_pay_mob1",
  slug: config.slug ?? "safe_pay_mob1",
  extra: {
    ...config.extra,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
  },
});
