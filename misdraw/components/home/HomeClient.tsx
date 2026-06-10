'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createRoom, joinRoom } from '@/actions/room';
import { isCouchCode } from '@/lib/game/roomCode';

export default function HomeClient() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [createMode, setCreateMode] = useState<'online' | 'couch'>('online');
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  async function handleCreate() {
    if (createMode === 'online' && !nickname.trim()) return setError('Enter a nickname');
    setError('');
    startTransition(async () => {
      try {
        const { code, playerId } = await createRoom(
          createMode,
          createMode === 'online' ? nickname.trim() : undefined
        );
        if (playerId) {
          localStorage.setItem(`misdraw_player_${code}`, playerId);
        }
        router.push(`/${code}`);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  }

  async function handleJoin() {
    if (!nickname.trim()) return setError('Enter a nickname');
    if (!code.trim()) return setError('Enter a room code');
    setError('');
    startTransition(async () => {
      try {
        const upperCode = code.trim().toUpperCase();
        const { playerId } = await joinRoom(upperCode, nickname.trim());
        localStorage.setItem(`misdraw_player_${upperCode}`, playerId);
        router.push(`/${upperCode}`);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Room not found');
      }
    });
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="font-hand text-5xl text-ink text-center mb-2">misdraw</h1>
        <p className="text-ink-muted text-center mb-8 text-sm">draw. deceive. survive.</p>

        <div className="flex mb-6 ink-panel p-1">
          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-2 rounded-md text-sm font-hand transition-colors ${
              tab === 'create' ? 'border-2 border-ink text-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Create Room
          </button>
          <button
            onClick={() => setTab('join')}
            className={`flex-1 py-2 rounded-md text-sm font-hand transition-colors ${
              tab === 'join' ? 'border-2 border-ink text-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Join Room
          </button>
        </div>

        {tab === 'create' && (
          <div className="flex mb-3 ink-panel p-1">
            <button
              onClick={() => setCreateMode('online')}
              className={`flex-1 py-2 rounded-md text-sm font-hand transition-colors ${
                createMode === 'online' ? 'border-2 border-ink text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              Online
            </button>
            <button
              onClick={() => setCreateMode('couch')}
              className={`flex-1 py-2 rounded-md text-sm font-hand transition-colors ${
                createMode === 'couch' ? 'border-2 border-ink text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              Couch Mode
            </button>
          </div>
        )}

        {tab === 'create' && createMode === 'couch' && (
          <p className="text-ink-muted text-xs text-center mb-3">
            This device becomes the shared screen. Players join from their own phones.
          </p>
        )}

        <div className="space-y-3">
          {(tab === 'join' || (tab === 'create' && createMode === 'online')) && (
            <input
              type="text"
              placeholder="Your nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              className="w-full bg-panel text-ink rounded-lg px-4 py-3 outline-none border border-ink-muted focus:border-ink placeholder:text-ink-muted"
            />
          )}

          {tab === 'join' && (
            <>
              <input
                type="text"
                placeholder="Room code (e.g. MX7K2P)"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full bg-panel text-ink rounded-lg px-4 py-3 outline-none border border-ink-muted focus:border-ink placeholder:text-ink-muted font-mono tracking-widest"
              />
              {code.length === 6 && isCouchCode(code) && (
                <p className="text-ink-muted text-xs text-center">
                  🛋️ Couch Mode room — your role and word will appear on this device.
                </p>
              )}
            </>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={tab === 'create' ? handleCreate : handleJoin}
            disabled={isPending}
            className="w-full border-2 border-ink rounded-lg text-ink font-semibold py-3 hover:bg-ink/10 transition-colors disabled:border-ink-muted disabled:text-ink-muted disabled:cursor-not-allowed"
          >
            {isPending
              ? 'Loading...'
              : tab === 'create'
              ? createMode === 'couch'
                ? 'Create Couch Room'
                : 'Create Room'
              : 'Join Room'}
          </button>
        </div>
      </div>
    </div>
  );
}
