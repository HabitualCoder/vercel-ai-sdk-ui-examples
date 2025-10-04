'use client'

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, DefaultSystemMessage } from "ai";
import { useState, useEffect, useRef } from "react";

export default function Home() {
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const { messages, setMessages, sendMessage, regenerate, status, stop, error, reload } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    // throttle UI updates for smoother rendering on rapid streams
    experimental_throttle: 50,
    // Event callbacks from the docs: useful for analytics, logging, or additional UI updates
    onData: (data) => {
      // Called whenever a new data part arrives from the server stream
      // Useful for custom logging or side-effects (do NOT mutate messages here)
      console.debug('onData:', data);
    },
    onError: (err) => {
      // Global error handler for the chat hook
      console.error('Chat onError:', err);
    },
    onFinish: ({ message, messages: allMessages, isAbort, isDisconnect, isError }) => {
      // Called when an assistant response has finished streaming
      console.info('Chat onFinish:', { message, isAbort, isDisconnect, isError });
      // Example: you could persist messages to localStorage or send analytics here
    }
  });
  const [input, setInput] = useState('');

  const handleDelete = (id: string) => {
    setMessages(messages.filter(msg => msg.id !== id));
  }

  // File attachment state and ref for the file input
  const [files, setFiles] = useState<FileList | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll to latest message when messages change
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    // Scroll to bottom smoothly when new messages arrive
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

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

  <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" id="chat-container">
          {messages.length === 0 && (
            <div className="text-center text-slate-400 mt-12">No messages yet — start the conversation below.</div>
          )}

          {messages.map(message => (
            <div key={message.id} className={`max-w-[85%] ${message.role === 'user' ? 'ml-auto text-right' : 'mr-auto text-left'}`}>
              <div className={`${message.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-800 border'} px-4 py-2 rounded-lg shadow-sm inline-block`}>
                <div className="text-xs text-slate-300 md:text-sm hidden">{message.role === 'user' ? 'You' : 'AI'}</div>
                <div className="mt-1">
                  {/* Render different part types. The `parts` array can contain text, reasoning, file, and source parts. */}
                  {message.parts.map((part, index) => {
                    // plain text parts (most common)
                    if (part.type === 'text') {
                      return (
                        <span key={index} className="whitespace-pre-wrap">
                          {part.text}
                        </span>
                      );
                    }

                    // reasoning parts: show preformatted block to preserve whitespace
                    if (part.type === 'reasoning') {
                      return (
                        <pre key={index} className="whitespace-pre-wrap bg-slate-100 rounded p-2 text-sm overflow-x-auto">{part.text}</pre>
                      );
                    }

                    // file parts: images are displayed inline; other file types show a link
                    if (part.type === 'file') {
                      if (part.mediaType?.startsWith('image/')) {
                        return (
                          <img key={index} src={part.url} alt={part.filename ?? 'generated image'} className="mt-2 max-w-full rounded" />
                        );
                      }
                      return (
                        <a key={index} href={part.url} target="_blank" rel="noreferrer" className="text-indigo-600 underline">
                          {part.filename ?? part.url}
                        </a>
                      );
                    }

                    // source-url parts: show a link to the source (open in new tab)
                    if (part.type === 'source-url') {
                      return (
                        <div key={index} className="mt-2 text-xs text-slate-600">
                          Source: <a className="text-indigo-600 hover:underline" href={part.url} target="_blank" rel="noreferrer">{part.title ?? new URL(part.url).hostname}</a>
                        </div>
                      );
                    }

                    // source-document parts: show the document title
                    if (part.type === 'source-document') {
                      return (
                        <div key={index} className="mt-2 text-xs text-slate-600">Document: {part.title ?? `Document ${part.id}`}</div>
                      );
                    }

                    // fallback: ignore unsupported part types in the UI
                    return null;
                  })}
                </div>
              </div>
              <div className="mt-1 text-xs text-slate-400 flex items-center justify-between">
                {/* Show createdAt from metadata if available, otherwise fall back to message.createdAt or now */}
                <span>{new Date(message.metadata?.createdAt ?? message.createdAt ?? Date.now()).toLocaleTimeString()}</span>
                <div className="flex items-center gap-3">
                  {/* Show token usage if the server attached usage information to metadata */}
                  {message.metadata?.totalUsage && (
                    <span className="text-[11px] text-slate-400">{message.metadata.totalUsage.totalTokens} tokens</span>
                  )}
                  <button className="text-rose-500 hover:underline ml-3" onClick={() => handleDelete(message.id)}>Delete</button>
                </div>
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
