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
    const onStarted = () => {
      setInCall(true);
      setIsLoading(false); // ✅ re-enable button when connected
    };
    const onEnded = () => {
      setInCall(false);
      setIsLoading(false);
    };
    const onError = (e: any) => {
      console.error("Retell error:", e);
      setInCall(false);
      setIsLoading(false);
    };

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
      const response = await fetch(
        "https://vicky-production.up.railway.app/create-web-call",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent_id: "agent_8e3ee5fa5f3ee9e20ea6cbcccf" }),
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Backend ${response.status}: ${text || response.statusText}`);
      }

      const data = await response.json();
      if (data.access_token) {
        await retell.startCall({ accessToken: data.access_token });
        return; // call_started will flip state
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
      <div className="voice-widget-main">
        <div className="voice-logo">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/3/3f/Silver_disc_icon.png"
            alt="Logo"
            style={{ width: "30px", height: "30px", borderRadius: "50%" }}
          />
        </div>

        <button
          className={`voice-chat-btn ${isLoading || inCall ? "active" : ""}`}
          onClick={handleClick}
          disabled={isLoading && !inCall}  // ✅ disable only while connecting
          title={inCall ? "End the call" : "Start a call"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            style={{ width: "20px", height: "20px", marginRight: "8px" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 6.75c0 8.284 6.716 15 15 15h0a1.5 1.5 0 001.5-1.5v-2.25a1.5 1.5 0 00-1.394-1.493l-3.553-.296a1.5 1.5 0 00-1.284.595l-1.353 1.804a11.948 11.948 0 01-5.547-5.547l1.804-1.353a1.5 1.5 0 00.595-1.284l-.296-3.553A1.5 1.5 0 004.5 3.75H2.25A1.5 1.5 0 00.75 5.25v.002z"
            />
          </svg>
          {label}
        </button>

        <div className="voice-lang">
          <span className="flag-emoji">🇺🇸</span>
          <span style={{ fontSize: "14px", fontWeight: 600 }}>EN</span>
        </div>
      </div>
    </div>
  );
};

export default App;
