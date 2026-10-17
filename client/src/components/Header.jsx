import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"; // NEW: added useLocation

// ASSUMPTION: these paths. Change them to match your team's real routes.
const PUBLIC_LINKS = [
  { label: "Events", to: "/events" },
  { label: "Schedule", to: "/schedule" },
  { label: "Bracket", to: "/bracket" },
  { label: "Announcements", to: "/announcements" },
  { label: "My Registrations", to: "/my-registrations" },
  { label: "Profile", to: "/profile" },
];

// Admin only: Dashboard to Announcements.
const ADMIN_LINKS = [
  { label: "Dashboard", to: "/admin/dashboard" },
  { label: "Manage Events", to: "/admin/events" },
  { label: "Approvals", to: "/admin/approvals" },
  { label: "Registrations", to: "/admin/registrations" },
  { label: "Schedule Mgr", to: "/admin/schedule" },
  { label: "Archive", to: "/admin/archive" },
  { label: "Users", to: "/admin/users" },
  { label: "Announcements", to: "/admin/announcements" },
];

const linkClass = ({ isActive }) =>
  `whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors ${
    isActive
      ? "bg-white/25 text-white"
      : "text-blue-100 hover:bg-white/15 hover:text-white"
  }`;

export default function Header() {
  const navigate = useNavigate();

  // NEW: useLocation tells us which URL we are on right now.
  // pathname is just the part after the domain, e.g. "/admin/registrations".
  const { pathname } = useLocation();

  // No login yet, so everyone is treated as admin.
  // Replace this with the real logged-in user later.
  const user = { role: "admin" };
  const isAdmin = user.role === "admin";

  // NEW: true when the URL starts with /admin (any admin page).
  const onAdminPage = pathname.startsWith("/admin");

  // NEW: hide the public links only when an admin is on an admin page.
  const showPublicLinks = !(isAdmin && onAdminPage);

  function handleLogout() {
    localStorage.removeItem("token");
    sessionStorage.clear();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-10 flex min-h-14 items-center gap-4 bg-[#0038a8] px-5 text-white">
      <Link
        to="/"
        className="flex shrink-0 items-center gap-2 text-lg font-extrabold text-white no-underline"
      >
        {/* Put your logo at client/public/logo.png. If it is missing, only the text shows. */}
        <img
          src="/primary.png"
          alt=""
          className="h-15 w-auto"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </Link>

      {/* The nav scrolls sideways on small screens instead of breaking the layout. */}
      <nav
        aria-label="Main"
        className="flex flex-1 items-center justify-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* NEW: public links only render when showPublicLinks is true */}
        {showPublicLinks &&
          PUBLIC_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}

        {isAdmin && (
          <>
            {/* NEW: the divider line is only needed when public links are showing before it */}
            {showPublicLinks && (
              <span
                className="mx-2 h-5 w-px shrink-0 bg-white/40"
                aria-hidden="true"
              />
            )}
            {ADMIN_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        className="shrink-0 rounded-lg border border-white/60 px-3.5 py-1.5 text-[13px] font-semibold hover:bg-white/15"
      >
        Logout
      </button>
    </header>
  );
}
