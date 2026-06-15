import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Radio, RotateCcw, Settings } from "lucide-react";
import Button from "../components/Button.jsx";
import { notificationAdapter } from "../lib/adapters/notificationAdapter.js";
import {
  NOTIFICATION_FRAMEWORK_EVENTS,
  getNotificationFrameworkDashboard,
  markNotificationEventForRetry,
  queueNotificationEvent,
  updateNotificationPreferences,
} from "../lib/notificationFramework.js";
import { useAuth } from "../state/AuthContext.jsx";

function Badge({ children }) {
  return <span className="status-badge neutral">{children}</span>;
}

function eventLabel(eventType) {
  return String(eventType || "").replaceAll("_", " ");
}

export default function NotificationsPage({ scope = "user" }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [dashboard, setDashboard] = useState(() => getNotificationFrameworkDashboard(window.localStorage, user, scope));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const isAdmin = user?.role === "admin";

  const title = useMemo(() => {
    if (scope === "admin") return "Admin notification event center";
    if (scope === "supplier") return "Supplier notification center";
    if (scope === "dealer") return "Dealer notification center";
    return "Notification center";
  }, [scope]);

  const refresh = () => {
    setDashboard(getNotificationFrameworkDashboard(window.localStorage, user, scope));
    return Promise.resolve(notificationAdapter.listByUser(window.localStorage, user.id, { user }))
      .then((next) => setNotifications(next))
      .catch((err) => setError(err.message || "Notifications need a refresh. Please try again."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    document.title = `RentasHub - ${title}`;
    let active = true;
    Promise.resolve(notificationAdapter.listByUser(window.localStorage, user.id, { user }))
      .then((next) => {
        if (!active) return;
        setNotifications(next);
        setDashboard(getNotificationFrameworkDashboard(window.localStorage, user, scope));
      })
      .catch((err) => {
        if (active) setError(err.message || "Notifications need a refresh. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [scope, title, user]);

  const markOne = async (notification) => {
    try {
      await Promise.resolve(notificationAdapter.markRead(window.localStorage, notification.id, user.id, { user }));
      await refresh();
    } catch (err) {
      setError(err.message || "Notification could not be marked read.");
    }
  };

  const markAll = async () => {
    try {
      await Promise.resolve(notificationAdapter.markAllRead(window.localStorage, user.id, { user }));
      await refresh();
    } catch (err) {
      setError(err.message || "Notifications could not be marked read.");
    }
  };

  const queueSample = (eventType) => {
    const result = queueNotificationEvent(window.localStorage, user, {
      eventType,
      recipientId: user.id,
      sourceType: "notification_framework",
      relatedRoute: "/notifications",
      payloadPreview: `${eventLabel(eventType)} event center sample.`,
    });
    setMessage(result.valid ? `${eventLabel(eventType)} queued locally.` : result.error);
    refresh();
  };

  const toggleInApp = () => {
    const result = updateNotificationPreferences(window.localStorage, user, {
      channels: { in_app: !dashboard.preferences.channels.in_app },
    });
    setMessage(result.valid ? "In-app preference updated locally." : result.error);
    refresh();
  };

  const markRetry = (eventId) => {
    const result = markNotificationEventForRetry(window.localStorage, user, eventId);
    setMessage(result.valid ? "Retry placeholder recorded. No external delivery occurred." : result.error);
    refresh();
  };

  if (loading) return <main className="page center-page">Loading notifications...</main>;
  if (error) return <main className="page center-page"><section className="panel narrow error-panel">{error}</section></main>;

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide">
        <p className="eyebrow">RentasHub notifications</p>
        <h1>{title}</h1>
        <p>{dashboard.notice}</p>
        <p className="muted">No real email, SMS, push, Twilio, SendGrid, Mailgun, Firebase, or OneSignal provider is active.</p>
      </section>

      <section className="panel wide">
        {message ? <p className="success-text">{message}</p> : null}
        <div className="metric-grid">
          <div><strong>{dashboard.counts.eventTypes}</strong><span>Event types</span></div>
          <div><strong>{dashboard.counts.queued}</strong><span>Queued events</span></div>
          <div><strong>{dashboard.counts.retry}</strong><span>Retry placeholders</span></div>
          <div><strong>{dashboard.counts.audit}</strong><span>Audit events</span></div>
          <div><strong>{dashboard.counts.unread}</strong><span>Unread in-app</span></div>
          <div><strong>{dashboard.counts.liveProviders}</strong><span>Live providers</span></div>
        </div>
      </section>

      <section className="panel wide">
        <div className="section-heading"><span><Bell size={18} aria-hidden="true" /> Notification center</span><Button variant="secondary" onClick={markAll}>Mark all as read</Button></div>
        {notifications.length === 0 ? <div className="empty-state"><strong>No notifications yet</strong><p>Booking, payment, inspection, auction, document, compliance, and payout updates will appear here.</p></div> : (
          <div className="asset-list">
            {notifications.map((notification) => (
              <article className="asset-card" key={notification.id}>
                <div>
                  <Badge>{notification.read ? "read" : "unread"}</Badge>
                  <h3>{notification.title}</h3>
                  <p>{notification.body}</p>
                  <p className="muted">{notification.timestamp}</p>
                </div>
                <div className="card-actions">
                  {!notification.read ? <Button variant="secondary" onClick={() => markOne(notification)}>Mark read</Button> : null}
                  {notification.relatedRoute ? <Button onClick={() => navigate(notification.relatedRoute)}>Open</Button> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel wide">
        <div className="section-heading"><span><Radio size={18} aria-hidden="true" /> Notification event center</span></div>
        <div className="badge-row">{NOTIFICATION_FRAMEWORK_EVENTS.map((eventType) => <Button key={eventType} variant="secondary" onClick={() => queueSample(eventType)}>{eventLabel(eventType)}</Button>)}</div>
      </section>

      <section className="panel wide">
        <div className="section-heading"><span><Settings size={18} aria-hidden="true" /> Notification preferences</span></div>
        <div className="asset-list">
          <article className="asset-card"><div><Badge>{dashboard.preferences.channels.in_app ? "enabled" : "disabled"}</Badge><h3>In-App</h3><p>Local in-app notifications are the only active delivery channel.</p></div><Button variant="secondary" onClick={toggleInApp}>Toggle in-app</Button></article>
          <article className="asset-card"><div><Badge>placeholder</Badge><h3>Email</h3><p>Email delivery is provider-ready only. No SendGrid, Mailgun, or SMTP delivery is active.</p></div><Button variant="ghost" disabled>Email inactive</Button></article>
          <article className="asset-card"><div><Badge>placeholder</Badge><h3>SMS</h3><p>SMS delivery is provider-ready only. No Twilio or carrier SMS delivery is active.</p></div><Button variant="ghost" disabled>SMS inactive</Button></article>
          <article className="asset-card"><div><Badge>placeholder</Badge><h3>Push</h3><p>Push delivery is provider-ready only. No Firebase or OneSignal delivery is active.</p></div><Button variant="ghost" disabled>Push inactive</Button></article>
        </div>
      </section>

      <section className="panel wide">
        <div className="section-heading"><span><RotateCcw size={18} aria-hidden="true" /> Queue and retry status</span></div>
        <div className="asset-list">
          {dashboard.events.length ? dashboard.events.map((event) => (
            <article className="asset-card" key={event.eventId}>
              <div>
                <Badge>{event.status.replaceAll("_", " ")}</Badge>
                <h3>{eventLabel(event.eventType)}</h3>
                <p>{event.payloadPreview}</p>
                <p className="muted">Channels: {event.channels.map(eventLabel).join(", ")} / Retry count: {event.retryCount}</p>
              </div>
              {isAdmin ? <Button variant="secondary" onClick={() => markRetry(event.eventId)}>Mark retry placeholder</Button> : <Link className="button secondary" to={event.relatedRoute || "/notifications"}>Open source</Link>}
            </article>
          )) : <div className="empty-state"><strong>No queued notification events yet</strong><p>Use the event center to queue local provider-ready notification records.</p></div>}
        </div>
      </section>

      <section className="panel wide">
        <div className="section-heading"><span>Provider status dashboard</span></div>
        <div className="asset-list">
          {Object.entries(dashboard.providerStatus).filter(([, value]) => typeof value === "object").map(([provider, status]) => (
            <article className="asset-card" key={provider}>
              <div>
                <Badge>{status.status.replaceAll("_", " ")}</Badge>
                <h3>{eventLabel(provider)}</h3>
                <p>{status.provider || "Local in-app channel"}</p>
                <p className="muted">Production suitable: {status.productionSuitable ? "yes" : "no"}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel wide">
        <div className="section-heading"><span>Notification audit log</span></div>
        <div className="asset-list">
          {dashboard.audit.length ? dashboard.audit.map((entry) => (
            <article className="asset-card" key={entry.auditId}>
              <div>
                <Badge>{entry.action.replaceAll("_", " ")}</Badge>
                <h3>{eventLabel(entry.eventType || entry.sourceType || "notification")}</h3>
                <p>{entry.detail}</p>
                <p className="muted">{entry.createdAt}</p>
              </div>
            </article>
          )) : <div className="empty-state"><strong>No notification audit events yet</strong><p>Queued events, preference changes, and retry placeholders will appear here.</p></div>}
        </div>
      </section>
    </main>
  );
}
