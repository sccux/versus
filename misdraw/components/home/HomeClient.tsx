'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createRoom, joinRoom } from '@/actions/room';

export default function HomeClient() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!nickname.trim()) return setError('Enter a nickname');
    setError('');
    startTransition(async () => {
      try {
        const { code, playerId } = await createRoom(nickname.trim());
        localStorage.setItem(`misdraw_player_${code}`, playerId);
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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl font-bold text-white text-center mb-2">misdraw</h1>
        <p className="text-gray-400 text-center mb-8 text-sm">draw. deceive. survive.</p>

        <div className="flex mb-6 bg-gray-900 rounded-lg p-1">
          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === 'create' ? 'bg-white text-gray-950' : 'text-gray-400 hover:text-white'
            }`}
          >
            Create Room
          </button>
          <button
            onClick={() => setTab('join')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === 'join' ? 'bg-white text-gray-950' : 'text-gray-400 hover:text-white'
            }`}
          >
            Join Room
          </button>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Your nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            className="w-full bg-gray-900 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-white/20 placeholder:text-gray-600"
          />

          {tab === 'join' && (
            <input
              type="text"
              placeholder="Room code (e.g. MX7K2P)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full bg-gray-900 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-white/20 placeholder:text-gray-600 font-mono tracking-widest"
            />
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={tab === 'create' ? handleCreate : handleJoin}
            disabled={isPending}
            className="w-full bg-white text-gray-950 font-semibold rounded-lg py-3 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Loading...' : tab === 'create' ? 'Create Room' : 'Join Room'}
          </button>
        </div>
      </div>
    </div>
  );
}
