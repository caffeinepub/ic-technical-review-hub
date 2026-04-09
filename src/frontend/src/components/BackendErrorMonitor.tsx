import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useActor } from "../hooks/useActor";

/**
 * Monitors backend availability and shows an error banner fast:
 * - If actor stays in isFetching=true for >5 seconds → show error immediately
 * - If actor becomes ready but no successful query arrives within 8 seconds → show error
 * - Clears on any successful query result
 */
export default function BackendErrorMonitor() {
  const [isBackendUnavailable, setIsBackendUnavailable] = useState(false);
  const queryClient = useQueryClient();
  const { isFetching: actorFetching } = useActor();

  // Track refs so timers can reference latest state without stale closures
  const actorFetchingRef = useRef(actorFetching);
  const isBackendUnavailableRef = useRef(isBackendUnavailable);
  const actorReadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hadSuccessRef = useRef(false);

  useEffect(() => {
    actorFetchingRef.current = actorFetching;
  }, [actorFetching]);

  useEffect(() => {
    isBackendUnavailableRef.current = isBackendUnavailable;
  }, [isBackendUnavailable]);

  // Timer 1: Actor init deadline — if actor stays initializing for >5s, flag unavailable
  useEffect(() => {
    if (actorFetching) {
      // Actor is initializing — start the 5-second countdown
      actorReadyTimerRef.current = setTimeout(() => {
        if (actorFetchingRef.current && !hadSuccessRef.current) {
          setIsBackendUnavailable(true);
        }
      }, 5000);
    } else {
      // Actor became ready — cancel the init timer
      if (actorReadyTimerRef.current) {
        clearTimeout(actorReadyTimerRef.current);
        actorReadyTimerRef.current = null;
      }

      // Timer 2: First-query deadline — if actor is ready but no success within 8s, flag unavailable
      if (!hadSuccessRef.current && !isBackendUnavailableRef.current) {
        queryTimeoutRef.current = setTimeout(() => {
          if (!hadSuccessRef.current) {
            setIsBackendUnavailable(true);
          }
        }, 8000);
      }
    }

    return () => {
      if (actorReadyTimerRef.current) {
        clearTimeout(actorReadyTimerRef.current);
        actorReadyTimerRef.current = null;
      }
    };
  }, [actorFetching]);

  // React Query cache monitor — set error on backend errors, clear on success
  useEffect(() => {
    const handleQueryError = (error: unknown) => {
      const err = error as { message?: string; code?: string; name?: string };
      const isBackendError =
        err?.message?.includes("fetch") ||
        err?.message?.includes("network") ||
        err?.message?.includes("canister") ||
        err?.message?.includes("rejected") ||
        err?.message?.includes("unavailable") ||
        err?.message?.includes("timeout") ||
        err?.code === "ECONNREFUSED" ||
        err?.name === "TypeError";

      if (isBackendError) {
        setIsBackendUnavailable(true);
      }
    };

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated") {
        if (event.query.state.status === "error") {
          handleQueryError(event.query.state.error);
        } else if (event.query.state.status === "success") {
          // Cancel the query deadline timer on first success
          hadSuccessRef.current = true;
          if (queryTimeoutRef.current) {
            clearTimeout(queryTimeoutRef.current);
            queryTimeoutRef.current = null;
          }
          setIsBackendUnavailable(false);
        }
      }
    });

    const unsubscribeMutation = queryClient
      .getMutationCache()
      .subscribe((event) => {
        if (
          event.type === "updated" &&
          event.mutation.state.status === "error"
        ) {
          handleQueryError(event.mutation.state.error);
        }
      });

    return () => {
      unsubscribe();
      unsubscribeMutation();
      if (queryTimeoutRef.current) {
        clearTimeout(queryTimeoutRef.current);
        queryTimeoutRef.current = null;
      }
    };
  }, [queryClient]);

  if (!isBackendUnavailable) {
    return null;
  }

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
      <div className="backend-error-banner flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg max-w-2xl">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium text-sm">
            The backend service is currently unavailable. Please try again later
            or restart the application.
          </p>
        </div>
      </div>
    </div>
  );
}
