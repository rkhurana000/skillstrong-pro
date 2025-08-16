// /app/explore/page.tsx

"use client";

import { useState, useEffect, useRef } from 'react';
import { Bot, Gem, Sparkles, MessageSquarePlus, MessageSquareText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- TYPE DEFINITIONS ---
type Role = "user" | "assistant";
interface Message {
  role: Role;
  content: string;
}
interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  provider: 'openai' | 'gemini';
  followUps?: string[]; // <-- THIS IS THE FIX: Added the missing property
}

// --- NEW CONTENT FOR EXPLORE SCREEN ---
const exploreContent = {
  skills: {
    title: "Explore by Job Category",
    prompts: ["CNC Machinist", "Welder", "Robotics Technician", "Industrial Maintenance", "Quality Control", "Logistics & Supply Chain"]
  },
  salary: {
    title: "Explore by Salary Range",
    prompts: ["What jobs pay $40k-$60k?", "Find roles making $60k-$80k", "What careers make $80k+?"]
  },
  training: {
    title: "Explore by Training Length",
    prompts: ["Programs under 3 months", "Training of 6-12 months", "Apprenticeships (1-2 years)"]
  }
};

// --- UI COMPONENTS ---
const TypingIndicator = () => (
  <div className="flex items-center space-x-2">
    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
  </div>
);

// --- MAIN PAGE COMPONENT ---
export default function ExplorePage() {
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // --- DATA & STATE MANAGEMENT ---
  useEffect(() => {
    // Load chat history from localStorage on initial render
    try {
      const savedHistory = localStorage.getItem('skillstrong-chathistory');
      if (savedHistory) {
        const history = JSON.parse(savedHistory);
        setChatHistory(history);
        if (history.length > 0) {
          setActiveChatId(history[0].id);
        } else {
          handleNewChat();
        }
      } else {
        handleNewChat();
      }
    } catch (error) {
      console.error("Failed to load chat history", error);
      handleNewChat();
    }
  }, []);

  useEffect(() => {
    // Auto-scroll to the bottom of the chat
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, activeChatId, isLoading]);

  const activeChat = chatHistory.find(chat => chat.id === activeChatId);

  // --- HANDLER FUNCTIONS ---
  const updateChatHistory = (updatedHistory: ChatSession[]) => {
    // Limit history to 30 conversations
    if (updatedHistory.length > 30) {
      updatedHistory = updatedHistory.slice(updatedHistory.length - 30);
    }
    setChatHistory(updatedHistory);
    try {
      localStorage.setItem('skillstrong-chathistory', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error("Failed to save chat history", error);
    }
  };
  
  const handleNewChat = () => {
    const newChat: ChatSession = {
      id: `chat-${Date.now()}`,
      title: "New Chat",
      messages: [],
      provider: 'gemini',
      followUps: [],
    };
    const updatedHistory = [newChat, ...chatHistory];
    updateChatHistory(updatedHistory);
    setActiveChatId(newChat.id);
  };

  const handleProviderChange = (provider: 'openai' | 'gemini') => {
    if (!activeChat) return;
    const updatedHistory = chatHistory.map(chat =>
      chat.id === activeChatId ? { ...chat, provider } : chat
    );
    updateChatHistory(updatedHistory);
  };

  const handleChipClick = async (query: string) => {
    if (isLoading || !activeChat) return;

    const newUserMessage: Message = { role: 'user', content: query };
    const updatedMessages = [...activeChat.messages, newUserMessage];
    
    // Clear previous follow-ups immediately for a cleaner UX
    const intermediateHistory = chatHistory.map(chat =>
      chat.id === activeChatId ? { ...chat, messages: updatedMessages, followUps: [] } : chat
    );
    updateChatHistory(intermediateHistory);
    setIsLoading(true);

    const response = await fetch(`/api/explore?provider=${activeChat.provider}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: updatedMessages }),
    });

    if (!response.ok) {
        const errorMessage: Message = { role: 'assistant', content: "Sorry, I encountered an error. Please try again."};
        const finalHistory = chatHistory.map(chat =>
            chat.id === activeChatId ? {...chat, messages: [...updatedMessages, errorMessage]} : chat
        );
        updateChatHistory(finalHistory);
        setIsLoading(false);
        return;
    }

    const data = await response.json();
    const assistantMessage: Message = { role: 'assistant', content: data.answer };
    let finalMessages = [...updatedMessages, assistantMessage];
    let finalTitle = activeChat.title;

    // Generate title for new chats
    if (activeChat.messages.length === 0) { // This means it's the first exchange
      try {
        const titleResponse = await fetch('/api/title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: finalMessages }),
        });
        if (titleResponse.ok) {
          const { title } = await titleResponse.json();
          finalTitle = title;
        }
      } catch (e) { console.error("Title generation failed", e); }
    }

    const finalHistory = chatHistory.map(chat =>
      chat.id === activeChatId ? { ...chat, messages: finalMessages, title: finalTitle, followUps: data.followups || [] } : chat
    );
    updateChatHistory(finalHistory);
    setIsLoading(false);
  };
  
  // --- RENDER ---
  return (
    <div className="flex h-screen bg-gray-100 text-gray-800">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white flex flex-col p-2">
        <button
          onClick={handleNewChat}
          className="flex items-center w-full px-4 py-2 mb-4 text-sm font-semibold rounded-md bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <MessageSquarePlus className="w-5 h-5 mr-2" />
          New Chat
        </button>
        <div className="flex-1 overflow-y-auto">
          <h2 className="px-4 text-xs font-bold tracking-wider uppercase text-gray-400 mb-2">Recent</h2>
          {chatHistory.map(chat => (
            <button
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              className={`flex items-center w-full text-left px-4 py-2 text-sm rounded-md transition-colors ${activeChatId === chat.id ? 'bg-gray-700' : 'hover:bg-gray-700/50'}`}
            >
              <MessageSquareText className="w-4 h-4 mr-3 flex-shrink-0" />
              <span className="truncate">{chat.title}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        <header className="p-4 border-b bg-white shadow-sm flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800 flex items-center">
            <Sparkles className="w-6 h-6 mr-2 text-blue-500" />
            SkillStrong Coach
          </h1>
          {activeChat && (
            <div className="flex items-center space-x-2 p-1 bg-gray-100 rounded-full">
              <button
                onClick={() => handleProviderChange('openai')}
                disabled={isLoading}
                className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${activeChat.provider === 'openai' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:bg-gray-200'} disabled:opacity-50`}
              >
                <Bot className="w-4 h-4 inline-block mr-1" /> GPT
              </button>
              <button
                onClick={() => handleProviderChange('gemini')}
                disabled={isLoading}
                className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${activeChat.provider === 'gemini' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:bg-gray-200'} disabled:opacity-50`}
              >
                <Gem className="w-4 h-4 inline-block mr-1" /> Gemini
              </button>
            </div>
          )}
        </header>

        <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {activeChat && activeChat.messages.length > 0 ? (
            <div className="space-y-6">
              {activeChat.messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xl p-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white text-gray-800 border rounded-bl-none'}`}>
                    <article className="prose prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown></article>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-xl p-3 rounded-2xl bg-white text-gray-800 border rounded-bl-none"><TypingIndicator /></div>
                </div>
              )}
            </div>
          ) : (
             // New Explore Screen
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-center mb-2">How can I help you build your career?</h2>
              <p className="text-center text-gray-500 mb-8">Select a category to begin exploring.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.values(exploreContent).map((category, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-lg border">
                    <h3 className="font-semibold mb-3">{category.title}</h3>
                    <div className="flex flex-col space-y-2">
                      {category.prompts.map((prompt, pIdx) => (
                        <button key={pIdx} onClick={() => handleChipClick(prompt)} className="text-left text-sm p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">{prompt}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
        
        <footer className="p-4 bg-white/80 backdrop-blur-sm border-t">
          <div className="w-full max-w-3xl mx-auto">
            <div className="flex flex-wrap gap-2 justify-center">
              {activeChat?.followUps?.map((prompt: string, index: number) => (
                <button key={index} onClick={() => handleChipClick(prompt)} disabled={isLoading} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
