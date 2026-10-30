import {
  css,
  records,
  view,
  title,
  fire,
  columns,
} from "../../Data.jsx";

function Calendar({ p, rows }) {
  const [date, setDate] = React.useState(() => new Date());
  const y = date.getFullYear(),
    m = date.getMonth(),
    days = new Date(y, m + 1, 0).getDate(),
    first = new Date(y, m, 1).getDay();
  const move = (n) => setDate(new Date(y, m + n, 1));
  return (
    <div className="one-surface">
      <div className="one-row" style={{ justifyContent: "space-between" }}>
        <button className="one-btn" type="button" aria-label="Previous month" onClick={() => move(-1)}>
          ‹
        </button>
        <strong>
          {date.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </strong>
        <button className="one-btn" type="button" aria-label="Next month" onClick={() => move(1)}>
          ›
        </button>
      </div>
      <div
        className="one-grid"
        style={{
          gridTemplateColumns: "repeat(7,minmax(var(--md-control-touch,44px),1fr))",
          gap: 4,
          marginTop: 8,
          overflowX: "auto",
        }}
      >
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <strong key={d} style={{ textAlign: "center" }}>
            {d}
          </strong>
        ))}
        {Array.from({ length: first }, (_, i) => (
          <span key={"blank" + i} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const ds =
              y +
              "-" +
              String(m + 1).padStart(2, "0") +
              "-" +
              String(i + 1).padStart(2, "0"),
            events = rows.filter(
              (x) => String(x.date ?? x.start ?? "").slice(0, 10) === ds,
            );
          return (
            <button
              key={ds}
              type="button"
              className="one-btn one-btn--ghost"
              style={{
                minWidth: "var(--md-control-touch,44px)",
                minHeight: "var(--md-control-touch,44px)",
                padding: 4,
                display: "flex",
                flexDirection: "column",
              }}
              title={events.map(title).join(", ")}
              aria-label={new Date(y, m, i + 1).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) + (events.length ? ", " + events.length + (events.length === 1 ? " event" : " events") : "")}
              onClick={() => fire(p, "dateSelect", { date: ds, events })}
            >
              <span>{i + 1}</span>
              {events.length > 0 && (
                <span
                  className="one-dot"
                  aria-label={events.length + (events.length === 1 ? " event" : " events")}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function OneCalendar(p) {
  const root = css(p),
    rows = records(p);
  return (
    <div {...root}>
      <Calendar p={p} rows={rows} />
    </div>
  );
}
