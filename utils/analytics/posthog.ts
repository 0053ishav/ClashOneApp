import { ENV } from "@/config/env";
import Posthog from "posthog-react-native";

export const posthog = new Posthog (ENV.KEYS.POSTHOG, {
    host: "https://app.posthog.com",
    flushAt: 1,
    flushInterval: 0,
})