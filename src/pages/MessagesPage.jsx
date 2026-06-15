import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button.jsx";
import { getBookingById } from "../lib/bookingService.js";
import { canAccessThread } from "../lib/messagingService.js";
import { assetAdapter } from "../lib/adapters/assetAdapter.js";
import { messageAdapter } from "../lib/adapters/messageAdapter.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function MessagesPage({ bookingMode = false }) {
  const { threadId, id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState(null);

  const load = () => {
    let active = true;
    Promise.resolve()
      .then(async () => {
      let selectedThread = threadId ? await Promise.resolve(messageAdapter.getThread(window.localStorage, threadId, { user })) : null;
      if (bookingMode) {
        const booking = getBookingById(window.localStorage, id);
        const listing = booking ? assetAdapter.getById(window.localStorage, booking.assetId) : null;
        if (!booking) {
          setError("Booking was not found.");
          return;
        }
        selectedThread = await Promise.resolve(messageAdapter.ensureBookingThread(window.localStorage, booking, listing, { user }));
      }
      const visible = await Promise.resolve(messageAdapter.listVisibleThreads(window.localStorage, user, { user }));
      if (selectedThread && !canAccessThread(user, selectedThread)) {
        setError("You cannot access another user's message thread.");
        return;
      }
      if (!active) return;
      setThreads(visible);
      setActiveThread(selectedThread || visible[0] || null);
      if (selectedThread || visible[0]) {
        const thread = selectedThread || visible[0];
        await Promise.resolve(messageAdapter.markRead(window.localStorage, thread.id, user, { user }));
        const loadedMessages = await Promise.resolve(messageAdapter.listThreadMessages(window.localStorage, thread.id, { user }));
        if (active) setMessages(loadedMessages);
      }
    })
      .catch((err) => {
        if (active) setError(err.message || "Messages need a refresh. Please try again.");
      });
    return () => {
      active = false;
    };
  };

  useEffect(() => {
    document.title = "RentasHub - Messages";
    return load();
  }, [threadId, id, user]);

  const submit = async (event) => {
    event.preventDefault();
    try {
      const result = await Promise.resolve(messageAdapter.send(window.localStorage, { threadId: activeThread.id, user, body }, { user }));
      if (!result.valid) {
        setError(result.error);
        return;
      }
      setBody("");
      load();
    } catch (err) {
      setError(err.message || "Message could not be sent.");
    }
  };

  if (error) return <main className="page center-page"><section className="panel narrow error-panel">{error}</section></main>;

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel">
        <p className="eyebrow">RentasHub</p>
        <h1>RentasHub Messages</h1>
        <p>Local booking-linked conversations. SMS, email, and WhatsApp are future integration channels.</p>
      </section>
      <section className="panel">
        <div className="section-heading"><span>Inbox</span></div>
        {threads.length === 0 ? <div className="empty-state"><strong>No messages yet</strong><p>Booking conversations will appear here.</p></div> : (
          <div className="preview-list">
            {threads.map((thread) => (
              <button className="preview-item message-thread-button" key={thread.id} onClick={() => navigate(`/messages/${thread.id}`)}>
                <strong>{thread.assetTitle || "Booking conversation"}</strong>
                <span>{thread.lastMessage}</span>
                {thread.unreadBy?.[user.id] ? <span className="status-badge neutral">{thread.unreadBy[user.id]} unread</span> : null}
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="panel">
        <div className="section-heading"><span>Thread</span></div>
        {!activeThread ? <div className="empty-state"><strong>No thread selected</strong><p>Select a conversation when one is available.</p></div> : (
          <>
            <div className="chat-list">
              {messages.map((message) => (
                <article className={`chat-message ${message.isSystem ? "system" : ""}`} key={message.id}>
                  <strong>{message.isSystem ? "System" : message.senderRole}</strong>
                  <p>{message.body}</p>
                  <span>{message.timestamp}</span>
                </article>
              ))}
            </div>
            <form className="message-compose" onSubmit={submit}>
              <label className="visually-hidden" htmlFor="message-body">Message body</label>
              <textarea id="message-body" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a message about this booking..." />
              <Button type="submit">Send</Button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
