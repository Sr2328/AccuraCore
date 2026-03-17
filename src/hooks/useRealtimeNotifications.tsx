import { useEffect } from "react";
import { supabase } from "../integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useRealtimeNotifications(userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("realtime-alerts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
        queryClient.invalidateQueries({ queryKey: ["notification-reads"] });
        toast.info(payload.new.title as string, { description: (payload.new.body as string) || undefined });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => {
        queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
        queryClient.invalidateQueries({ queryKey: ["admin-attendance-today"] });
        queryClient.invalidateQueries({ queryKey: ["hr-attendance"] });
        queryClient.invalidateQueries({ queryKey: ["employee-attendance"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "gate_passes" }, () => {
        queryClient.invalidateQueries({ queryKey: ["gate-passes"] });
        queryClient.invalidateQueries({ queryKey: ["admin-gate-passes"] });
        queryClient.invalidateQueries({ queryKey: ["hr-gatepasses"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "stock_movements" }, () => {
        queryClient.invalidateQueries({ queryKey: ["store-items"] });
        queryClient.invalidateQueries({ queryKey: ["store-items-list"] });
        queryClient.invalidateQueries({ queryKey: ["admin-low-stock"] });
        queryClient.invalidateQueries({ queryKey: ["stock-in-recent"] });
        queryClient.invalidateQueries({ queryKey: ["stock-out-recent"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
