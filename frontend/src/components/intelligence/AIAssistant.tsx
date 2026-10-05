import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import ReactMarkdown from 'react-markdown';

interface Message { role: 'user' | 'assistant'; content: string; }

const SUGGESTIONS = [
  'Quels lots sont en transit ?',
  'Y a-t-il des anomalies ?',
  'Quel est le meilleur producteur ?',
  'Certifications qui expirent ?',
  'Résumé de la plateforme',
];

export const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '👋 Bonjour ! Je suis votre assistant TraceAgro. Posez-moi une question sur vos données, lots, producteurs ou certifications.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (question = input) => {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const { data } = await api.post('/intelligence/ask', { question: q });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.data.answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: '❌ Erreur lors de la récupération de la réponse.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFCF6]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant' ? 'bg-[#352638] text-[#FFFCF6]' : 'bg-[#AD5138] text-[#FFFCF6]'}`}>
              {msg.role === 'assistant' ? <Bot size={15} /> : <User size={15} />}
            </div>
            <div className={`rounded-[8px] px-4 py-3 text-sm max-w-[80%] leading-relaxed border ${msg.role === 'assistant' ? 'bg-[#F5F0E7] text-[#352638] border-[#D8CEC4]' : 'bg-[#EAE2EB] text-[#352638] border-[#352638]/20'}`}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#352638] text-[#FFFCF6] flex items-center justify-center">
              <Bot size={15} />
            </div>
            <div className="bg-[#F5F0E7] border border-[#D8CEC4] rounded-[8px] px-4 py-3">
              <Loader2 size={16} className="animate-spin text-[#352638]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#70656B] mb-2">Suggestions :</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs bg-[#FFFCF6] hover:bg-[#EAE2EB] text-[#352638] px-3 py-1.5 rounded-full transition-all border border-[#D8CEC4] font-medium"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-[#D8CEC4]">
        <div className="flex gap-2">
          <input
            className="input flex-1 text-sm"
            placeholder="Posez une question sur le registre..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            disabled={loading}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="btn-primary px-4"
            aria-label="Envoyer"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
