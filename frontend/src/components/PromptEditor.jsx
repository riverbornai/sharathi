import { useState } from 'react';

function PromptEditor() {
  const [prompt, setPrompt] = useState(
    `You are an expert, highly engaging, and concise customer support agent managing our brand's social media inbox on Facebook.

INSTRUCTIONS:
1. Very Short Responses: Always reply in 1-3 sentences maximum. Social media users prefer ultra-short, punchy responses.
2. NO Markdown: Never use bolding (**text**), bulleted lists, headers, or any markdown structure. The native chat apps do not render them well.
3. Empathy & Tone: Be extremely polite, warm, and helpful. Use 1 or 2 emojis per message max to keep the tone friendly but professional.
4. Escalate gracefully: If a customer is angry or asks something you don't confidently know, apologize and tell them a human representative will follow up shortly. Do NOT guess facts about the business unless explicitly provided in context.

Your singular goal is to provide a premium, delightful chat experience that represents our brand perfectly.`,
  );
  const [status, setStatus] = useState(null);

  const updatePrompt = async () => {
    try {
      const res = await fetch('/api/settings/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPrompt: prompt }),
      });
      const data = await res.json();
      setStatus(data.success ? 'success' : 'error');
    } catch {
      setStatus('error');
    }

    setTimeout(() => setStatus(null), 3000);
  };

  return (
    <div className="flex-1 flex flex-col gap-4 p-6 rounded-2xl border border-border bg-surface-panel backdrop-blur-lg">
      <h2 className="text-base text-mist/80">Agent Prompt</h2>
      <p className="text-[13px] text-mist/60 leading-relaxed">
        Update the AI's core behavior on the fly. Applies to next generation
        cycle.
      </p>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full h-[120px] px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-frost text-[13px] resize-none outline-none focus:border-lime transition-colors"
      />
      <button
        onClick={updatePrompt}
        className="px-4 py-3 bg-gradient-to-br from-accent to-accent-light text-forest rounded-lg font-semibold hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(212,245,60,0.4)] active:translate-y-0 transition-all"
      >
        Update Prompt
      </button>
      {status === 'success' && (
        <p className="text-emerald-500 text-xs">Prompt updated. Restart server to apply.</p>
      )}
      {status === 'error' && (
        <p className="text-red-500 text-xs">Failed to update prompt.</p>
      )}
    </div>
  );
}

export default PromptEditor;
