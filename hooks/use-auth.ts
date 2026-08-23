import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

type UseAuthOptions = {
  autoFetch?: boolean;
};

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Web platform: use cookie-based auth, fetch user from API
      if (Platform.OS === "web") {
        console.log("[useAuth] Fetching web session", { platform: Platform.OS });
        const apiUser = await Api.getMe();
        console.log("[useAuth] Web session lookup completed", { authenticated: Boolean(apiUser) });

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
          console.log("[useAuth] Web session loaded", { role: userInfo.role });
        } else {
          console.log("[useAuth] Web session is anonymous");
          setUser(null);
          await Auth.clearUserInfo();
        }
        return;
      }

      // Native platform: use token-based auth
      console.log("[useAuth] Checking native session");
      const sessionToken = await Auth.getSessionToken();
      console.log("[useAuth] Native session lookup completed", { hasSessionToken: Boolean(sessionToken) });
      if (!sessionToken) {
        console.log("[useAuth] Native session is anonymous");
        setUser(null);
        return;
      }

      // Use cached user info for native (token validates the session)
      const cachedUser = await Auth.getUserInfo();
      console.log("[useAuth] Native cached profile lookup completed", { hasCachedUser: Boolean(cachedUser) });
      if (cachedUser) {
        console.log("[useAuth] Native cached profile loaded", { role: cachedUser.role });
        setUser(cachedUser);
      } else {
        console.log("[useAuth] Native profile cache is empty");
        setUser(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch user");
      console.error("[useAuth] Session lookup failed", { errorType: error.name });
      setError(error);
      setUser(null);
    } finally {
      setLoading(false);
      console.log("[useAuth] Session lookup completed", { loading: false });
    }
  }, []);

  const logout = useCallback(async () => {
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
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);
  const isAdmin = useMemo(() => user?.role === "admin", [user?.role]);

  useEffect(() => {
    console.log("[useAuth] Initializing auth state", { autoFetch, platform: Platform.OS });
    if (autoFetch) {
      if (Platform.OS === "web") {
        // Web: fetch user from API directly (user will login manually if needed)
        fetchUser();
      } else {
        // Native: check for cached user info first for faster initial load
        Auth.getUserInfo().then((cachedUser) => {
          console.log("[useAuth] Native cache check completed", { hasCachedUser: Boolean(cachedUser) });
          if (cachedUser) {
            console.log("[useAuth] Using cached native profile", { role: cachedUser.role });
            setUser(cachedUser);
            setLoading(false);
          } else {
            // No cached user, check session token
            fetchUser();
          }
        });
      }
    } else {
      console.log("[useAuth] Automatic auth lookup disabled");
      setLoading(false);
    }
  }, [autoFetch, fetchUser]);

  useEffect(() => {
    console.log("[useAuth] Auth state updated", {
      hasUser: Boolean(user),
      loading,
      isAuthenticated,
      hasError: Boolean(error),
    });
  }, [user, loading, isAuthenticated, error]);

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
