import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { createAuthRequestGate } from "@/lib/auth-request";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

type UseAuthOptions = {
  autoFetch?: boolean;
};

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const requestGate = useRef(createAuthRequestGate()).current;

  const fetchUser = useCallback(async () => {
    const requestId = requestGate.begin();
    const isCurrent = () => requestGate.isCurrent(requestId);
    try {
      setLoading(true);
      setError(null);

      // Web platform: use cookie-based auth, fetch user from API
      if (Platform.OS === "web") {
        const apiUser = await Api.getMe();
        if (!isCurrent()) return;

        if (apiUser) {
          const userInfo: Auth.User = {
            id: apiUser.id,
            role: apiUser.role,
            openId: apiUser.openId,
            name: apiUser.name,
            email: apiUser.email,
            loginMethod: apiUser.loginMethod,
            lastSignedIn: new Date(apiUser.lastSignedIn),
          };
          setUser(userInfo);
          // Cache user info in localStorage for faster subsequent loads
          await Auth.setUserInfo(userInfo);
        } else {
          setUser(null);
          await Auth.clearUserInfo();
        }
        return;
      }

      // Native platform: use token-based auth
      const sessionToken = await Auth.getSessionToken();
      if (!isCurrent()) return;
      if (!sessionToken) {
        setUser(null);
        return;
      }

      // Use cached user info for native (token validates the session)
      const cachedUser = await Auth.getUserInfo();
      if (!isCurrent()) return;
      setUser(cachedUser);
    } catch (err) {
      if (!isCurrent()) return;
      const error = err instanceof Error ? err : new Error("Failed to fetch user");
      console.error("[useAuth] Session lookup failed", { errorType: error.name });
      setError(error);
      setUser(null);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [requestGate]);

  const logout = useCallback(async () => {
    requestGate.invalidate();
    try {
      await Api.logout();
    } catch (err) {
      console.warn("[Auth] Logout API call failed; clearing local session", {
        errorType: err instanceof Error ? err.name : "unknown",
      });
      // Continue with logout even if API call fails
    } finally {
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      setUser(null);
      setError(null);
      setLoading(false);
    }
  }, [requestGate]);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);
  const isAdmin = useMemo(() => user?.role === "admin", [user?.role]);

  useEffect(() => {
    if (autoFetch) {
      if (Platform.OS === "web") {
        // Web: fetch user from API directly (user will login manually if needed)
        void fetchUser();
      } else {
        // Native: check for cached user info first for faster initial load
        const cacheRequestId = requestGate.begin();
        Auth.getUserInfo().then((cachedUser) => {
          if (!requestGate.isCurrent(cacheRequestId)) return;
          if (cachedUser) {
            setUser(cachedUser);
            setLoading(false);
          } else {
            // No cached user, check session token
            void fetchUser();
          }
        }).catch((err) => {
          if (!requestGate.isCurrent(cacheRequestId)) return;
          console.warn("[useAuth] Native cache lookup failed; retrying session lookup", {
            errorType: err instanceof Error ? err.name : "unknown",
          });
          void fetchUser();
        });
      }
    } else {
      setLoading(false);
    }

    return () => requestGate.invalidate();
  }, [autoFetch, fetchUser, requestGate]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    refresh: fetchUser,
    logout,
  };
}
