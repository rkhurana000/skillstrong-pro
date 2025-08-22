// /app/explore/ExploreClient.tsx
'use client'

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { Sparkles, MessageSquarePlus, MessageSquareText, ArrowRight, Send, Bot as OpenAIIcon, Gem } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLocation } from '@/app/contexts/LocationContext';
import Link from 'next/link';

// Type Definitions
type Role = "user" | "assistant";
interface Message { role: Role; content: string; }
interface ChatSession { id: string; title: string; messages: Message[]; provider: 'openai' | 'gemini'; }
type ExploreTab = 'skills' | 'salary' | 'training';

// Map career names to their URL slugs for clean routing
const careerSlugMap: { [key: string]: string } = {
    'cnc machinist': 'cnc-machinist',
    'welder': 'welder',
    'robotics technician': 'robotics-technician',
    'industrial maintenance': 'industrial-maintenance',
    'quality control': 'quality-control',
    'logistics & supply chain': 'logistics'
};

const exploreContent = {
  skills: { title: "Explore by Job Category", prompts: ["CNC Machinist", "Welder", "Robotics Technician", "Industrial Maintenance", "Quality Control", "Logistics & Supply Chain"]},
  salary: { title: "Explore by Salary Range", prompts: ["What jobs pay $40k-$60k?", "Find roles making $60k-$80k", "What careers make $80k+?"]},
  training: { title: "Explore by Training Length", prompts: ["Programs under 3 months", "Training of 6-12 months", "Apprenticeships (1-2 years)"]}
};

const TypingIndicator = () => ( <div className="flex items-center space-x-2"> <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div> <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.2s]"></div> <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.4s]"></div> </div> );

// This wrapper is necessary for useSearchParams to work with Next.js App Router
export default function ExplorePageWrapper({ user }: { user: User | null }) {
    return (
        <Suspense fallback={<div className="flex-1 p-8 text-center">Loading...</div>}>
            <ExploreClient user={user} />
        </Suspense>
    )
}

function ExploreClient({ user }: { user: User | null }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [currentFollowUps, setCurrentFollowUps] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeExploreTab, setActiveExploreTab] = useState<ExploreTab>('skills');
    const [inputValue, setInputValue] = useState("");
    const { location } = useLocation();
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const initialize = () => {
            const initialPrompt = searchParams.get('prompt');

            if (initialPrompt) {
                if (!user) {
                    router.push('/account?message=Please sign in to continue.');
                    return;
                }
                const newChat = createNewChat(true);
                // Directly set history here to ensure it's available for sendMessage
                const newHistory = [newChat, ...chatHistory];
                setChatHistory(newHistory);
                sendMessage(initialPrompt, newChat.id, {}, newHistory);

                const newUrl = window.location.pathname;
                window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);

            } else if (localStorage.getItem('skillstrong-quiz-results')) {
                const quizResultsString = localStorage.getItem('skillstrong-quiz-results');
                localStorage.removeItem('skillstrong-quiz-results');
                if (!user) {
                    router.push('/account?message=Please sign up or sign in to see your quiz results.');
                    return;
                }
                const { answers } = JSON.parse(quizResultsString!);
                const userMessage = "I just took the quiz. Based on my results, what careers do you recommend?";
                const newChat = createNewChat(false);
                const newHistory = [newChat, ...chatHistory];
                updateAndSaveHistory(newHistory);
                setActiveChatId(newChat.id);
                sendMessage(userMessage, newChat.id, { quiz_results: answers }, newHistory);
            } else {
                try {
                    const savedHistory = localStorage.getItem('skillstrong-chathistory');
                    const history = savedHistory ? JSON.parse(savedHistory) : [];
                    if (history.length > 0) {
                        setChatHistory(history);
                        setActiveChatId(history[0].id);
                    } else {
                        const newChat = createNewChat(true);
                        setChatHistory([newChat]);
                    }
                } catch (error) { 
                    console.error("Failed to load history:", error); 
                    const newChat = createNewChat(true);
                    setChatHistory([newChat]);
                }
            }
        };
        initialize();
    }, []);

    const activeChat = chatHistory.find(chat => chat.id === activeChatId);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [activeChat?.messages, isLoading]);

    const updateAndSaveHistory = (newHistory: ChatSession[]) => {
        const limitedHistory = newHistory.slice(0, 30);
        setChatHistory(limitedHistory);
        try { localStorage.setItem('skillstrong-chathistory', JSON.stringify(limitedHistory)); } catch (e) { console.error("Failed to save history:", e); }
    };
    
    const createNewChat = (setActive = true): ChatSession => {
        const newChat: ChatSession = { id: `chat-${Date.now()}`, title: "New Chat", messages: [], provider: 'openai' };
        if (setActive) {
            updateAndSaveHistory([newChat, ...chatHistory]);
            setActiveChatId(newChat.id);
            setCurrentFollowUps([]);
        }
        return newChat;
    };

    const handleProviderChange = (provider: 'openai' | 'gemini') => {
        if (!activeChatId) return;
        updateAndSaveHistory(chatHistory.map(chat => chat.id === activeChatId ? { ...chat, provider } : chat));
    };

    const handleResetActiveChat = () => {
        if (!activeChatId) return;
        updateAndSaveHistory(chatHistory.map(chat => chat.id === activeChatId ? { ...chat, messages: [] } : chat));
        setCurrentFollowUps([]);
    };
    
    const sendMessage = async (query: string, chatId: string | null, additionalData = {}, initialHistory?: ChatSession[]) => {
        if (!user) {
            router.push('/account?message=Please sign up or sign in to start a chat.');
            return;
        }
        if (isLoading || !chatId) return;

        const newUserMessage: Message = { role: 'user', content: query };
        
        const historyToUpdate = initialHistory || chatHistory;
        const optimisticHistory = historyToUpdate.map(chat => 
            chat.id === chatId ? { ...chat, messages: [...chat.messages, newUserMessage] } : chat
        );
        setChatHistory(optimisticHistory);
        
        setInputValue("");
        setCurrentFollowUps([]);
        setIsLoading(true);

        const messagesForApi = optimisticHistory.find(c => c.id === chatId)?.messages || [];
        
        try {
            const body = { messages: messagesForApi, location, ...additionalData };
            const provider = optimisticHistory.find(c => c.id === chatId)?.provider || 'openai';
            const response = await fetch(`/api/explore?provider=${provider}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!response.ok) throw new Error("API response was not ok.");
            
            const data = await response.json();
            const assistantMessage: Message = { role: 'assistant', content: data.answer };

            // Use functional update to avoid race conditions
            setChatHistory(prevHistory => {
                let historyWithAnswer = prevHistory.map(chat => {
                    if (chat.id === chatId) {
                        return { ...chat, messages: [...chat.messages, assistantMessage] };
                    }
                    return chat;
                });

                const isFirstExchange = (historyWithAnswer.find(c => c.id === chatId)?.messages.length || 0) === 2;
                if (isFirstExchange) {
                    fetch('/api/title', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [newUserMessage, assistantMessage] }) })
                    .then(res => res.json())
                    .then(titleData => {
                        setChatHistory(prev => prev.map(chat => chat.id === chatId ? { ...chat, title: titleData.title } : chat ));
                    })
                    .catch(e => console.error("Title generation failed", e));
                }
                updateAndSaveHistory(historyWithAnswer);
                return historyWithAnswer;
            });

            setCurrentFollowUps(data.followups || []);

        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage: Message = { role: 'assistant', content: "Sorry, I couldn't get a response. Please try again." };
            setChatHistory(prevHistory => 
                prevHistory.map(chat => chat.id === chatId ? { ...chat, messages: [...chat.messages, errorMessage] } : chat )
            );
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
      <div className="flex h-screen bg-gray-100 text-gray-800">
        
        <div className="flex flex-1 flex-col h-screen">
            <header className="p-4 border-b bg-white shadow-sm flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-800 flex items-center"> <Sparkles className="w-6 h-6 mr-2 text-blue-500" /> SkillStrong Coach </h1>
                {activeChat && (
                  <div className="flex items-center space-x-2 p-1 bg-gray-100 rounded-full">
                    <button onClick={() => handleProviderChange('openai')} disabled={isLoading} className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${activeChat.provider === 'openai' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:bg-gray-200'} disabled:opacity-50`}>
                      <OpenAIIcon className="w-4 h-4 inline-block mr-1" /> GPT-4o
                    </button>
                    <button onClick={() => handleProviderChange('gemini')} disabled={isLoading} className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${activeChat.provider === 'gemini' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:bg-gray-200'} disabled:opacity-50`}>
                      <Gem className="w-4 h-4 inline-block mr-1" /> Gemini
                    </button>
                  </div>
                )}
            </header>
            
            <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
               {activeChat && activeChat.messages.length > 0 ? (
                    <div className="space-y-6">
                        {activeChat.messages.map((msg, index) => (
                            <div key={index} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`p-3 rounded-2xl ${msg.role === 'user' ? 'max-w-xl bg-slate-800 text-white rounded-br-none' : 'max-w-4xl bg-white text-gray-800 border rounded-bl-none'}`}>
                                    <article className={`prose prose-sm lg:prose-base max-w-none prose-headings:font-semibold ${msg.role === 'user' ? 'prose-invert prose-a:text-blue-400' : 'prose-a:text-blue-600'}`}>
                                        <ReactMarkdown components={{ a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" /> }} remarkPlugins={[remarkGfm]}>{typeof msg.content === 'string' ? msg.content : 'Error: Invalid message content.'}</ReactMarkdown>
                                    </article>
                                </div>
                            </div>
                        ))}
                        {isLoading && ( <div className="flex justify-start"><div className="max-w-xl p-3 rounded-2xl bg-white text-gray-800 border rounded-bl-none"><TypingIndicator /></div></div> )}
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-2xl font-bold text-center mb-2">How can I help you build your career?</h2> <p className="text-center text-gray-500 mb-8">Select a category to begin exploring.</p>
                        <div className="border-b border-gray-200 mb-6">
                            <nav className="-mb-px flex justify-center space-x-8" aria-label="Tabs">
                                {(['skills', 'salary', 'training'] as ExploreTab[]).map(tab => ( <button key={tab} onClick={() => setActiveExploreTab(tab)} className={`${ activeExploreTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700' } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium capitalize`}> {tab} </button> ))}
                            </nav>
                        </div>
                        <div className="bg-white p-4 rounded-lg border">
                            <h3 className="font-semibold mb-3">{exploreContent[activeExploreTab].title}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {exploreContent[activeExploreTab].prompts.map((prompt, pIdx) => {
                                    if (activeExploreTab === 'skills') {
                                        const slug = careerSlugMap[prompt.toLowerCase()];
                                        return (
                                            <Link
                                                key={pIdx}
                                                href={slug ? `/careers/${slug}` : '#'}
                                                className="text-left text-sm p-3 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors block"
                                            >
                                                {prompt}
                                            </Link>
                                        );
                                    }
                                    return (
                                        <button key={pIdx} onClick={() => sendMessage(prompt, activeChatId)} className="text-left text-sm p-3 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
                                            {prompt}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </main>
            
            <footer className="p-4 bg-white/80 backdrop-blur-sm border-t">
                <div className="w-full max-w-3xl mx-auto">
                    <div className="flex flex-wrap gap-3 justify-center mb-4">
                        {!isLoading && currentFollowUps.map((prompt, index) => {
                            const isResetButton = prompt.includes("Explore other topics");
                            return ( <button key={index} onClick={() => isResetButton ? handleResetActiveChat() : sendMessage(prompt, activeChatId)} disabled={isLoading} className={`group flex items-center px-4 py-2 border rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${ isResetButton ? 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50' }`}> {prompt} {!isResetButton && <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />} </button> );
                        })}
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); sendMessage(inputValue, activeChatId); }} className="flex items-center space-x-2">
                        <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Ask anything or enter your location..." disabled={isLoading} 
                            className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50" />
                        <button type="submit" disabled={isLoading || !inputValue.trim()} className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-400 transition-colors"> <Send className="w-5 h-5" /> </button>
                    </form>
                </div>
            </footer>
        </div>
      </div>
    );
}
