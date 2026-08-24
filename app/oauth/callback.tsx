import { ThemedView } from "@/components/themed-view";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { isSafeOAuthUserPayload } from "@/shared/oauth";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
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

  useEffect(() => {
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;
    let active = true;
    const handleCallback = async () => {
      try {
        // Check for sessionToken in params first (web OAuth callback from server redirect)
        if (params.sessionToken) {
          await Auth.setSessionToken(params.sessionToken);

          // Decode and store user info if available
          if (isSafeOAuthUserPayload(params.user)) {
            try {
              // Use atob for base64 decoding (works in both web and React Native)
              const userJson =
                typeof atob !== "undefined"
                  ? atob(params.user)
                  : Buffer.from(params.user, "base64").toString("utf-8");
              const userData = JSON.parse(userJson);
                const userInfo: Auth.User = {
                id: userData.id,
                role: userData.role === "admin" ? "admin" : "user",
                openId: userData.openId,
                name: userData.name,
                email: userData.email,
                loginMethod: userData.loginMethod,
                lastSignedIn: new Date(userData.lastSignedIn || Date.now()),
              };
              await Auth.setUserInfo(userInfo);
            } catch {
            }
          } else if (params.user) {
          }

          if (!active) return;
          setStatus("success");
          redirectTimer = setTimeout(() => {
            if (active) router.replace("/(tabs)");
          }, 1000);
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
          await Auth.setSessionToken(sessionToken);
          // User info is already in the OAuth callback response
          // No need to fetch from API
          if (!active) return;
          setStatus("success");
          redirectTimer = setTimeout(() => {
            if (active) router.replace("/(tabs)");
          }, 1000);
          return;
        }

        // Otherwise, exchange code for session token
        if (!code || !state) {
          
          setStatus("error");
          setErrorMessage("Missing code or state parameter");
          return;
        }

        // Exchange code for session token
        const result = await Api.exchangeOAuthCode(code, state);

        if (result.sessionToken) {
          // Store session token
          await Auth.setSessionToken(result.sessionToken);

          // Store user info if available
          if (result.user) {
            const userInfo: Auth.User = {
              id: result.user.id,
              role: result.user.role === "admin" ? "admin" : "user",
              openId: result.user.openId,
              name: result.user.name,
              email: result.user.email,
              loginMethod: result.user.loginMethod,
              lastSignedIn: new Date(result.user.lastSignedIn || Date.now()),
            };
            await Auth.setUserInfo(userInfo);
          } else {
          }

          if (!active) return;
          setStatus("success");

          // Redirect to home after a short delay
          redirectTimer = setTimeout(() => {
            if (active) router.replace("/(tabs)");
          }, 1000);
        } else {
          if (!active) return;
          setStatus("error");
          setErrorMessage("No session token received");
        }
      } catch {
        if (!active) return;
        setStatus("error");
        setErrorMessage("Authentication could not be completed. Please try again.");
      }
    };

    void handleCallback();
    return () => {
      active = false;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [params.code, params.state, params.error, params.sessionToken, params.user, router]);

  return (
    <SafeAreaView className="flex-1" edges={["top", "bottom", "left", "right"]}>
      <ThemedView className="flex-1 items-center justify-center gap-4 p-5">
        {status === "processing" && (
          <>
            <ActivityIndicator size="large" />
            <Text className="mt-4 text-base leading-6 text-center text-foreground">
              Completing authentication...
            </Text>
          </>
        )}
        {status === "success" && (
          <>
            <Text className="text-base leading-6 text-center text-foreground">
              Authentication successful!
            </Text>
            <Text className="text-base leading-6 text-center text-foreground">
              Redirecting...
            </Text>
          </>
        )}
        {status === "error" && (
          <>
            <Text className="mb-2 text-xl font-bold leading-7 text-error">
              Authentication failed
            </Text>
            <Text className="text-base leading-6 text-center text-foreground">
              {errorMessage}
            </Text>
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}
