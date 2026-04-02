import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

export default function BackendErrorMonitor() {
  const [isBackendUnavailable, setIsBackendUnavailable] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleQueryError = (error: any) => {
      // Check if error indicates backend unavailability
      const isBackendError =
        error?.message?.includes("fetch") ||
        error?.message?.includes("network") ||
        error?.message?.includes("canister") ||
        error?.message?.includes("rejected") ||
        error?.message?.includes("unavailable") ||
        error?.message?.includes("timeout") ||
        error?.code === "ECONNREFUSED" ||
        error?.name === "TypeError";

      if (isBackendError) {
        setIsBackendUnavailable(true);
      }
    };

    // Set up global error handler for React Query
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.query.state.status === "error") {
        handleQueryError(event.query.state.error);
      }
    });

    // Also monitor mutation errors
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
    };
  }, [queryClient]);

  // Monitor for successful queries to clear error state
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.query.state.status === "success") {
        setIsBackendUnavailable(false);
      }
    });

    return () => {
      unsubscribe();
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
