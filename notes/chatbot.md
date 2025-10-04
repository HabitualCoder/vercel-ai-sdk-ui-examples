
# Chatbot UI — notes & explanations

This document explains the features added to `app/page.tsx` and why they improve the chat experience. It includes code explanations and samples so you can refer back later.

## Features implemented

- Tailwind-based polished UI (header, chat container, message bubbles)
- Auto-scroll to newest message
- Multi-part rendering (text, reasoning, files, source-url, source-document)
- Attachments support (file state + prepared file input)
- Event callbacks: `onData`, `onError`, `onFinish`
- Message metadata rendering (timestamps, usage tokens)
- Cancellation and regeneration controls (`stop`, `regenerate`)
- Throttling UI updates via `experimental_throttle`

Each feature below describes the reasoning, how it's implemented, and includes a short code sample or explanation referencing the component.

---

## 1) Tailwind polished UI

Why: Provide a clean, responsive layout so the chat is pleasant to use and easy to read.

What I added: container, header, chat history area, styled message bubbles (user vs AI), and a footer with controls and the input.

Code excerpt (structure):

```tsx
<div className="min-h-screen bg-gradient-to-b from-white to-slate-50 flex items-center justify-center p-6">
	<div className="w-full max-w-3xl h-[80vh] bg-white shadow-lg rounded-2xl overflow-hidden flex flex-col">
		<header>...title & status...</header>
		<main>...messages...</main>
		<div>...input & controls...</div>
	</div>
</div>
```

Notes: You can tweak colors and spacing in the Tailwind classes to match your branding.

---

## 2) Auto-scroll

Why: When the model streams a long response, auto-scrolling keeps the view on new content.

How: a `ref` on the chat container and a `useEffect` that scrolls to the bottom whenever `messages` changes.

Code excerpt:

```ts
const chatContainerRef = useRef<HTMLDivElement | null>(null);
useEffect(() => {
	const el = chatContainerRef.current;
	if (!el) return;
	el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
}, [messages]);
```

Tip: If you prefer not to disrupt the user's manual scroll, add a check to only auto-scroll when they're near the bottom.

---

## 3) Multi-part rendering

Why: `useChat` returns messages with a `parts` array. Parts can be text, reasoning, file, source-url, etc. Rendering by `parts` makes the UI flexible and future-proof.

Key part types handled:
- text: regular message text
- reasoning: preformatted reasoning tokens
- file: images inline or links for other files
- source-url: link to source web pages
- source-document: references to documents

Code excerpt (simplified):

```tsx
{message.parts.map((part, index) => {
	if (part.type === 'text') return <span key={index}>{part.text}</span>;
	if (part.type === 'reasoning') return <pre key={index}>{part.text}</pre>;
	if (part.type === 'file') {
		if (part.mediaType?.startsWith('image/')) return <img src={part.url} />;
		return <a href={part.url}>{part.filename ?? part.url}</a>;
	}
	if (part.type === 'source-url') return <a href={part.url}>{part.title ?? part.url}</a>;
	if (part.type === 'source-document') return <div>{part.title ?? `Document ${part.id}`}</div>;
	return null;
})}
```

Notes: The `whitespace-pre-wrap` utility preserves newlines in text parts.

---

## 4) Attachments support (client side)

Why: Allow users to send images and files to the AI provider. The `useChat` hook converts `FileList` into data URLs for supported types.

What I added: `files` state and a `fileInputRef`. The final UI optionally can include a file input that sets `files` and sends them with `sendMessage({ text, files })`.

Code excerpt (state and ref):

```ts
const [files, setFiles] = useState<FileList | undefined>(undefined);
const fileInputRef = useRef<HTMLInputElement | null>(null);

// attach to sendMessage
sendMessage({ text: input, files });
```

If you want I can add a visible button and preview for selected files.

---

## 5) Event callbacks: onData / onError / onFinish

Why: Useful for logging, analytics, instrumentation, or custom UI updates.

What I added: callbacks passed to `useChat`.

Code excerpt:

```ts
const { messages, sendMessage } = useChat({
	transport: new DefaultChatTransport({ api: '/api/chat' }),
	onData: data => console.debug('onData', data),
	onError: err => console.error('Chat error', err),
	onFinish: ({ message }) => console.info('Chat finished', message),
});
```

Note: Throwing an error inside `onData` will trigger `onError` and abort the message stream — this can be used to validate incoming data.

---

## 6) Message metadata (timestamps & token usage)

Why: The server can attach usage and timing metadata to messages. Displaying this helps debugging and billing transparency.

What I added: Display `message.metadata?.createdAt` for timestamps and `message.metadata?.totalUsage.totalTokens` for token counts when present.

Code excerpt:

```tsx
<span>{new Date(message.metadata?.createdAt ?? message.createdAt ?? Date.now()).toLocaleTimeString()}</span>
{message.metadata?.totalUsage && (
	<span>{message.metadata.totalUsage.totalTokens} tokens</span>
)}
```

Server-side: attach metadata using `toUIMessageStreamResponse({ messageMetadata })` in your API, for example to return token counts.

---

## 7) Cancellation & regeneration

Why: Users should be able to stop a streaming response and request the assistant to regenerate.

What I added: `Stop` and `Regenerate` buttons wired to `stop()` and `regenerate()` from `useChat`.

Code excerpt:

```tsx
<button onClick={() => stop()} disabled={!(status === 'streaming' || status === 'submitted')}>Stop</button>
<button onClick={() => regenerate()} disabled={!(status === 'ready' || status === 'error')}>Regenerate</button>
```

Notes: `stop()` aborts the current fetch stream. `regenerate()` asks the provider to re-generate the assistant's last response.

---

## 8) Throttling UI updates

Why: For high-frequency streaming, re-rendering for every chunk can be expensive. `experimental_throttle` reduces UI churn by batching updates.

How it's used:

```ts
useChat({ experimental_throttle: 50 /* ms */ })
```

This makes the UI render at most once per 50ms while streaming. Adjust as needed.

---

## Full annotated snippet (representative)

Below is an annotated excerpt showing how these pieces fit together in the component. Refer to `app/page.tsx` for the complete version.

```tsx
// ... imports ...
export default function Home() {
	// chatContainerRef: used for auto-scroll
	const chatContainerRef = useRef(null);

	// useChat with callbacks and throttle
	const { messages, sendMessage, status, stop, regenerate, error, reload, setMessages } = useChat({
		transport: new DefaultChatTransport({ api: '/api/chat' }),
		experimental_throttle: 50,
		onData: d => console.debug('onData', d),
		onError: e => console.error('onError', e),
		onFinish: info => console.info('onFinish', info),
	});

	// local state for input and files
	const [input, setInput] = useState('');
	const [files, setFiles] = useState<FileList | undefined>();

	// auto-scroll effect
	useEffect(() => {
		const el = chatContainerRef.current;
		if (!el) return;
		el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
	}, [messages]);

	// render messages by parts, show metadata, token usage, and delete action
	return (
		<main ref={chatContainerRef}>
			{messages.map(m => (
				<div key={m.id}>
					{m.parts.map((part, i) => {
						if (part.type === 'text') return <div key={i}>{part.text}</div>;
						if (part.type === 'file') return <img key={i} src={part.url} />;
						return null;
					})}
					<div>{new Date(m.metadata?.createdAt ?? m.createdAt ?? Date.now()).toLocaleTimeString()}</div>
				</div>
			))}
			<form onSubmit={e => { e.preventDefault(); sendMessage({ text: input, files }); setInput(''); setFiles(undefined); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
				<input value={input} onChange={e => setInput(e.target.value)} />
				<input type="file" ref={fileInputRef} onChange={e => setFiles(e.target.files ?? undefined)} multiple />
				<button type="submit">Send</button>
			</form>
		</main>
	);
}
```

---

## Extra suggestions

- Add a file preview UI for selected attachments before sending.
- Persist messages to localStorage or a backend for chat history across reloads.
- Add a small analytics hook to log message durations (using onData/onFinish).
- Add a compact `Spinner` component for `status === 'submitted'`.

---

If you want, I can now:
- Add a visual file-attachment button + preview and wire the send flow fully.
- Add localStorage persistence for messages.
- Create smaller components for Message, MessageList, and Input for cleaner code.

Which of these should I do next?

