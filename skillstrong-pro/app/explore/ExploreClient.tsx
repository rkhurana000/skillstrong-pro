// /app/explore/ExploreClient.tsx (updated: removes sidebar, supports ?newChat=1, adds New Chat button, renders follow-up prompts)
'use client'

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import {
  Sparkles,
  MessageSquarePlus,
  MessageSquareText,
  ArrowRight,
  Send,
  Bot as OpenAIIcon,
  Gem,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLocation } from '@/app/contexts/LocationContext';
import Link from 'next/link';

// Type Definitions
 type Role = 'user' | 'assistant';
 interface Message { role: Role; content: string }
 interface ChatSession {
   id: string;
   title: string;
   messages: Message[];
   provider: 'openai' | 'gemini';
 }
 type ExploreTab = 'skills' | 'salary' | 'training';

// Map career names to their URL slugs for clean routing
const careerSlugMap: { [key: string]: string } = {
  'cnc machinist': 'cnc-machinist',
  welder: 'welder',
  'robotics technician': 'robotics-technician',
  'industrial maintenance': 'industrial-maintenance',
  'quality control': 'quality-control',
  'logistics & supply chain': 'logistics',
};

const exploreContent: Record<ExploreTab, { title: string; prompts: string[] }> = {
  skills: {
    title: 'Explore by Job Category',
    prompts: [
      'CNC Machinist',
      'Welder',
      'Robotics Technician',
      'Industrial Maintenance',
      'Quality Control',
      'Logistics & Supply Chain',
    ],
  },
  salary: {
    title: 'Explore by Salary Range',
    prompts: [
      'What jobs pay $40k–$60k?',
      'Find roles making $60k–$80k',
      'What careers make $80k+?',
    ],
  },
  training: {
    title: 'Explore by Training Length',
    prompts: [
      'Programs under 3 months',
      'Training of 6–12 months',
      'Apprenticeships (1–2 years)',
    ],
  },
};

const TypingIndicator = () => (
  <div className="flex items-center space-x-2 p-2">
    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" />
    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.2s]" />
    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.4s]" />
  </div>
);

// Wrapper needed so useSearchParams works with App Router
export default function ExplorePageWrapper({ user }: { user: User | null }) {
  return (
    <Suspense fallback={<div className="flex-1 p-8 text-center">Loading...</div>}>
      <ExploreClient user={user} />
    </Suspense>
  );
}

function ExploreClient({ user }: { user: User | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [currentFollowUps, setCurrentFollowUps] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeExploreTab, setActiveExploreTab] = useState<ExploreTab>('skills');
  const [inputValue, setInputValue] = useState('');
  const { location } = useLocation();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const activeChat = chatHistory.find((c) => c.id === activeChatId) || null;

  const updateAndSaveHistory = (newHistory: ChatSession[]) => {
    const limited = newHistory.slice(0, 30);
    setChatHistory(limited);
    try { localStorage.setItem('skillstrong-chathistory', JSON.stringify(limited)); } catch {}
  };

  const createNewChat = (setActive = true): ChatSession => {
    const newChat: ChatSession = { id: `chat-${Date.now()}`, title: 'New Chat', messages: [], provider: 'openai' };
    setChatHistory((prev) => {
      const next = [newChat, ...prev];
      if (setActive) setActiveChatId(newChat.id);
      try { localStorage.setItem('skillstrong-chathistory', JSON.stringify(next)); } catch {}
      return next;
    });
    return newChat;
  };

  const handleProviderChange = (provider: 'openai' | 'gemini') => {
    if (!activeChatId) return;
    setChatHistory((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, provider } : c)));
  };

// Always seed the chat with the chosen prompt (no routing)
const handleExplorePromptClick = (prompt: string) => {
  // Use current chat if present; otherwise create one
  const id = activeChatId ?? createNewChat(true).id;
  setTimeout(() => sendMessage(prompt, id), 0);
};

  async function sendMessage(
    text: string,
    chatId?: string | undefined,
    extraPayload: Record<string, unknown> = {},
    historyOverride?: ChatSession[],
  ) {
    const targetChatId = chatId ?? activeChatId ?? undefined;
    if (!targetChatId) return;

    const provider = (historyOverride || chatHistory).find((c) => c.id === targetChatId)?.provider || 'openai';
    const newUserMessage: Message = { role: 'user', content: text };
    setIsLoading(true);

    setChatHistory((prev) => prev.map((chat) => (chat.id === targetChatId ? { ...chat, messages: [...chat.messages, newUserMessage] } : chat)));

    try {
      const body = {
        messages: (historyOverride || chatHistory).find((c) => c.id === targetChatId)?.messages.concat(newUserMessage) || [newUserMessage],
        provider,
        location,
        ...extraPayload,
      };

      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error('API response was not ok');
      const data = await response.json();

      const assistantMessage: Message = { role: 'assistant', content: data.answer };
      setChatHistory((prev) => {
        let next = prev.map((c) => (c.id === targetChatId ? { ...c, messages: [...c.messages, assistantMessage] } : c));
        const isFirst = (next.find((c) => c.id === targetChatId)?.messages.length || 0) === 2;
        if (isFirst) {
          fetch('/api/title', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [newUserMessage, assistantMessage] }) })
            .then((r) => r.json())
            .then((t) => { setChatHistory((prev2) => prev2.map((c) => (c.id === targetChatId ? { ...c, title: t.title } : c))); })
            .catch(() => {});
        }
        try { localStorage.setItem('skillstrong-chathistory', JSON.stringify(next)); } catch {}
        return next;
      });

      setCurrentFollowUps((data.followups as string[]) || []);
    } catch (e) {
      const errorMessage: Message = { role: 'assistant', content: "Sorry, I couldn't get a response. Please try again." };
      setChatHistory((prev) => prev.map((c) => (c.id === targetChatId ? { ...c, messages: [...c.messages, errorMessage] } : c)));
    } finally {
      setIsLoading(false);
    }
  }

  // init — handle ?newChat=1 and saved history
  useEffect(() => {
    const newChatFlag = searchParams.get('newChat');
    if (newChatFlag) {
      const newChat = createNewChat(true);
      setActiveChatId(newChat.id);
      const newUrl = window.location.pathname;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
      return;
    }
    try {
      const saved = localStorage.getItem('skillstrong-chathistory');
      const history = saved ? (JSON.parse(saved) as ChatSession[]) : [];
      if (history.length > 0) { setChatHistory(history); setActiveChatId(history[0].id); }
      else { const nc = createNewChat(true); setChatHistory([nc]); }
    } catch { const nc = createNewChat(true); setChatHistory([nc]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight; }, [activeChat?.messages, isLoading]);

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800">
      <div className="flex flex-1 flex-col h-screen">
        <header className="p-4 border-b bg-white shadow-sm flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800 flex items-center">
            <MessageSquareText className="w-6 h-6 mr-2 text-blue-500" /> SkillStrong Coach
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={() => createNewChat(true)} className="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700" title="Start a new chat">
              <MessageSquarePlus className="w-4 h-4 mr-1" /> New Chat
            </button>
            {activeChat && (
              <div className="flex items-center space-x-1 p-1 bg-gray-100 rounded-full">
                <button onClick={() => handleProviderChange('openai')} className={`px-3 py-1 rounded-full text-xs font-medium ${(activeChat?.provider || 'openai') === 'openai' ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>
                  <OpenAIIcon className="w-4 h-4 inline-block mr-1" /> GPT-4o
                </button>
                <button onClick={() => handleProviderChange('gemini')} className={`px-3 py-1 rounded-full text-xs font-medium ${(activeChat?.provider || 'openai') === 'gemini' ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>
                  <Gem className="w-4 h-4 inline-block mr-1" /> Gemini
                </button>
              </div>
            )}
          </div>
        </header>

        <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {activeChat && activeChat.messages.length > 0 ? (
            <div className="space-y-6">
              {activeChat.messages.map((msg, idx) => (
                <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-4xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 border rounded-bl-none'}`}>
                    <article className={`prose ${msg.role === 'user' ? 'prose-invert' : ''} prose-a:text-blue-600`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{typeof msg.content === 'string' ? msg.content : 'Error: Invalid message content.'}</ReactMarkdown>
                    </article>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="p-3 rounded-2xl bg-white text-gray-800 border rounded-bl-none">
                    <TypingIndicator />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-center text-gray-800">Explore Careers or Chat with Coach Mach</h2>
              <p className="mt-2 text-center text-gray-500 mb-6">Select a category to begin exploring, or start a conversation with our AI coach.</p>
              <div className="flex justify-center mb-8">
                <button onClick={() => createNewChat(true)} className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700">
                  <Sparkles className="w-4 h-4 mr-2" /> Chat with AI Coach
                </button>
              </div>
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex justify-center space-x-8" aria-label="Tabs">
                  {(['skills','salary','training'] as ExploreTab[]).map((tab) => (
                    <button key={tab} onClick={() => setActiveExploreTab(tab)} className={`${activeExploreTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium capitalize`}>{tab}</button>
                  ))}
                </nav>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="font-semibold mb-3">{exploreContent[activeExploreTab].title}</h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  {exploreContent[activeExploreTab].prompts.map((prompt, idx) => (
    <button
      key={idx}
      onClick={() => handleExplorePromptClick(prompt)}
      className="text-left p-3 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
    >
      {prompt}
    </button>
  ))}
</div>
              </div>
            </div>
          )}
        </main>

        <footer className="p-4 bg-white/80 backdrop-blur-sm border-t">
          <div className="w-full max-w-3xl mx-auto">
            {/* Follow-up chips */}
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {!isLoading && currentFollowUps.map((prompt, index) => (
                <button key={index} onClick={() => handleExplorePromptClick(prompt)} className="group inline-flex items-center gap-2 px-3 py-2 rounded-full border text-sm text-blue-700 hover:bg-blue-50">
                  <ArrowRight className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
                  {prompt}
                </button>
              ))}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); if (!inputValue.trim()) return; sendMessage(inputValue, activeChatId ?? undefined); setInputValue(''); }} className="flex items-center space-x-2">
              <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Ask anything..." disabled={isLoading} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50" />
              <button type="submit" disabled={isLoading} className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-40">
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </footer>
      </div>
    </div>
  );
}
