export default function PagePlaceholder({ title = "Page" }) {
  return (
    <main style={{ padding: "32px", fontFamily: "sans-serif" }}>
      <h1>{title}</h1>
      <p>This page is under development.</p>
    </main>
  );
}
