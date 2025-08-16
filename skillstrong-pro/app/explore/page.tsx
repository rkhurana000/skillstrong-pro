'use client'

import { useChat } from '@ai-sdk/react';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Type definitions
type Role = 'user' | 'assistant';

interface Message {
  role: Role;
  content: string;
}

interface ChipProps {
  text: string;
  onClick: () => void;
}

const Chip: React.FC<ChipProps> = ({ text, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-semibold hover:bg-blue-700 transition-colors"
    >
      {text}
    </button>
  );
};

export default function ExplorePage() {
  const [currentProvider, setCurrentProvider] = useState<string>('gemini');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, setMessages, isLoading, append } = useChat({
    api: `/api/explore?provider=${currentProvider}`,
  });
  
  const [followups, setFollowups] = useState<string[]>([]);
  
  // This is the updated function to handle sending messages, including from chips
  const handleSendMessage = useCallback(async (text: string) => {
    // Add the user's new message (from input or a chip) to the chat history
    const userMessage = { role: 'user' as const, content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages); // Optimistically update UI
    
    // Clear the input and existing followups
    handleInputChange({ target: { value: '' } } as any);
    setFollowups([]);

    // Call the AI provider with the updated message list
    try {
        const response = await fetch(`/api/explore?provider=${currentProvider}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: newMessages,
                intent: 'initial', // The API determines intent based on history
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch AI response.');
        }

        const data = await response.json();
        const assistantMessage = { role: 'assistant' as const, content: data.answer };
        setMessages([...newMessages, assistantMessage]); // Add the assistant's response
        setFollowups(data.followups); // Update with the new follow-ups
    } catch (error) {
        console.error("API call failed:", error);
        // Handle error gracefully, e.g., show a friendly error message
        setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I am unable to provide a response right now. Please try again later.' }]);
    }
  }, [messages, setMessages, currentProvider, handleInputChange]);

  // Handle a new message from the user input
  const onSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim()) {
        handleSendMessage(input);
    }
  }, [input, handleSendMessage]);


  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, followups]);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-50 relative">
      <div className="flex-grow overflow-y-auto p-4 md:p-8" ref={chatContainerRef}>
        <div className="flex flex-col gap-y-6 max-w-2xl mx-auto">
          {messages.map((message, index) => (
            <div key={index} className="flex flex-col space-y-2">
              <span className={`text-sm font-semibold ${message.role === 'user' ? 'text-blue-400' : 'text-green-400'}`}>
                {message.role === 'user' ? 'You' : 'SkillStrong AI'}
              </span>
              <div className={`p-4 rounded-xl ${message.role === 'user' ? 'bg-blue-600' : 'bg-slate-700'}`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  className="prose prose-sm prose-invert"
                  components={{
                    // Add your custom components if needed (e.g., for code blocks)
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          {/* Typing indicator can go here */}
        </div>
      </div>
      
      {/* Input area */}
      <div className="w-full bg-slate-800 p-4 md:p-6 border-t border-slate-700">
        <div className="max-w-2xl mx-auto">
          {/* Follow-up Chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {followups.map((followup, index) => (
              <Chip
                key={index}
                text={followup}
                onClick={() => handleSendMessage(followup)} // This is the key change
              />
            ))}
          </div>

          <form onSubmit={onSubmit} className="flex items-center gap-2">
            <input
              className="flex-grow p-3 rounded-lg bg-slate-700 text-slate-50 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask me anything..."
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
