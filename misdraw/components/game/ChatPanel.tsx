'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '@/hooks/useGameChannel';

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isDeadPlayer: boolean;
}

export default function ChatPanel({ messages, onSend, isDeadPlayer }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const visibleMessages = isDeadPlayer
    ? messages
    : messages.filter((m) => !m.is_dead);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {visibleMessages.map((msg, i) => (
          <div key={i} className={`text-sm ${msg.is_dead ? 'opacity-50' : ''}`}>
            <span className="font-medium" style={{ color: msg.color }}>
              {msg.nickname}
              {msg.is_dead && ' 💀'}:
            </span>{' '}
            <span className="text-gray-300">{msg.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-2 border-t border-gray-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isDeadPlayer ? 'Ghost chat...' : 'Say something...'}
          maxLength={200}
          className="flex-1 bg-gray-800 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/20 placeholder:text-gray-600"
        />
        <button
          onClick={handleSend}
          className="bg-gray-700 hover:bg-gray-600 text-white rounded px-3 py-2 text-sm transition-colors"
        >
          ↵
        </button>
      </div>
    </div>
  );
}
