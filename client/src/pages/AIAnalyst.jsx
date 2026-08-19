import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, Sparkles, Plus, MessageSquareText, Trash2, ChevronDown, ChevronUp, BadgeCheck, Cpu } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Badge } from '../components/ui/Badge';
import { aiService } from '../services/aiService';

const SUGGESTED_QUESTIONS = [
  'Why were expenses higher this month?',
  'What are my three biggest expense categories?',
  'Predict next month\'s revenue.',
  'Which month was most profitable?',
  'Are there any unusual transactions?',
  'What expenses appear recurring?',
  'Summarize my financial performance.',
];

const CONFIDENCE_TONE = { high: 'positive', moderate: 'warning', low: 'negative' };

function EvidencePanel({ evidence }) {
  const [open, setOpen] = useState(false);
  if (!evidence) return null;
  return (
    <div className="mt-2.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-ledger-600 hover:text-ledger-700 flex items-center gap-1"
      >
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        View Evidence
      </button>
      {open && (
        <pre className="figure mt-2 bg-ink-900 text-ink-100 rounded-lg p-3.5 text-[11px] leading-relaxed overflow-x-auto max-h-64 overflow-y-auto">
          {JSON.stringify(evidence, null, 2)}
        </pre>
      )}
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="bg-ledger-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] text-sm">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3 mb-5 max-w-[85%]">
      <div className="w-7 h-7 rounded-full bg-ink-900 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles size={13} className="text-gold-300" />
      </div>
      <div>
        <div className="bg-white border border-ink-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-ink-800 leading-relaxed shadow-card">
          {message.content}
        </div>
        <div className="flex items-center gap-2 mt-1.5 ml-1">
          {message.confidence && (
            <Badge tone={CONFIDENCE_TONE[message.confidence] || 'neutral'}>Confidence: {message.confidence}</Badge>
          )}
          <span className="text-[11px] text-ink-400 flex items-center gap-1">
            {message.aiGenerated ? <BadgeCheck size={11} /> : <Cpu size={11} />}
            {message.aiGenerated ? 'AI-generated' : 'Deterministic explanation'}
          </span>
        </div>
        <EvidencePanel evidence={message.evidence} />
      </div>
    </div>
  );
}

export default function AIAnalyst() {
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const loadConversations = () => aiService.listConversations().then((res) => setConversations(res.conversations));

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    if (location.state?.initialQuestion) {
      send(location.state.initialQuestion);
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openConversation = async (id) => {
    const res = await aiService.getConversation(id);
    setActiveId(id);
    setMessages(res.conversation.messages);
  };

  const newConversation = () => {
    setActiveId(null);
    setMessages([]);
  };

  const deleteConversation = async (id, e) => {
    e.stopPropagation();
    await aiService.deleteConversation(id);
    if (activeId === id) newConversation();
    loadConversations();
  };

  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || sending) return;
    setInput('');
    setSending(true);
    setMessages((prev) => [...prev, { role: 'user', content: question }]);

    try {
      const res = await aiService.chat(question, activeId);
      setActiveId(res.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.answer,
          evidence: res.evidence,
          confidence: res.confidence,
          aiGenerated: res.aiGenerated,
        },
      ]);
      loadConversations();
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `I ran into an error: ${err.message}` }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout title="AI Analyst">
      <div className="grid lg:grid-cols-[240px_1fr] gap-5 h-[calc(100vh-140px)]">
        <div className="card p-3 hidden lg:flex flex-col overflow-hidden">
          <button onClick={newConversation} className="btn-secondary w-full mb-3 justify-start text-sm">
            <Plus size={15} /> New analysis
          </button>
          <div className="flex-1 overflow-y-auto space-y-1">
            {conversations.map((c) => (
              <button
                key={c._id}
                onClick={() => openConversation(c._id)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-xs group ${
                  activeId === c._id ? 'bg-ledger-50 text-ledger-700' : 'text-ink-500 hover:bg-ink-50'
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <MessageSquareText size={13} className="shrink-0" />
                  <span className="truncate">{c.title}</span>
                </span>
                <Trash2
                  size={12}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-ink-300 hover:text-brick-500"
                  onClick={(e) => deleteConversation(c._id, e)}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="card p-0 flex flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <Sparkles size={24} className="text-gold-400 mb-3" />
                <h3 className="font-display text-lg text-ink-900 mb-1.5">Ask your business data anything</h3>
                <p className="text-sm text-ink-400 mb-6 max-w-sm">
                  Every answer starts with real numbers calculated from your uploaded data — then explained in plain
                  language.
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="text-xs px-3 py-1.5 rounded-full border border-ink-200 text-ink-600 hover:border-ledger-400 hover:text-ledger-700"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, i) => <MessageBubble key={i} message={m} />)}
                {sending && (
                  <div className="flex gap-3 mb-5">
                    <div className="w-7 h-7 rounded-full bg-ink-900 flex items-center justify-center shrink-0">
                      <Sparkles size={13} className="text-gold-300" />
                    </div>
                    <div className="bg-white border border-ink-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-ink-400 shadow-card">
                      Calculating evidence…
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="border-t border-ink-100 p-4 flex gap-2"
          >
            <input
              className="input"
              placeholder="Ask about your revenue, expenses, forecasts, or anomalies…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" disabled={sending} className="btn-primary px-4">
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
