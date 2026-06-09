'use client';

interface Props {
  role: 'artist' | 'imposter';
  word: string;
  fellowImposters: { nickname: string; color: string }[];
  onDismiss: () => void;
}

export default function RoleReveal({ role, word, fellowImposters, onDismiss }: Props) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full text-center">
        {role === 'artist' ? (
          <>
            <p className="text-gray-400 text-sm mb-2">You are a</p>
            <h2 className="text-3xl font-bold text-green-400 mb-6">Real Artist 🎨</h2>
            <p className="text-gray-400 text-sm mb-2">The word is</p>
            <p className="text-4xl font-bold text-white mb-6">{word}</p>
            <p className="text-gray-500 text-sm">
              Draw it suggestively — help your team, hide it from imposters.
            </p>
          </>
        ) : (
          <>
            <p className="text-gray-400 text-sm mb-2">You are an</p>
            <h2 className="text-3xl font-bold text-red-400 mb-6">Imposter 🕵️</h2>
            {fellowImposters.length > 0 && (
              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-2">Your fellow imposters:</p>
                {fellowImposters.map((imp) => (
                  <p key={imp.nickname} className="font-medium" style={{ color: imp.color }}>
                    {imp.nickname}
                  </p>
                ))}
              </div>
            )}
            <p className="text-gray-500 text-sm">
              Blend in. Draw like you know the word. Survive the vote.
            </p>
          </>
        )}
        <button
          onClick={onDismiss}
          className="mt-6 w-full bg-white text-gray-950 font-semibold rounded-xl py-3 hover:bg-gray-100 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
