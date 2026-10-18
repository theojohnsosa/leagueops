import { useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import BracketView from "../components/BracketView.jsx";
import { api, errorMessage } from "../lib/api.js";

// true  = the dropdown lists only events whose bracket is published.
// false = it lists every event (handy while testing, because the seed data
//         has no published brackets).
const ONLY_PUBLISHED_BRACKETS = true;

export default function Bracket() {
  // null while loading, then { events, error }
  const [eventsState, setEventsState] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  // matches are kept per event: { [eventId]: { matches, error } }
  const [results, setResults] = useState({});

  useEffect(() => {
    let ignore = false;
    api
      .get("/events")
      .then((res) => {
        if (ignore) return;
        const all = res.data?.data ?? [];
        const events = ONLY_PUBLISHED_BRACKETS
          ? all.filter((e) => e.isBracketPublished)
          : all;
        setEventsState({ events, error: "" });
      })
      .catch((err) => {
        if (!ignore) setEventsState({ events: [], error: errorMessage(err) });
      });
    return () => {
      ignore = true;
    };
  }, []);

  const events = eventsState?.events ?? [];
  // Until the visitor picks one, show the first event.
  const activeId = selectedId || events[0]?._id || "";

  useEffect(() => {
    if (!activeId) return;
    let ignore = false;
    api
      .get(`/events/${activeId}/matches`)
      .then((res) => {
        if (!ignore) {
          setResults((r) => ({
            ...r,
            [activeId]: { matches: res.data ?? [], error: "" },
          }));
        }
      })
      .catch((err) => {
        if (!ignore) {
          setResults((r) => ({
            ...r,
            [activeId]: { matches: [], error: errorMessage(err) },
          }));
        }
      });
    return () => {
      ignore = true;
    };
  }, [activeId]);

  const result = results[activeId];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <h1 className="text-2xl font-bold tracking-tight">Bracket</h1>
          <p className="mt-1 text-sm text-gray-500">
            View tournament brackets and results.
          </p>

          {!eventsState && (
            <p className="py-10 text-center text-gray-500">
              Loading brackets...
            </p>
          )}

          {eventsState?.error && (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-red-700"
            >
              {eventsState.error}
            </div>
          )}

          {eventsState && !eventsState.error && events.length === 0 && (
            <p className="py-10 text-center text-gray-500">
              No brackets are published yet.
            </p>
          )}

          {events.length > 0 && (
            <>
              <div className="mt-5">
                <label htmlFor="bracket-event" className="sr-only">
                  Select an event
                </label>
                <select
                  id="bracket-event"
                  value={activeId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-64 max-w-full truncate rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0038a8] focus:outline-none focus:ring-2 focus:ring-[#0038a8]/30"
                >
                  {events.map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </div>

              {!result && (
                <p className="py-10 text-center text-gray-500">
                  Loading matches...
                </p>
              )}

              {result?.error && (
                <div
                  role="alert"
                  className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-red-700"
                >
                  {result.error}
                </div>
              )}

              {result && !result.error && (
                <BracketView matches={result.matches} />
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
