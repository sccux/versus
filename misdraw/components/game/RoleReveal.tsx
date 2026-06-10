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
      <div className="ink-panel paper-noise overflow-hidden p-8 max-w-sm w-full text-center">
        {role === 'artist' ? (
          <>
            <p className="text-ink-muted text-sm mb-2">You are a</p>
            <h2 className="font-hand text-3xl text-green-400 mb-6">Real Artist 🎨</h2>
            <p className="text-ink-muted text-sm mb-2">The word is</p>
            <p className="text-4xl font-bold text-ink mb-6">{word}</p>
            <p className="text-ink-muted text-sm">
              Draw it suggestively — help your team, hide it from imposters.
            </p>
          </>
        ) : (
          <>
            <p className="text-ink-muted text-sm mb-2">You are an</p>
            <h2 className="font-hand text-3xl text-red-400 mb-6">Imposter 🕵️</h2>
            {fellowImposters.length > 0 && (
              <div className="mb-4">
                <p className="text-ink-muted text-sm mb-2">Your fellow imposters:</p>
                {fellowImposters.map((imp) => (
                  <p key={imp.nickname} className="font-medium" style={{ color: imp.color }}>
                    {imp.nickname}
                  </p>
                ))}
              </div>
            )}
            <p className="text-ink-muted text-sm">
              Blend in. Draw like you know the word. Survive the vote.
            </p>
          </>
        )}
        <button
          onClick={onDismiss}
          className="mt-6 w-full border-2 border-ink rounded-xl text-ink font-semibold py-3 hover:bg-ink/10 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
