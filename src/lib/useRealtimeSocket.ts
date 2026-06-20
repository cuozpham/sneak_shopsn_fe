"use client";

import { useEffect, useRef } from "react";
import type { RealtimeEvent } from "@/lib/types";
import { useRealtimeSocketContext } from "@/components/realtime/RealtimeSocketProvider";

export function useRealtimeSocket(
  enabled: boolean,
  onEvent: (event: RealtimeEvent) => void,
) {
  const ctx = useRealtimeSocketContext();
  const handlerRef = useRef(onEvent);

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled || !ctx) {
      return;
    }
    return ctx.subscribe((event) => handlerRef.current(event));
  }, [enabled, ctx]);

  return ctx?.connected ?? false;
}
