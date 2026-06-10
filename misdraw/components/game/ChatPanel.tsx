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
  onVoted?: (targetId: string) => void;
}

interface Props {
  messages: ChatMessage[];
  systemMessages: SystemMessage[];
  onSend: (text: string) => void;
  isDeadPlayer: boolean;
  voting?: VotingPanelProps | null;
  readOnly?: boolean;
}

export default function ChatPanel({ messages, systemMessages, onSend, isDeadPlayer, voting, readOnly }: Props) {
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
    <div className="flex flex-col h-full ink-panel overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {visibleMessages.map((msg, i) => (
          <div key={i} className={`text-sm ${msg.is_dead ? 'opacity-50' : ''}`}>
            <span className="font-medium" style={{ color: msg.color }}>
              {msg.nickname}
              {msg.is_dead && ' 💀'}:
            </span>{' '}
            <span className="text-ink">{msg.text}</span>
          </div>
        ))}
        {systemMessages.map((sm) => (
          <div key={sm.id} className="text-sm text-center py-1">
            <span className="border border-dashed border-ink-muted text-ink-muted px-3 py-1 rounded-full text-xs">
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

      {!readOnly && (
        <div className="p-2 ink-divider flex gap-2 flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isDeadPlayer ? 'Ghost chat...' : 'Say something...'}
            maxLength={200}
            className="flex-1 bg-paper text-ink border border-ink-muted rounded px-3 py-2 text-sm outline-none focus:border-ink placeholder:text-ink-muted"
          />
          <button
            onClick={handleSend}
            className="border-2 border-ink rounded-full text-ink px-3 py-2 text-sm hover:bg-ink/10 transition-colors"
          >
            ↵
          </button>
        </div>
      )}
    </div>
  );
}
