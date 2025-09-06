// /app/explore/ExploreClient.tsx
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import {
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

const exploreContent: Record<ExploreTab, { title: string; prompts: string[] }> = {
  skills: {
    title: 'Explore by Job Category',
    prompts: [
      'CNC Machinist',
      'Welding Programmer',
      'Robotics Technologist',
      'Maintenance Tech',
      'Quality Control Specialist',
      'Additive Manufacturing',
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

// Wrapper so useSearchParams works with App Router
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
  const [priming, setPriming] = useState(false);
  const [showChatView, setShowChatView] = useState(false);
  const [activeExploreTab, setActiveExploreTab] = useState<ExploreTab>('skills');
  const [inputValue, setInputValue] = useState('');
  const { location } = useLocation();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const kickoffRef = useRef(false);

  const activeChat = chatHistory.find((c) => c.id === activeChatId) || null;

  // FIX #4: Auto-scrolling effect
  useEffect(() => {
    if (chatContainerRef.current) {
      setTimeout(() => {
        chatContainerRef.current!.scrollTop = chatContainerRef.current!.scrollHeight;
      }, 100);
    }
  }, [activeChat?.messages, isLoading]);

  const createNewChat = (setActive = true): ChatSession => {
    const newChat: ChatSession = {
      id: `chat-${Date.now()}`,
      title: 'New Chat',
      messages: [],
      provider: 'openai',
    };
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
    setChatHistory((prev) =>
      prev.map((c) => (c.id === activeChatId ? { ...c, provider } : c)),
    );
  };

  const overviewSeed = (canonical: string) => {
    return `Give a student-friendly overview of the **${canonical}** career. Use these sections with emojis and bullet points only:

🔎 **Overview** — what the role is and where they work.
🧭 **Day-to-Day** — typical tasks.
🧰 **Tools & Tech** — machines, software, robotics, safety gear.
🧠 **Core Skills** — top 5 skills to succeed.
💰 **Typical Pay (US)** — national ranges; note that local pay can vary.
⏱️ **Training Time** — common pathways & length (certs, bootcamps, apprenticeships).
📜 **Helpful Certs** — 2–4 recognized credentials.
🚀 **Next Steps** — 2–3 actions the student can take.

Keep it concise and friendly. Do **not** include local programs, openings, or links in this message.`;
  };

  async function sendMessage(
    text: string,
    chatId?: string | undefined,
    extraPayload: Record<string, any> = {},
    historyOverride?: ChatSession[],
  ) {
    const targetChatId = chatId ?? activeChatId ?? undefined;
    if (!targetChatId) return;

    const provider =
      (historyOverride || chatHistory).find((c) => c.id === targetChatId)?.provider || 'openai';

    const userMessageContent = extraPayload.displayText || text;
    const newUserMessage: Message = { role: 'user', content: userMessageContent };

    setIsLoading(true);
    setShowChatView(true);

    setChatHistory((prev) =>
      prev.map((chat) =>
        chat.id === targetChatId
          ? { ...chat, messages: [...chat.messages, newUserMessage] }
          : chat,
      ),
    );

    try {
      const currentMessages = (historyOverride || chatHistory).find((c) => c.id === targetChatId)?.messages || [];
      const backendMessage: Message = { role: 'user', content: text };

      const body = {
        messages: [...currentMessages, backendMessage],
        provider,
        location,
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) throw new Error('API response was not ok');
      const data = await response.json();

      const assistantMessage: Message = { role: 'assistant', content: data.answer };
      setChatHistory((prev) => {
        let next = prev.map((c) =>
          c.id === targetChatId ? { ...c, messages: [...c.messages, assistantMessage] } : c,
        );
        
        const isFirst = (next.find((c) => c.id === targetChatId)?.messages.length || 0) <= 2;
        if (isFirst) {
          fetch('/api/title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [newUserMessage, assistantMessage] }),
          })
          .then((r) => r.json())
          .then((t) => {
            setChatHistory((prev2) =>
              prev2.map((c) => (c.id === targetChatId ? { ...c, title: t.title || c.title } : c)),
            );
          })
          .catch(() => {});
        }
        try { localStorage.setItem('skillstrong-chathistory', JSON.stringify(next)); } catch {}
        return next;
      });

      setCurrentFollowUps((data.followups as string[]) || []);
    } catch (e) {
      const errorMessage: Message = {
        role: 'assistant',
        content: "Sorry, I couldn't get a response. Please try again.",
      };
      setChatHistory((prev) =>
        prev.map((c) => (c.id === targetChatId ? { ...c, messages: [...c.messages, errorMessage] } : c)),
      );
    } finally {
      setIsLoading(false);
    }
  }

  const handleExplorePromptClick = (prompt: string) => {
    const isFirstMessageInChat = (activeChat?.messages.length || 0) === 0;

    // FIX #3: Corrected category mapping
    const p = (prompt || '').toLowerCase().trim();
    const catMap: Record<string, string> = {
      'cnc machinist': 'CNC Machinist',
      'welding programmer': 'Welding Programmer',
      'robotics technologist': 'Robotics Technologist',
      'maintenance tech': 'Industrial Maintenance',
      'quality control specialist': 'Quality Control Specialist',
      'additive manufacturing': 'Additive Manufacturing',
      'cnc': 'CNC Machinist',
      'welder': 'Welding Programmer',
      'robotics': 'Robotics Technologist',
      'maintenance': 'Industrial Maintenance',
      'quality': 'Quality Control Specialist',
    };
    const canonical = catMap[p];

    const messageToSend = isFirstMessageInChat && canonical
      ? overviewSeed(canonical)
      : prompt;

    const displayText = canonical && isFirstMessageInChat
      ? `Explore: ${canonical}`
      : prompt;

    const chatToUpdate = activeChatId ?? createNewChat(true).id;
    setActiveChatId(chatToUpdate);
    sendMessage(messageToSend, chatToUpdate, { displayText });
  };

  useEffect(() => {
    const newChatFlag = searchParams.get('newChat');
    const chatMode = searchParams.get('chat');

    if (newChatFlag) {
      const nc = createNewChat(true);
      setActiveChatId(nc.id);
      setShowChatView(false);
      const url = window.location.pathname;
      window.history.replaceState({ ...window.history.state, as: url, url }, '', url);
      return;
    }

    if (chatMode === '1') {
      const nc = createNewChat(true);
      setActiveChatId(nc.id);
      setShowChatView(true);
      return;
    }

    try {
      const saved = localStorage.getItem('skillstrong-chathistory');
      const history = saved ? (JSON.parse(saved) as ChatSession[]) : [];
      if (history.length > 0) {
        setChatHistory(history);
        setActiveChatId(history[0].id);
        setShowChatView((history[0].messages?.length || 0) > 0);
      } else {
        const nc = createNewChat(true);
        setChatHistory([nc]);
        setShowChatView(false);
      }
    } catch {
      const nc = createNewChat(true);
      setChatHistory([nc]);
      setShowChatView(false);
    }
  }, []);

  useEffect(() => {
    if (kickoffRef.current) return;
    const raw = (searchParams.get('category') || '').toLowerCase().trim();
    if (!raw) return;

    const map: Record<string, string> = {
      cnc: 'CNC Machinist',
      robotics: 'Robotics Technician',
      additive: 'Additive Manufacturing',
      welding: 'Welding Programmer',
      maint: 'Industrial Maintenance',
      maintenance: 'Industrial Maintenance',
      qc: 'Quality Control Specialist',
      quality: 'Quality Control Specialist',
      logistics: 'Logistics & Supply Chain',
    };

    const label = map[raw] || raw;
    kickoffRef.current = true;
    handleExplorePromptClick(label);
  }, [searchParams]);

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-800">
      <div className="flex flex-1 flex-col h-screen">
        <header className="p-4 border-b bg-white shadow-sm flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800 flex items-center">
            <MessageSquareText className="w-6 h-6 mr-2 text-blue-500" /> SkillStrong Coach
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const nc = createNewChat(true);
                setActiveChatId(nc.id);
                setShowChatView(false);
                setCurrentFollowUps([]);
                setPriming(false);
                router.replace('/explore');
              }}
              className="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              title="Start a new chat"
            >
              <MessageSquarePlus className="w-4 h-4 mr-1" /> New Chat
            </button>

            {activeChat && (
              <div className="flex items-center space-x-1 p-1 bg-gray-100 rounded-full">
                <button
                  onClick={() => handleProviderChange('openai')}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${(activeChat?.provider || 'openai') === 'openai' ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
                >
                  <OpenAIIcon className="w-4 h-4 inline-block mr-1" /> GPT-4o
                </button>
                <button
                  onClick={() => handleProviderChange('gemini')}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${(activeChat?.provider || 'openai') === 'gemini' ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
                >
                  <Gem className="w-4 h-4 inline-block mr-1" /> Gemini
                </button>
              </div>
            )}
          </div>
        </header>

        <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-5 lg:p-6">
          {showChatView ? (
            <div className="space-y-4 max-w-5xl mx-auto">
              {priming && (!activeChat || activeChat.messages.length === 0) && (
                <div className="flex justify-start">
                  <div className="p-3 rounded-2xl bg-white text-gray-800 border rounded-bl-none">
                    <TypingIndicator />
                  </div>
                </div>
              )}

              {activeChat?.messages.map((msg, idx) => (
                <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-4xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 border rounded-bl-none'}`}>
                    <article className={`prose ${msg.role === 'user' ? 'prose-invert' : ''} prose-a:text-blue-600`}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{ a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" /> }}
                      >
                        {typeof msg.content === 'string' ? msg.content : 'Error: Invalid message content.'}
                      </ReactMarkdown>
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
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-extrabold text-center text-gray-800">Explore Careers or Chat with Coach Mach</h2>
              <p className="mt-2 text-center text-gray-500 mb-6">
                Select a category to begin exploring, or start a conversation with our AI coach.
              </p>

              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex justify-center space-x-8" aria-label="Tabs">
                  {(['skills', 'salary', 'training'] as ExploreTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveExploreTab(tab)}
                      className={`${
                        activeExploreTab === tab
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium capitalize`}
                    >
                      {tab}
                    </button>
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
                      className="text-left p-4 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-lg font-semibold"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* FIX #1: Footer is now always visible in chat view */}
        {showChatView && (
          <footer className="p-3 bg-white/80 backdrop-blur-sm border-t">
            <div className="w-full max-w-3xl mx-auto">
              {currentFollowUps.length > 0 && !isLoading && (
                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  {currentFollowUps.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handleExplorePromptClick(prompt)}
                      // FIX #2: Smaller, more compact bubbles
                      className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium text-blue-700 bg-white hover:bg-blue-50"
                    >
                      <ArrowRight className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!inputValue.trim()) return;
                  sendMessage(inputValue, activeChatId ?? undefined);
                  setInputValue('');
                }}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask anything..."
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-40"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
