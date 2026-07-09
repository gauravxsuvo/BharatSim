'use client';

import { useRef, useEffect } from 'react';
import { Bot } from 'lucide-react';

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
        <div className="mt-16 flex flex-col items-center gap-3 text-center text-muted-foreground">
          <Bot size={40} strokeWidth={1.5} />
          <p className="font-body max-w-sm text-base">
            Ask me anything about climate simulations, environmental data, or India&apos;s districts.
          </p>
        </div>
      )}

      {messages.map((msg, i) => (
        <div
          key={`${msg.role}-${i}-${msg.timestamp}`}
          className={`animate-fadeIn flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
        >
          {msg.role === 'user' ? (
            <div className="max-w-[70%] whitespace-pre-wrap border border-foreground bg-foreground px-5 py-3 font-body text-background">
              {msg.content}
            </div>
          ) : (
            <div className="relative max-w-[75%] border border-foreground bg-background px-6 pb-5 pt-8">
              <span aria-hidden className="font-display pointer-events-none absolute left-3 top-0 text-6xl leading-none text-foreground/15">
                &ldquo;
              </span>
              <div className="font-body whitespace-pre-wrap text-base leading-relaxed">{msg.content}</div>
            </div>
          )}
          <div className="mt-1.5 font-mono text-xs text-muted-foreground">{formatTime(msg.timestamp)}</div>
        </div>
      ))}

      {loading && (
        <div className="flex flex-col items-start">
          <div className="border border-foreground bg-background px-6 py-4">
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
