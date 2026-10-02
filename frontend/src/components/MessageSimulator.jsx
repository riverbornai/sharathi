import { useState } from 'react';

function MessageSimulator() {
  const [platform, setPlatform] = useState('facebook');
  const [senderId, setSenderId] = useState('demo_user');
  const [messageText, setMessageText] = useState('');

  const simulateMessage = async () => {
    if (!messageText.trim()) return;

    const text = messageText;
    setMessageText('');

    await fetch('/webhook/incoming', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, senderId, messageText: text }),
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') simulateMessage();
  };

  return (
    <div className="flex flex-col gap-4 p-6 rounded-2xl border border-border bg-surface-panel backdrop-blur-lg">
      <h2 className="text-base text-mist/80">Simulate Facebook Webhook Message</h2>
      <input
        type="text"
        placeholder="Sender ID (e.g. user123)"
        value={senderId}
        onChange={(e) => setSenderId(e.target.value)}
        className="px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-frost outline-none focus:border-lime transition-colors"
      />
      <input
        type="text"
        placeholder="Type a message to simulate..."
        value={messageText}
        onChange={(e) => setMessageText(e.target.value)}
        onKeyPress={handleKeyPress}
        autoComplete="off"
        className="px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-frost outline-none focus:border-lime transition-colors"
      />
      <button
        onClick={simulateMessage}
        className="px-4 py-3 bg-gradient-to-br from-accent to-accent-light text-forest rounded-lg font-semibold hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(212,245,60,0.4)] active:translate-y-0 transition-all"
      >
        Send to Webhook
      </button>
    </div>
  );
}

export default MessageSimulator;
