// /app/explore/page.tsx

"use client";

import { useState, useEffect, useRef } from 'react';
import { OpenAI, Gem, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Role = "user" | "assistant";

interface Message {
  role: Role;
  content: string;
}

const initialFollowUps = {
  skills: [
    "What skills do I need for CNC machining?",
    "Tell me about welding certifications.",
    "What are some entry-level robotics skills?",
  ],
  salary: [
    "What's the average salary for a welder?",
    "How much do industrial maintenance technicians make?",
    "Compare salaries for different manufacturing roles.",
  ],
  training: [
    "Find apprenticeships for electricians near me.",
    "What are the best trade schools for manufacturing?",
    "How long does it take to become a CNC operator?",
  ],
};

// A simple typing indicator component
const TypingIndicator = () => (
  <div className="flex items-center space-x-2">
    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
  </div>
);

export default function ExplorePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<'openai' | 'gemini'>('gemini');
  const [activeTab, setActiveTab] = useState<'skills' | 'salary' | 'training'>('skills');
  const [followUps, setFollowUps] = useState<string[]>(initialFollowUps[activeTab]);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on initial render
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem('skillstrong-chat');
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
    } catch (error) {
      console.error("Failed to load messages from localStorage", error);
    }
  }, []);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('skillstrong-chat', JSON.stringify(messages));
    } catch (error) {
      console.error("Failed to save messages to localStorage", error);
    }
  }, [messages]);

  // Auto-scroll to the bottom of the chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleTabChange = (tab: 'skills' | 'salary' | 'training') => {
    setActiveTab(tab);
    if (messages.length === 0) {
      setFollowUps(initialFollowUps[tab]);
    }
  };
  
  const fetchAssistantResponse = async (currentMessages: Message[]) => {
    setIsLoading(true);
    setFollowUps([]);

    try {
      const response = await fetch(`/api/explore?provider=${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: currentMessages, intent: activeTab }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      const newAssistantMessage: Message = {
        role: 'assistant',
        content: data.answer || "Sorry, I couldn't generate a response.",
      };
      
      setMessages(prevMessages => [...prevMessages, newAssistantMessage]);
      setFollowUps(data.followups || []);

    } catch (error) {
      console.error("Failed to fetch response:", error);
      const errorMessage: Message = {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again later.",
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChipClick = (query: string) => {
    if (isLoading) return; // Prevent multiple clicks while loading

    const newUserMessage: Message = { role: 'user', content: query };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    fetchAssistantResponse(updatedMessages);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="p-4 border-b bg-white shadow-sm flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800 flex items-center">
          <Sparkles className="w-6 h-6 mr-2 text-blue-500" />
          SkillStrong Coach
        </h1>
        <div className="flex items-center space-x-2 p-1 bg-gray-100 rounded-full">
          <button
            onClick={() => setProvider('openai')}
            disabled={isLoading}
            className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${provider === 'openai' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:bg-gray-200'} disabled:opacity-50`}
          >
            <OpenAI className="w-4 h-4 inline-block mr-1" /> GPT
          </button>
          <button
            onClick={() => setProvider('gemini')}
            disabled={isLoading}
            className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${provider === 'gemini' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:bg-gray-200'} disabled:opacity-50`}
          >
            <Gem className="w-4 h-4 inline-block mr-1" /> Gemini
          </button>
        </div>
      </header>

      <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xl p-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white text-gray-800 border rounded-bl-none'}`}>
              <article className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              </article>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-xl p-3 rounded-2xl bg-white text-gray-800 border rounded-bl-none">
                <TypingIndicator />
            </div>
          </div>
        )}
      </main>

      <footer className="p-4 bg-white/80 backdrop-blur-sm border-t">
        <div className="w-full max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="mb-4">
              <div className="flex space-x-2 border-b mb-2">
                {['skills', 'salary', 'training'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab as any)}
                    disabled={isLoading}
                    className={`px-3 py-2 text-sm font-semibold capitalize transition-colors ${activeTab === tab ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-800'} disabled:opacity-50`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-center">
            {followUps.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleChipClick(prompt)}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
