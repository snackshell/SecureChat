import { useEffect, useRef, useCallback, useState } from 'react';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface UseWebSocketProps {
  token: string | null;
  onMessage?: (message: WebSocketMessage) => void;
}

// const WEBSOCKET_PORT = 5000; // Explicitly define the backend WebSocket port

export function useWebSocket({ token, onMessage }: UseWebSocketProps) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const connect = useCallback(() => {
    if (!token || ws.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Use explicit port for WebSocket connection to the backend server
    // const wsUrl = `${protocol}//${window.location.hostname}:${WEBSOCKET_PORT}/ws`;
    const wsUrl = `${protocol}//${window.location.host}/ws`; // Vercel uses standard ports
    console.log(`Attempting WebSocket connection to: ${wsUrl}`);

    try {
      ws.current = new WebSocket(wsUrl);
    } catch (error) {
      console.error("Failed to construct WebSocket:", error, "URL:", wsUrl);
      return; // Stop if construction fails
    }

    ws.current.onopen = () => {
      console.log("WebSocket connection established");
      setIsConnected(true);
      
      // Authenticate
      if (ws.current?.readyState === WebSocket.OPEN) { // Check again before send
        ws.current?.send(JSON.stringify({
          type: 'authenticate',
          token,
        }));
      } else {
        console.error("WebSocket not open during onopen, cannot send auth.");
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string);
        console.log('Received WebSocket message:', message);
        setLastMessage(message);
        onMessage?.(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.current.onclose = (event) => {
      console.log("WebSocket connection closed. Code:", event.code, "Reason:", event.reason);
      setIsConnected(false);
      if (!event.wasClean && token) { // Only attempt reconnect if not a clean close and token is present
        console.log("Attempting to reconnect WebSocket in 3 seconds...");
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
      // No automatic reconnect on error to prevent spamming if server is down or URL is fundamentally wrong.
      // Reconnect logic is primarily for onclose unexpected disconnections.
    };
  }, [token, onMessage]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not open. Cannot send message:", message.type);
    }
  }, []);

  const sendTypingStatus = useCallback((isTyping: boolean) => {
    sendMessage({
      type: 'typing',
      isTyping,
    });
  }, [sendMessage]);

  useEffect(() => {
    if (token) {
      console.log("Token present, attempting to connect WebSocket.");
      connect();
    } else {
      console.log("No token, WebSocket will not connect yet.");
      if (ws.current) { // If there was an old connection, clean it up
        ws.current.onclose = null;
        ws.current.close(1000, "User logged out or token removed"); // 1000 is a normal closure
        ws.current = null;
      }
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.current) {
        console.log("Cleaning up WebSocket connection.");
        ws.current.close(1000, "Component unmounting");
        ws.current = null;
      }
    };
  }, [token, connect]);

  return {
    isConnected,
    sendMessage,
    sendTypingStatus,
    lastMessage,
  };
}
