import React, { useEffect, useRef, useState } from "react";
import { RetellWebClient } from "retell-client-js-sdk";
import "./App.css";

declare global {
  interface Window {
    retellWeb?: {
      createCallObject: (args: { conversationId: string }) => Promise<{ start: () => Promise<void> }>;
    };
  }
}

const App = () => {
  const retell = useRef(new RetellWebClient()).current;
  const [isLoading, setIsLoading] = useState(false);
  const [inCall, setInCall] = useState(false);

  useEffect(() => {
    const onStarted = () => { setInCall(true); setIsLoading(false); };
    const onEnded = () => { setInCall(false); setIsLoading(false); };
    const onError = (e: any) => { console.error("Retell error:", e); setInCall(false); setIsLoading(false); };

    retell.on?.("call_started", onStarted);
    retell.on?.("call_ended", onEnded);
    retell.on?.("error", onError);
    return () => {
      retell.off?.("call_started", onStarted);
      retell.off?.("call_ended", onEnded);
      retell.off?.("error", onError);
    };
  }, [retell]);

  const startCall = async () => {
    if (isLoading || inCall) return;
    setIsLoading(true);
    try {
      const response = await fetch("https://vicky-production.up.railway.app/create-web-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: "agent_8d6d93979343a84e1cdce8a15c" }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Backend ${response.status}: ${text || response.statusText}`);
      }

      const data = await response.json();

      if (data.access_token) {
        await retell.startCall({ accessToken: data.access_token });
        return;
      }
      if (data.web_call_url || data.url) {
        window.open(data.web_call_url || data.url, "_blank", "noopener,noreferrer");
        setIsLoading(false);
        return;
      }
      if (data.conversation_id) {
        if (!window.retellWeb) throw new Error("Legacy SDK not available.");
        const call = await window.retellWeb.createCallObject({ conversationId: data.conversation_id });
        await call.start();
        setInCall(true);
        setIsLoading(false);
        return;
      }

      throw new Error("Backend missing access_token, web_call_url, or conversation_id.");
    } catch (err: any) {
      console.error("Error starting call:", err);
      alert(err?.message || String(err));
      setIsLoading(false);
    }
  };

  const endCall = async () => {
    try {
      await (retell as any).stopCall?.();
      await (retell as any).endCall?.();
      await (retell as any).hangup?.();
    } catch (e) {
      console.warn("End call warning:", e);
    } finally {
      setInCall(false);
      setIsLoading(false);
    }
  };

  const handleClick = () => (inCall ? endCall() : startCall());
  const label = inCall ? "END CALL" : isLoading ? "CONNECTING..." : "VOICE CHAT";

  return (
    <div className="voice-widget">
      <div className="voice-logo">
        <img
          src="https://goxxii.com/wp-content/uploads/2025/08/836e723f-c3a3-432e-bd51-06252fb3c19c.png"
          alt="XXII Century"
        />
      </div>

      <button
        className={`voice-chat-btn ${isLoading || inCall ? "active" : ""}`}
        onClick={handleClick}
        disabled={isLoading && !inCall}
        title={inCall ? "End the call" : "Start a call"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.19 18a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 3.33 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.95.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.86.58 2.81.7A2 2 0 0 1 22 16.92z"
            fill="currentColor"
          />
        </svg>
        {label}
      </button>
      {/* Language selector removed on purpose */}
    </div>
  );
};

export default App;
