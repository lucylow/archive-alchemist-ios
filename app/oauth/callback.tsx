import { ThemedView } from "@/components/themed-view";
import { getLoginUrl, startOAuthLogin } from "@/constants/oauth";
import { getAuthRetryLabel, getAuthStatusCopy } from "@/lib/auth-ui";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { isSafeOAuthCode, isSafeOAuthSessionToken, isSafeOAuthState, isSafeOAuthUserPayload } from "@/shared/oauth";
import { normalizeCachedUser } from "@/lib/_core/user-cache";
import { createOAuthCallbackGate } from "@/lib/oauth-callback";
import { readReduceMotionSetting } from "@/lib/reduce-motion";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
    sessionToken?: string;
    user?: string;
  }>();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const callbackGate = useRef(createOAuthCallbackGate()).current;
  const loadingPulse = useRef(new Animated.Value(0)).current;
  const retryInFlight = useRef(false);

  useEffect(() => {
    let mounted = true;
    void readReduceMotionSetting(() => AccessibilityInfo.isReduceMotionEnabled()).then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      loadingPulse.stopAnimation();
      loadingPulse.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingPulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(loadingPulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [loadingPulse, reduceMotion]);

  useEffect(() => {
    const callbackId = callbackGate.begin();
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;
    const isCurrent = () => callbackGate.isCurrent(callbackId);
    const scheduleRedirect = () => {
      redirectTimer = setTimeout(() => {
        if (isCurrent()) router.replace("/(tabs)");
      }, 1000);
    };
    const handleCallback = async () => {
      console.log("[OAuth] Callback handler triggered", {
        hasCode: Boolean(params.code),
        hasState: Boolean(params.state),
        hasError: Boolean(params.error),
        hasSessionToken: Boolean(params.sessionToken),
        hasUser: Boolean(params.user),
      });
      try {
        // Check for sessionToken in params first (web OAuth callback from server redirect)
        if (params.sessionToken) {
          if (!isSafeOAuthSessionToken(params.sessionToken)) {
            throw new Error("Authentication response contained an invalid session token");
          }
          await Auth.setSessionToken(params.sessionToken);

          // Decode and store user info if available
          if (isSafeOAuthUserPayload(params.user)) {
            try {
              // Use atob for base64 decoding (works in both web and React Native)
              const userJson =
                typeof atob !== "undefined"
                  ? atob(params.user)
                  : Buffer.from(params.user, "base64").toString("utf-8");
              const userInfo = normalizeCachedUser(JSON.parse(userJson));
              if (!userInfo) throw new Error("Invalid OAuth user profile");
              await Auth.setUserInfo(userInfo);
            } catch {
              console.warn("[OAuth] User profile payload could not be parsed");
            }
          } else if (params.user) {
            console.warn("[OAuth] User profile payload exceeded safe bounds");
          }

          if (!isCurrent()) return;
          setStatus("success");
          scheduleRedirect();
          return;
        }

        // Get URL from params or Linking
        let url: string | null = null;

        // Try to get from local search params first (works with expo-router)
        if (params.code || params.state || params.error) {
          // Extract from params
          const urlParams = new URLSearchParams();
          if (params.code) urlParams.set("code", params.code);
          if (params.state) urlParams.set("state", params.state);
          if (params.error) urlParams.set("error", params.error);
          url = `?${urlParams.toString()}`;
        } else {
          // Fallback: try to get from Linking
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl) {
            url = initialUrl;
          }
        }

        // Check for error
        const error =
          params.error || (url ? new URL(url, "http://dummy").searchParams.get("error") : null);
        if (error) {
          console.warn("[OAuth] Provider returned an error parameter");
          if (!isCurrent()) return;
          setStatus("error");
          setErrorMessage("The sign-in provider could not complete authentication. Please try again.");
          return;
        }

        // Check for code and state
        let code: string | null = null;
        let state: string | null = null;
        let sessionToken: string | null = null;

        // Try to get from params first
        if (params.code && params.state) {
          code = params.code;
          state = params.state;
        } else if (url) {
          // Parse from URL
          try {
            const urlObj = new URL(url);
            code = urlObj.searchParams.get("code");
            state = urlObj.searchParams.get("state");
            sessionToken = urlObj.searchParams.get("sessionToken");
          } catch {
            console.warn("[OAuth] Full callback URL parsing failed; trying fallback parser");
            // Try parsing as relative URL with query params
            const match = url.match(/[?&](code|state|sessionToken)=([^&]+)/g);
            if (match) {
              match.forEach((param) => {
                const [key, value] = param.substring(1).split("=");
                if (key === "code") code = decodeURIComponent(value);
                if (key === "state") state = decodeURIComponent(value);
                if (key === "sessionToken") sessionToken = decodeURIComponent(value);
              });
            }
          }
        }


        // If we have sessionToken directly from URL, use it
        if (sessionToken) {
          if (!isSafeOAuthSessionToken(sessionToken)) {
            throw new Error("Authentication response contained an invalid session token");
          }
          await Auth.setSessionToken(sessionToken);
          // User info is already in the OAuth callback response
          // No need to fetch from API
          if (!isCurrent()) return;
          setStatus("success");
          scheduleRedirect();
          return;
        }

        // Otherwise, exchange code for session token
        if (!code || !state) {
          console.error("[OAuth] Missing code or state parameter", {
            hasCode: !!code,
            hasState: !!state,
          });
          if (!isCurrent()) return;
          setStatus("error");
          setErrorMessage("Missing code or state parameter");
          return;
        }

        // Exchange code for session token
        if (!isSafeOAuthCode(code) || !isSafeOAuthState(state)) {
          throw new Error("Authentication request contained invalid OAuth parameters");
        }
        const result = await Api.exchangeOAuthCode(code, state);

        if (result.sessionToken) {
          // Store session token
          await Auth.setSessionToken(result.sessionToken);

          // Store the validated user profile returned by the code exchange.
          await Auth.setUserInfo(result.user);
          console.log("[OAuth] User profile stored");

          if (!isCurrent()) return;
          setStatus("success");

          // Redirect to home after a short delay
          scheduleRedirect();
        } else {
          console.error("[OAuth] Authentication response did not include a session token");
          if (!isCurrent()) return;
          setStatus("error");
          setErrorMessage("No session token received");
        }
      } catch (error) {
        console.error("[OAuth] Callback processing failed", {
          errorType: error instanceof Error ? error.name : "unknown",
        });
        if (!isCurrent()) return;
        setStatus("error");
        setErrorMessage("Authentication could not be completed. Please try again.");
      }
    };

    void handleCallback();
    return () => {
      callbackGate.invalidate();
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [params.code, params.state, params.error, params.sessionToken, params.user, router, callbackGate]);

  const copy = getAuthStatusCopy(status, errorMessage);
  const retryLogin = async () => {
    if (retryInFlight.current) return;
    retryInFlight.current = true;
    const retryId = callbackGate.begin();
    setIsRetrying(true);
    setStatus("processing");
    setErrorMessage(null);
    try {
      if (!getLoginUrl()) {
        if (callbackGate.isCurrent(retryId)) {
          setStatus("error");
          setErrorMessage("Sign-in is not configured for this build. Please contact the app owner.");
        }
        return;
      }
      const started = await startOAuthLogin();
      if (!started && callbackGate.isCurrent(retryId)) {
        setStatus("error");
        setErrorMessage("The sign-in window could not be opened. Check your connection and try again.");
      }
    } finally {
      retryInFlight.current = false;
      if (callbackGate.isCurrent(retryId)) setIsRetrying(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" edges={["top", "bottom", "left", "right"]}>
      <ThemedView className="flex-1 items-center justify-center p-5">
        <View style={styles.panel} accessibilityLiveRegion="polite">
          <View style={styles.mark} accessibilityLabel="Archive Alchemist authentication status">
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  opacity: status === "processing" ? (reduceMotion ? 0.55 : loadingPulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.85] })) : 0.25,
                  transform: [{ scale: status === "processing" && !reduceMotion ? loadingPulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.12] }) : 1 }],
                },
              ]}
            />
            <View style={styles.markCore}><Text style={styles.markText}>AA</Text></View>
          </View>
          {status === "processing" && <ActivityIndicator color="#F4C95D" size="small" />}
          {status === "success" && <Text style={styles.successMark} accessibilityLabel="Authentication completed">✓</Text>}
          {status === "error" && <Text style={styles.errorMark} accessibilityLabel="Authentication failed">!</Text>}
          <Text style={[styles.title, status === "error" && styles.errorTitle]} accessibilityRole="header">{copy.title}</Text>
          <Text style={styles.body}>{copy.body}</Text>
          {status === "error" && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Try authentication again"
              accessibilityHint="Reopens the secure sign-in flow"
              accessibilityState={{ busy: isRetrying, disabled: isRetrying }}
              disabled={isRetrying}
              onPress={() => void retryLogin()}
              style={({ pressed }) => [styles.retryButton, isRetrying && styles.retryButtonBusy, pressed && !isRetrying && styles.retryButtonPressed]}
            >
              {isRetrying && <ActivityIndicator color="#100B24" size="small" />}
              <Text style={styles.retryText}>{getAuthRetryLabel(isRetrying)}</Text>
            </Pressable>
          )}
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  panel: { width: "100%", maxWidth: 420, alignItems: "center", padding: 28, borderRadius: 28, backgroundColor: "#17112F", borderWidth: 1, borderColor: "#3A2B63", gap: 12 },
  mark: { width: 92, height: 92, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  pulseRing: { position: "absolute", width: 84, height: 84, borderRadius: 42, borderWidth: 1, borderColor: "#F4C95D", backgroundColor: "#2C1D55" },
  markCore: { width: 62, height: 62, borderRadius: 31, backgroundColor: "#F4C95D", alignItems: "center", justifyContent: "center" },
  markText: { color: "#100B24", fontSize: 17, fontWeight: "900", letterSpacing: 1 },
  title: { color: "#F8F4FF", fontSize: 20, lineHeight: 27, fontWeight: "800", textAlign: "center" },
  errorTitle: { color: "#FF9D9D" },
  body: { color: "#B9AECF", fontSize: 15, lineHeight: 22, textAlign: "center" },
  successMark: { color: "#62D8A7", fontSize: 20, fontWeight: "900" },
  errorMark: { color: "#FF9D9D", fontSize: 20, fontWeight: "900" },
  retryButton: { minWidth: 160, alignItems: "center", paddingHorizontal: 20, paddingVertical: 13, marginTop: 8, borderRadius: 16, backgroundColor: "#F4C95D" },
  retryButtonPressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  retryButtonBusy: { opacity: 0.72 },
  retryText: { color: "#100B24", fontSize: 15, fontWeight: "800" },
});
