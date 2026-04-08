import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Zap } from 'lucide-react';
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
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant' ? 'bg-forest-600' : 'bg-vanilla-600'}`}>
              {msg.role === 'assistant' ? <Bot size={14} className="text-white" /> : <User size={14} className="text-white" />}
            </div>
            <div className={`rounded-xl px-3 py-2 text-sm max-w-[80%] leading-relaxed ${msg.role === 'assistant' ? 'bg-white/5 text-gray-200' : 'bg-forest-600/20 text-forest-200'}`}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-forest-600 flex items-center justify-center">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-white/5 rounded-xl px-3 py-2">
              <Loader2 size={14} className="animate-spin text-forest-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 mb-2">Suggestions :</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 px-2.5 py-1 rounded-full transition-all border border-white/10">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-white/[0.06]">
        <div className="flex gap-2">
          <input
            className="input flex-1 text-sm"
            placeholder="Posez une question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            disabled={loading}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="btn-primary px-3"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
