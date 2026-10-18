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
                    className="h-8.5 w-52.5 max-w-full appearance-none truncate rounded-md border border-gray-200 bg-white bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2214%22%20height=%2214%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%236b7280%22%20stroke-width=%222%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%3E%3Cpath%20d=%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')] bg-size-[14px] bg-position-[right_10px_center] bg-no-repeat pl-3 pr-8 text-[12.5px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
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
