'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '@/hooks/useGameChannel';
import VotingPanel from './VotingPanel';

export interface SystemMessage {
  id: string;
  text: string;
}

export interface VotingPanelProps {
  voteSessionId: string;
  currentPlayerId: string;
  alivePlayers: { id: string; nickname: string; color: string }[];
  voterIds: string[];
  myVoteTargetId: string | null;
  isAlive: boolean;
  totalVoters: number;
}

interface Props {
  messages: ChatMessage[];
  systemMessages: SystemMessage[];
  onSend: (text: string) => void;
  isDeadPlayer: boolean;
  voting?: VotingPanelProps | null;
}

export default function ChatPanel({ messages, systemMessages, onSend, isDeadPlayer, voting }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, systemMessages]);

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
        {systemMessages.map((sm) => (
          <div key={sm.id} className="text-sm text-center py-1">
            <span className="bg-gray-800 text-gray-400 px-3 py-1 rounded-full text-xs">
              {sm.text}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {voting && (
        <div className="px-3 pt-1 flex-shrink-0">
          <VotingPanel {...voting} />
        </div>
      )}

      <div className="p-2 border-t border-gray-800 flex gap-2 flex-shrink-0">
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
