export type AuthUiStatus = "processing" | "success" | "error";

export type AuthStatusCopy = {
  title: string;
  body: string;
  tone: "neutral" | "success" | "error";
};

export function getAuthStatusCopy(status: AuthUiStatus, errorMessage?: string | null): AuthStatusCopy {
  if (status === "processing") {
    return {
      title: "Completing authentication",
      body: "Securely connecting your creator workspace.",
      tone: "neutral",
    };
  }

  if (status === "success") {
    return {
      title: "Authentication successful",
      body: "Your creator workspace is ready. Redirecting…",
      tone: "success",
    };
  }

  return {
    title: "Authentication could not be completed",
    body: errorMessage || "Please try again to reconnect your creator workspace.",
    tone: "error",
  };
}
