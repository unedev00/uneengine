import { useOneDisplay, css, text } from "../shared/OneDisplay.jsx";

export default function OneBadge(props) {
  const p = { ...props, kind: props.kind || "Badge" };
  const { kind, root, textContent } = useOneDisplay(p);
  const displayed=text(p.text ?? p.label ?? p.value ?? (p.builderPreview === true ? "Status" : ""));
  if (!displayed.trim()) return null;
  return (
    <span
      {...root}
      style={{ ...root.style, width: "auto", display: "inline-flex" }}
    >
      <span className="one-badge" role="status">
        {displayed}
      </span>
    </span>
  );
}
