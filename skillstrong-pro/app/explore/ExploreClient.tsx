// /app/explore/ExploreClient.tsx
'use client'

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { Sparkles, ArrowRight, Send, PlusCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLocation } from '@/app/contexts/LocationContext';
import Link from 'next/link';

// Type Definitions
type Role = "user" | "assistant";
interface Message { role: Role; content: string; }
type ExploreTab = 'skills' | 'salary' | 'training';

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
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentFollowUps, setCurrentFollowUps] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeExploreTab, setActiveExploreTab] = useState<ExploreTab>('skills');
    const [inputValue, setInputValue] = useState("");
    const [showAllFollowUps, setShowAllFollowUps] = useState(false);
    const { location } = useLocation();
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const initialize = () => {
            const initialPrompt = searchParams.get('prompt');
            if (initialPrompt) {
                if (!user) { router.push('/account?message=Please sign in to continue.'); return; }
                sendMessage(initialPrompt);
                const newUrl = window.location.pathname;
                window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
            } else if (localStorage.getItem('skillstrong-quiz-results')) {
                const quizResultsString = localStorage.getItem('skillstrong-quiz-results');
                localStorage.removeItem('skillstrong-quiz-results');
                if (!user) { router.push('/account?message=Please sign up or sign in to see your quiz results.'); return; }
                const { answers } = JSON.parse(quizResultsString!);
                const userMessage = "I just took the quiz. Based on my results, what careers do you recommend?";
                sendMessage(userMessage, { quiz_results: answers });
            }
        };
        initialize();
    }, []);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isLoading]);
    
    const sendMessage = async (query: string, additionalData = {}) => {
        if (!user) {
            router.push('/account?message=Please sign up or sign in to start a chat.');
            return;
        }
        if (isLoading) return;

        setShowAllFollowUps(false);
        const newUserMessage: Message = { role: 'user', content: query };
        const currentMessages = [...messages, newUserMessage];
        setMessages(currentMessages);
        setInputValue("");
        setCurrentFollowUps([]);
        setIsLoading(true);

        try {
            const body = { messages: currentMessages, location, ...additionalData };
            const response = await fetch('/api/explore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!response.ok) throw new Error("API response was not ok.");
            
            const data = await response.json();
            const assistantMessage: Message = { role: 'assistant', content: data.answer };

            setMessages(prevMessages => [...prevMessages, assistantMessage]);
            setCurrentFollowUps(data.followups || []);
        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage: Message = { role: 'assistant', content: "Sorry, I couldn't get a response. Please try again." };
            setMessages(prevMessages => [...prevMessages, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetChat = () => {
        setMessages([]);
        setCurrentFollowUps([]);
        setShowAllFollowUps(false);
    };
    
    return (
      <div className="flex h-screen bg-gray-100 text-gray-800">
        <div className="flex flex-1 flex-col h-screen">
            <header className="p-4 border-b bg-white shadow-sm flex justify-between items-center z-10">
                <h1 className="text-xl font-bold text-gray-800 flex items-center"> <Sparkles className="w-6 h-6 mr-2 text-blue-500" /> SkillStrong Coach </h1>
            </header>
            
            <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
               {messages.length > 0 ? (
                    <div className="space-y-6">
                        {messages.map((msg, index) => (
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
                                            <Link key={pIdx} href={slug ? `/careers/${slug}` : '#'} className="text-left text-sm p-3 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors block">
                                                {prompt}
                                            </Link>
                                        );
                                    }
                                    return ( <button key={pIdx} onClick={() => sendMessage(prompt)} className="text-left text-sm p-3 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"> {prompt} </button> );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </main>
            
            <footer className="p-4 bg-white/80 backdrop-blur-sm border-t">
                <div className="w-full max-w-3xl mx-auto">
                    <div className="flex flex-col items-center gap-3 mb-4">
                        {/* Staggered Follow-ups */}
                        {!isLoading && currentFollowUps.slice(0, showAllFollowUps ? currentFollowUps.length : 2).map((prompt, index) => {
                            const isResetButton = prompt.includes("Explore other topics");
                            return ( <button key={index} onClick={() => isResetButton ? handleResetChat() : sendMessage(prompt)} disabled={isLoading} className={`w-full md:w-auto group flex items-center justify-center text-center px-4 py-2 border rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${ isResetButton ? 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50' }`}> {prompt} {!isResetButton && <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />} </button> );
                        })}
                        {!isLoading && currentFollowUps.length > 2 && !showAllFollowUps && (
                            <button onClick={() => setShowAllFollowUps(true)} className="group flex items-center px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors">
                                <PlusCircle className="w-4 h-4 mr-2"/>
                                More options
                            </button>
                        )}
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); sendMessage(inputValue); }} className="flex items-center space-x-2">
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
