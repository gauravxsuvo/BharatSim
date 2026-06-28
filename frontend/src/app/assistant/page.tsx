'use client';

import { useState, useRef } from 'react';
import ChatWindow from '@/components/assistant/ChatWindow';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const SUGGESTED_QUESTIONS = [
  'What districts are most at risk of flooding in India?',
  'Explain the impact of temperature rise on crop yields.',
  'Which regions have the worst air quality in January?',
  'How does soil saturation affect flood simulation results?',
];

const DEMO_RESPONSES: Record<string, string> = {
  default: `I'm BharatSim's AI assistant, specialized in Indian environmental data and climate simulations.

Based on available data, I can help you:
• Analyze flood, heatwave, crop yield, and air quality risks across districts
• Interpret simulation results and environmental trends
• Compare conditions between different regions and time periods
• Explain the factors driving specific environmental outcomes

Please connect the backend API (running on port 8000) and set your OpenAI API key in the backend .env file for full functionality. In the meantime, I'm providing this demo response.`,
};

function getDemoResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('flood')) return `Based on historical data and simulation models, the districts most vulnerable to flooding in India are typically those near major river systems:\n\n• **Varanasi** (Ganges) — consistently high flood risk during monsoon\n• **Kolkata** (Hooghly) — urban flooding amplified by high population density\n• **Mumbai** (coastal + Mithi River) — storm surge and urban drainage failures\n\nFlood risk increases significantly when soil saturation exceeds 70% combined with rainfall multipliers above 2x normal levels.`;
  if (lower.includes('temperature') || lower.includes('crop') || lower.includes('yield')) return `Temperature has a significant non-linear impact on crop yields in India:\n\n• **Below 25°C**: Optimal for most Rabi crops (wheat, mustard)\n• **25–35°C**: Moderate stress, 5–15% yield reduction in heat-sensitive crops\n• **Above 35°C**: Severe heat stress, 20–40% yield reduction in rice and wheat\n\nCombined with reduced rainfall (-20%), northern districts like Lucknow and Varanasi could see up to **35% yield decline** in Kharif crops.`;
  if (lower.includes('air quality') || lower.includes('aqi')) return `Air quality patterns in January show a stark north-south divide:\n\n**Critical (AQI > 300):**\n• Varanasi: ~350 AQI\n• Lucknow: ~280 AQI\n\n**Moderate (AQI 80-200):**\n• Mumbai: ~145, Kolkata: ~165\n\n**Good (AQI < 100):**\n• Darjeeling: ~55, Coimbatore: ~70\n\nPrimary drivers in northern cities: stubble burning, vehicle emissions, low wind dispersion in winter fog conditions.`;
  if (lower.includes('soil') || lower.includes('saturation')) return `Soil saturation is a critical multiplier in flood simulations:\n\n**How it works:** When soil is already saturated (>80% capacity), additional rainfall cannot be absorbed and directly becomes runoff.\n\n**Simulation impact:**\n• Saturation 0.3: Baseline risk — most rainfall is absorbed\n• Saturation 0.6: Risk increases 2–3x — moderate runoff\n• Saturation 0.9: Maximum risk — nearly all rainfall becomes surface flow\n\nCombined with a rainfall multiplier of 2x, high soil saturation can trigger **severe to critical** flood risk in flat-terrain districts.`;
  return DEMO_RESPONSES.default;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim(), timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const assistantMsg: Message = { role: 'assistant', content: data.message, timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      // Demo response
      await new Promise(r => setTimeout(r, 800));
      const assistantMsg: Message = { role: 'assistant', content: getDemoResponse(text), timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', margin: '-32px' }}>
      {/* Header */}
      <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>AI Assistant</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>Powered by GPT-4o — specialized in Indian climate data</p>
        </div>
        {messages.length > 0 && (
          <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 14px' }} onClick={() => setMessages([])}>
            Clear chat
          </button>
        )}
      </div>

      {/* Suggested questions */}
      {messages.length === 0 && (
        <div className="suggested-chips" style={{ padding: '20px 32px' }}>
          {SUGGESTED_QUESTIONS.map((q, i) => (
            <button key={i} className="chip" id={`chip-${i}`} onClick={() => sendMessage(q)}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Chat window */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '0 12px' }}>
        <ChatWindow messages={messages} loading={loading} />
      </div>

      {/* Input bar */}
      <div className="chat-input-bar" style={{ padding: '16px 32px' }}>
        <input
          id="chat-input"
          ref={inputRef}
          className="input-field"
          type="text"
          placeholder="Ask about climate data, simulations, or districts..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          disabled={loading}
          style={{ flex: 1 }}
        />
        <button
          id="chat-send"
          className="btn-primary"
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}
        >
          {loading ? '...' : 'Send →'}
        </button>
      </div>
    </div>
  );
}
