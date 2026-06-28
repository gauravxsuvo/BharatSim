'use client';

import { useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatWindowProps {
  messages: Message[];
  loading: boolean;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatWindow({ messages, loading }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div id="chat-messages" className="chat-messages">
      {messages.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 60 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🤖</div>
          <p>Ask me anything about climate simulations, environmental data, or India's districts.</p>
        </div>
      )}

      {messages.map((msg, i) => (
        <div
          key={i}
          style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
          className="animate-fadeIn"
        >
          <div
            className={`message-bubble ${msg.role === 'user' ? 'message-user' : 'message-assistant'}`}
          >
            {msg.content}
          </div>
          <div className={`message-time`}>{formatTime(msg.timestamp)}</div>
        </div>
      ))}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div className="message-bubble message-assistant">
            <div className="typing-indicator">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
