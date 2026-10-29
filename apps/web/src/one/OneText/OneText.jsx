import { useOneDisplay, css, text } from "../shared/OneDisplay.jsx";

export default function OneText(props) {
  const p = { ...props, kind: props.kind || "Text" };
  const { kind, root, textContent } = useOneDisplay(p);
  const rendered = text(textContent) || (p.builderPreview === true ? "Text" : "");
  const lines = rendered.split(/\r?\n/);
  return (
    <div
      {...root}
      style={{
        ...root.style,
        fontSize: Math.max(10, Number(p.fontSize) || 16),
        whiteSpace: "pre-wrap",
      }}
    >
      {p.multilineGap && lines.length > 1
        ? <span className="one-text-lines">{lines.map((line, index) => <span key={index}>{line || "\u00a0"}</span>)}</span>
        : rendered}
    </div>
  );
}
