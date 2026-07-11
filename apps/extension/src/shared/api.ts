import { useEffect, useState } from "react";

type ApiState = "checking" | "online" | "offline";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787";

export function useApiHealth() {
  const [state, setState] = useState<ApiState>("checking");

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2500);

    fetch(`${apiBaseUrl}/health`, { signal: controller.signal })
      .then((response) => {
        setState(response.ok ? "online" : "offline");
      })
      .catch(() => setState("offline"))
      .finally(() => window.clearTimeout(timeout));

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return state;
}
