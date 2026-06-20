"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/store/auth";
import type { RealtimeEvent } from "@/lib/types";

type Listener = (event: RealtimeEvent) => void;

type RealtimeSocketContextValue = {
  connected: boolean;
  subscribe: (listener: Listener) => () => void;
};

const RealtimeSocketContext = createContext<RealtimeSocketContextValue | null>(null);

const toWsUrl = (baseUrl: string) => {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.startsWith("https://")) return trimmed.replace(/^https:\/\//, "wss://");
  if (trimmed.startsWith("http://")) return trimmed.replace(/^http:\/\//, "ws://");
  if (trimmed.startsWith("wss://") || trimmed.startsWith("ws://")) return trimmed;
  return `ws://${trimmed}`;
};

export function RealtimeSocketProvider({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const listenersRef = useRef(new Set<Listener>());
  const socketRef = useRef<WebSocket | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposedRef = useRef(false);
  const [connected, setConnected] = useState(false);

  const subscribe = useCallback((listener: Listener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    disposedRef.current = false;
    if (!token) {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      try {
        socketRef.current?.close();
      } catch {
        // ignore
      }
      socketRef.current = null;
      setConnected(false);
      return () => {
        disposedRef.current = true;
      };
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.APP_BACKEND_BASE_URL ||
      "https://sneakshop-production.up.railway.app";
    const url = `${toWsUrl(baseUrl)}/ws/realtime?token=${encodeURIComponent(token)}`;

    const connect = () => {
      if (disposedRef.current) return;
      try {
        socketRef.current?.close();
      } catch {
        // ignore
      }

      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => setConnected(true);
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as RealtimeEvent;
          listenersRef.current.forEach((listener) => listener(payload));
        } catch {
          // ignore malformed payloads
        }
      };
      socket.onerror = () => {
        try {
          socket.close();
        } catch {
          // ignore
        }
      };
      socket.onclose = () => {
        setConnected(false);
        if (!disposedRef.current) {
          retryTimerRef.current = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      disposedRef.current = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      try {
        socketRef.current?.close();
      } catch {
        // ignore
      }
      socketRef.current = null;
      setConnected(false);
    };
  }, [token]);

  const value = useMemo<RealtimeSocketContextValue>(
    () => ({ connected, subscribe }),
    [connected, subscribe]
  );

  return <RealtimeSocketContext.Provider value={value}>{children}</RealtimeSocketContext.Provider>;
}

export function useRealtimeSocketContext() {
  return useContext(RealtimeSocketContext);
}
