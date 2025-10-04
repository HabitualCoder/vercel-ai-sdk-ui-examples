'use client'

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, DefaultSystemMessage } from "ai";
import { useState } from "react";

export default function Home() {
  const { messages, setMessages, sendMessage, regenerate, status, stop, error, reload } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    experimental_throttle: 50
  });
  const [input, setInput] = useState('');

  const handleDelete = (id: string) => {
    setMessages(messages.filter(msg => msg.id !== id));
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl h-[80vh] bg-white shadow-lg rounded-2xl overflow-hidden flex flex-col">
        <header className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">AI</div>
            <div>
              <h1 className="text-lg font-medium">AI Chat</h1>
              <p className="text-xs text-slate-500">Converse with the model — streaming supported</p>
            </div>
          </div>
          <div className="text-sm text-slate-600">Status: <span className="font-medium">{status}</span></div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" id="chat-container">
          {messages.length === 0 && (
            <div className="text-center text-slate-400 mt-12">No messages yet — start the conversation below.</div>
          )}

          {messages.map(message => (
            <div key={message.id} className={`max-w-[85%] ${message.role === 'user' ? 'ml-auto text-right' : 'mr-auto text-left'}`}>
              <div className={`${message.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-800 border'} px-4 py-2 rounded-lg shadow-sm inline-block`}>
                <div className="text-xs text-slate-300 md:text-sm hidden">{message.role === 'user' ? 'You' : 'AI'}</div>
                <div className="mt-1">
                  {message.parts.map((part, index) => 
                    part.type === 'text' ? <span key={index} className="whitespace-pre-wrap">{part.text}</span> : null
                  )}
                </div>
              </div>
              <div className="mt-1 text-xs text-slate-400 flex items-center justify-between">
                <span>{new Date(message.createdAt || Date.now()).toLocaleTimeString()}</span>
                <button className="text-rose-500 hover:underline ml-3" onClick={() => handleDelete(message.id)}>Delete</button>
              </div>
            </div>
          ))}
        </main>

        <div className="p-4 border-t bg-white">
          {(status === 'submitted' || status === 'streaming') && (
            <div className="mb-3 flex items-center gap-3">
              {status === 'submitted' && <span className="text-sm text-slate-600">Loading…</span>}
              <button type="button" onClick={() => stop()} className="px-3 py-1 rounded-md bg-rose-100 text-rose-700 text-sm">Stop</button>
            </div>
          )}

          {error && (
            <div className="mb-3 flex items-center gap-3">
              <div className="text-sm text-rose-600">An error occurred.</div>
              <button type="button" onClick={() => reload()} className="px-3 py-1 rounded-md bg-rose-100 text-rose-700 text-sm">Retry</button>
            </div>
          )}

          <form
            onSubmit={e => {
              e.preventDefault();
              if(input.trim()) {
                sendMessage({ text: input });
                setInput('');
              }
            }}
            className="flex gap-3 items-center"
          >
            <input 
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={status !== 'ready'}
              placeholder="Say something..."
              className="flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-60"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={status !== 'ready'} className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-60">Send</button>
              <button type="button" onClick={stop} disabled={!(status === 'streaming' || status === 'submitted')} className="px-3 py-2 rounded-lg bg-rose-50 text-rose-600 disabled:opacity-50">Stop</button>
              <button
                type="button"
                onClick={regenerate}
                disabled={!(status === 'ready' || status === 'error')}
                className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 disabled:opacity-50"
              >
                Regenerate
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
