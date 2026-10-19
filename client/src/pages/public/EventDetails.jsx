import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../../components/shared/Navbar.jsx";
import "./EventDetails.css";

// Temporary data matching Events.jsx.
// Replace with your API response when the event-details endpoint is ready.
const MOCK_EVENTS = [
  {
    id: "1",
    game: "Tekken 8",
    title: "Tekken 8 Individual Ladder",
    description:
      "Individual ladder tryout to select the varsity Tekken 8 roster.",
    status: "Open",
    slotsTaken: 0,
    slotsTotal: 16,
    daysLeft: 15,
    type: "Individual",
    approvalStatus: "Approved",
    published: true,
    eventStart: "2026-11-11",
    eventEnd: "2026-11-12",
    registrationOpens: "2026-10-12",
    registrationCloses: "2026-10-31",
    venue: "NU MOA Esports Lab",
    playersPerTeam: 1,
    activities: [],
  },
  {
    id: "2",
    game: "MLBB",
    title: "MLBB Inter-Department Tournament Season 1",
    description:
      "The flagship MLBB tournament for NU MOA students. Gather your team and compete for glory!",
    status: "Open",
    slotsTaken: 8,
    slotsTotal: 10,
    daysLeft: 15,
    type: "Team",
    approvalStatus: "Approved",
    published: true,
    eventStart: "2026-11-11",
    eventEnd: "2026-11-12",
    registrationOpens: "2026-10-12",
    registrationCloses: "2026-10-31",
    venue: "NU MOA Esports Lab",
    playersPerTeam: 5,
    activities: [],
  },
  {
    id: "3",
    game: "Tekken 8",
    title: "Tekken 8 Campus Tryouts",
    description:
      "Show your skills in Tekken 8 and represent NU MOA in inter-campus competitions!",
    status: "Open",
    slotsTaken: 12,
    slotsTotal: 32,
    daysLeft: 15,
    type: "Individual",
    approvalStatus: "Approved",
    published: true,
    eventStart: "2026-11-11",
    eventEnd: "2026-11-12",
    registrationOpens: "2026-10-12",
    registrationCloses: "2026-10-31",
    venue: "NU MOA Esports Lab",
    playersPerTeam: 1,
    activities: [],
  },
  {
    id: "4",
    game: "CODM",
    title: "CODM Tourna",
    description: "Sample Test",
    status: "Closed",
    slotsTaken: 0,
    slotsTotal: 10,
    daysLeft: 0,
    type: "Team",
    approvalStatus: "Approved",
    published: true,
    eventStart: "2026-10-01",
    eventEnd: "2026-10-02",
    registrationOpens: "2026-09-01",
    registrationCloses: "2026-09-20",
    venue: "NU MOA Esports Lab",
    playersPerTeam: 5,
    activities: [],
  },
  {
    id: "5",
    game: "CODM",
    title: "CODM Fall Showdown",
    description: "A Call of Duty Mobile tournament that has been archived.",
    status: "Closed",
    slotsTaken: 4,
    slotsTotal: 8,
    daysLeft: 0,
    type: "Team",
    approvalStatus: "Approved",
    published: true,
    eventStart: "2026-09-01",
    eventEnd: "2026-09-02",
    registrationOpens: "2026-08-01",
    registrationCloses: "2026-08-20",
    venue: "NU MOA Esports Lab",
    playersPerTeam: 5,
    activities: [],
  },
];

function formatDate(value) {
  if (!value) return "Not specified";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "Not specified";

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getDaysRemaining(value) {
  if (!value) return null;

  const closeDate = new Date(`${String(value).slice(0, 10)}T23:59:59`);
  if (Number.isNaN(closeDate.getTime())) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const closingDay = new Date(
    closeDate.getFullYear(),
    closeDate.getMonth(),
    closeDate.getDate(),
  );

  return Math.ceil((closingDay - today) / (1000 * 60 * 60 * 24));
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M7.5 3v4M16.5 3v4M3.5 9h17" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20v-2a5.5 5.5 0 0 1 11 0v2M16 5.5a3 3 0 0 1 0 5.8M17 14a5 5 0 0 1 3.5 4.8V20" />
    </svg>
  );
}

function ModeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 10h4M9 8v4M15.5 10h.01M17.5 13h.01" />
    </svg>
  );
}

function DetailItem({ icon, label, value }) {
  return (
    <div className="event-detail-item">
      <span className="event-detail-label">
        {icon}
        {label}
      </span>
      <strong>{value || "Not specified"}</strong>
    </div>
  );
}

export default function EventDetails() {
  const { eventId } = useParams();

  // This uses the mock records above until an API endpoint is connected.
  const event = useMemo(
    () => MOCK_EVENTS.find((item) => item.id === eventId),
    [eventId],
  );

  const daysRemaining = getDaysRemaining(event?.registrationCloses);

  if (!event) {
    return (
      <>
        <Navbar variant="blue" />
        <main className="event-details-page">
          <Link to="/events" className="event-back-link">
            <span aria-hidden="true">←</span>
            Back to Events
          </Link>

          <section className="event-not-found">
            <h1>Event not found</h1>
            <p>
              This event may no longer be available or the link may be invalid.
            </p>
            <Link to="/events" className="event-back-button">
              Browse Events
            </Link>
          </section>
        </main>
      </>
    );
  }

  const slotsTaken = Number(event.slotsTaken) || 0;
  const slotsTotal = Number(event.slotsTotal) || 0;
  const isFull = slotsTotal > 0 && slotsTaken >= slotsTotal;
  const isOpen =
    event.status === "Open" &&
    !isFull &&
    daysRemaining !== null &&
    daysRemaining >= 0;

  const statusLabel = isFull
    ? "Full"
    : daysRemaining !== null && daysRemaining < 0
      ? "Closed"
      : event.status;

  const approvalStatus = event.approvalStatus || "Approved";
  const isPublished = event.published !== false;

  return (
    <>
      <Navbar variant="blue" />

      <main className="event-details-page">
        <Link to="/events" className="event-back-link">
          <span aria-hidden="true">←</span>
          Back to Events
        </Link>

        <section className="event-details-card">
          <header className="event-details-header">
            <div className="event-details-heading">
              <div className="event-details-eyebrow">
                <span>{event.game}</span>
                <span className="event-eyebrow-separator">·</span>
                <span>{event.type}</span>
              </div>

              <h1>{event.title}</h1>
            </div>

            <div className="event-details-statuses">
              {isPublished && (
                <span className="event-status-badge published">Published</span>
              )}

              <span className="event-status-badge approved">
                {approvalStatus}
              </span>

              <span
                className={`event-status-badge ${isOpen ? "open" : "closed"}`}
              >
                {statusLabel}
              </span>
            </div>
          </header>

          <p className="event-details-description">{event.description}</p>

          <div className="event-details-grid">
            <DetailItem
              icon={<CalendarIcon />}
              label="Event Start"
              value={formatDate(event.eventStart)}
            />

            <DetailItem
              icon={<CalendarIcon />}
              label="Event End"
              value={formatDate(event.eventEnd)}
            />

            <DetailItem
              icon={<ClockIcon />}
              label="Reg Opens"
              value={formatDate(event.registrationOpens)}
            />

            <DetailItem
              icon={<ClockIcon />}
              label="Reg Closes"
              value={formatDate(event.registrationCloses)}
            />

            <DetailItem icon={<PinIcon />} label="Venue" value={event.venue} />

            <DetailItem
              icon={<UsersIcon />}
              label="Slots"
              value={`${slotsTaken}/${slotsTotal}`}
            />

            <DetailItem icon={<ModeIcon />} label="Mode" value={event.type} />

            <DetailItem
              icon={<UsersIcon />}
              label="Players/Team"
              value={
                event.playersPerTeam ??
                (event.type === "Individual" ? 1 : "Not specified")
              }
            />
          </div>

          {isOpen && daysRemaining !== null && (
            <div className="event-registration-countdown">
              <ClockIcon />

              <p>
                <strong>
                  {daysRemaining === 0
                    ? "Registration closes today"
                    : `${daysRemaining} ${
                        daysRemaining === 1 ? "day" : "days"
                      } left`}
                </strong>

                {daysRemaining > 0 && " until registration closes"}
              </p>
            </div>
          )}

          {isFull && (
            <div className="event-registration-notice full">
              Registration is full. All available slots have been taken.
            </div>
          )}

          {!isOpen && !isFull && (
            <div className="event-registration-notice closed">
              Registration is currently closed.
            </div>
          )}
        </section>

        <section className="event-activity-card">
          <h2>
            <ClockIcon />
            Event Activity
          </h2>

          {event.activities?.length > 0 ? (
            <ul className="event-activity-list">
              {event.activities.map((activity, index) => (
                <li key={activity._id || activity.id || index}>
                  <div>
                    <strong>
                      {activity.action || activity.title || "Event updated"}
                    </strong>

                    {activity.description && <p>{activity.description}</p>}
                  </div>

                  {activity.createdAt && (
                    <time dateTime={activity.createdAt}>
                      {new Date(activity.createdAt).toLocaleString()}
                    </time>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="event-activity-empty">No activity recorded yet.</p>
          )}
        </section>
      </main>
    </>
  );
}
