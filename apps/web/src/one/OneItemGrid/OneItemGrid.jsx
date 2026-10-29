import OneTenantImage from "../shared/OneTenantImage.jsx";
import { evaluateFieldExpression } from "../shared/OneFieldExpression.js";
import {
  css,
  records,
  view,
  title,
  fire,
  columns,
} from "../shared/OneData.jsx";

function ItemGrid({ p, rows }) {
  const [sharedFilters, setSharedFilters] = React.useState({});
  React.useEffect(() => {
    if (!p.pageSessionKey || typeof window === "undefined") return undefined;
    const receive = (event) => {
      const data = event.detail;
      if (data?.pageSessionKey !== p.pageSessionKey) return;
      if (data.filterKey === (p.filterKey || "category"))
        setSharedFilters((previous) => ({
          ...previous,
          category: {
            value: String(data.value ?? ""),
            label: String(data.label ?? data.value ?? ""),
            recordId: String(data.recordId ?? ""),
          },
        }));
      if (data.filterKey === (p.searchKey || "catalogue"))
        setSharedFilters((previous) => ({
          ...previous,
          search: String(data.value ?? ""),
        }));
    };
    window.addEventListener("metadrive:page-filter-selected", receive);
    return () =>
      window.removeEventListener("metadrive:page-filter-selected", receive);
  }, [p.pageSessionKey, p.filterKey, p.searchKey]);
  const count = Math.max(1, Math.min(12, Number(p.desktopColumns) || 3));
  const tabletCount = Math.max(1, Math.min(12, Number(p.tabletColumns) || 2));
  const phoneCount = Math.max(1, Math.min(12, Number(p.mobileColumns) || 2));
  const categoryField = String(p.categoryFieldApiName || "").trim();
  const selectedCategory = String(
    sharedFilters.category?.value ?? p.selectedCategory ?? "",
  ).trim();
  const categoryValues = [
    selectedCategory,
    sharedFilters.category?.label ?? p.selectedCategoryLabel,
    sharedFilters.category?.recordId ?? p.selectedCategoryRecordId,
  ]
    .filter((v) => v !== undefined && v !== null && String(v).trim())
    .map((v) => String(v).trim().toLowerCase());
  const categorySelected = categoryValues.length > 0;
  const categoryFieldExists =
    Boolean(categoryField) &&
    rows.some((row) =>
      Object.prototype.hasOwnProperty.call(row, categoryField),
    );
  const matchesCategory = (row) => {
    if (!categorySelected) return true;
    if (!categoryFieldExists) return false;
    const raw = row?.[categoryField],
      values =
        raw && typeof raw === "object"
          ? [raw.Id, raw.id, raw.Name, raw.name, raw.value, raw.label]
          : [raw];
    return values.some(
      (value) =>
        value !== undefined &&
        value !== null &&
        categoryValues.includes(String(value).trim().toLowerCase()),
    );
  };
  const searchQuery = String(sharedFilters.search ?? p.searchQuery ?? "")
    .trim()
    .toLocaleLowerCase();
  const searchFields = String(p.searchFieldApiNames || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const titleField = String(p.titleFieldApiName || ""),
    imageField = String(p.imageFieldApiName || ""),
    priceField = String(p.priceFieldApiName || "");
  const activeField = String(p.recordActiveFieldApiName || "").trim();
  const sortField = String(p.recordSortFieldApiName || "").trim();
  const featuredField = String(p.featuredFieldApiName || "").trim();
  const descriptionField = String(p.descriptionFieldApiName || "").trim();
  const badgeField = String(p.badgeFieldApiName || "").trim();
  const detailRows = Array.isArray(p.detailRows) ? p.detailRows.filter(row=>
    row && typeof row === "object" && !Array.isArray(row)
    && /^[A-Za-z][A-Za-z0-9_]*$/.test(String(row.fieldApiName||""))).slice(0,20) : [];
  const formatDetail = (value,row) => {
    if(value===null||value===undefined||value==="")return String(row.fallback??"");
    const type=String(row.format||"Auto");
    try {
      if(type==="Number"&&Number.isFinite(Number(value)))return new Intl.NumberFormat().format(Number(value));
      if(type==="Percent"&&Number.isFinite(Number(value)))
        return new Intl.NumberFormat(undefined,{maximumFractionDigits:2}).format(Number(value))+"%";
      if(type==="Date"){
        const parsed=new Date(value);
        if(!Number.isNaN(parsed.getTime()))return new Intl.DateTimeFormat().format(parsed);
      }
      if(type==="Money")return currency(value);
    }catch{ /* A badly formatted row never crashes its cards. */ }
    return view(value);
  };
  const safeField = (field) => !field || /^[A-Za-z][A-Za-z0-9_]*$/.test(field);
  if (![activeField, sortField, featuredField, descriptionField, badgeField].every(safeField))
    return <div role="alert">Choose valid display and sorting fields.</div>;
  const visibleRows = rows.filter(
    (row) =>
      (!activeField || row?.[activeField] === true || row?.[activeField] === "true") &&
      matchesCategory(row) &&
      (!searchQuery ||
        searchFields.some((field) =>
          String(row?.[field] ?? "")
            .toLocaleLowerCase()
            .includes(searchQuery),
        )),
  );
  if (sortField) visibleRows.sort((a,b) => {
    const av=a?.[sortField], bv=b?.[sortField];
    const na=Number(av), nb=Number(bv);
    if (av!=null && bv!=null && Number.isFinite(na) && Number.isFinite(nb)) return na-nb;
    return String(av??"").localeCompare(String(bv??""));
  });
  const currency = (value) => Number.isFinite(Number(value)) ? new Intl.NumberFormat().format(Number(value)) : view(value);
  // The universal density property and the card-specific override are both
  // supported; an explicitly authored card density wins for existing pages.
  const density = ["default", "compact", "comfortable", "image-focused", "spacious"].includes(p.cardDensity)
    && p.cardDensity !== "default" ? p.cardDensity
    : ["compact", "comfortable", "spacious"].includes(p.density) ? p.density : "default";
  const lineHeight = Number(p.lineHeight);
  const validLineHeight = Number.isFinite(lineHeight) && lineHeight > 0
    ? (lineHeight > 10 ? lineHeight / 100 : lineHeight) : undefined;
  const cardPadding = Number(p.cardPadding);
  const cardRadius = Number(p.cardRadius);
  const cardMinHeight = Number(p.cardMinHeight);
  const cardBorderWidth = Number(p.cardBorderWidth);
  const imageHeight = Number(p.imageHeight);
  const imageWidth = Number(p.imageWidth);
  const boundedSize = (value,maximum=96) => {
    const number=Number(value);
    return Number.isFinite(number)&&number>=8&&number<=maximum?number:undefined;
  };
  const textStyleFor = (part) => {
    const lineLimit = part==="value" ? 0 : Number(p[part+"LineLimit"]);
    const limit = Number.isInteger(lineLimit)&&lineLimit>0&&lineLimit<=12?lineLimit:0;
    const fontWeight = Number(p[part+"FontWeight"]);
    const alignment = part==="value" ? undefined : p[part+"TextAlign"];
    return {
      fontSize:boundedSize(p[part+"FontSize"]),
      color:part==="value"?undefined:typeof p[part+"Color"]==="string"&&p[part+"Color"]?p[part+"Color"]:undefined,
      fontWeight:Number.isInteger(fontWeight)&&fontWeight>=100&&fontWeight<=900?fontWeight:undefined,
      textAlign:["left","center","right"].includes(alignment)?alignment:undefined,
      lineHeight:validLineHeight,
      minWidth:0,
      whiteSpace:"normal",
      overflowWrap:"anywhere",
      display:limit?"-webkit-box":undefined,
      WebkitBoxOrient:limit?"vertical":undefined,
      WebkitLineClamp:limit||undefined,
      overflow:limit?"hidden":undefined,
    };
  };
  const headingStyle=textStyleFor("heading");
  const supportingStyle=textStyleFor("description");
  const valueStyle=textStyleFor("value");
  const cardShadow = {
    none: "none",
    small: "0 1px 3px rgba(15, 23, 42, 0.12)",
    medium: "0 4px 12px rgba(15, 23, 42, 0.14)",
    large: "0 8px 24px rgba(15, 23, 42, 0.18)",
  }[p.cardShadow];
  const imageFit = ["contain", "cover", "fill", "scale-down"].includes(p.imageFit)
    ? p.imageFit
    : undefined;
  const imageAspectRatio = ["auto", "1/1", "4/3", "16/9", "3/4"].includes(p.imageAspectRatio)
    ? p.imageAspectRatio
    : undefined;
  return (
    <section style={{lineHeight:validLineHeight}}>
      {<h3 className="one-heading" style={{ marginBottom: 12 }}>
        {p.title || "Cards"}
      </h3>}
      <div
        className="one-grid md-product-grid"
        style={{
          "--one-grid-desktop": count,
          "--one-grid-tablet": tabletCount,
          "--one-grid-mobile": phoneCount,
          ...(Number.isFinite(Number(p.gap)) && p.gap!==undefined && Number(p.gap)>=0 && Number(p.gap)<=160 ? {gap:Number(p.gap)} : {}),
        }}
      >
        {visibleRows.map((r, i) => {
          const image = p.imageExpression ? evaluateFieldExpression(p.imageExpression,r) : r?.[imageField],
            validImage =
              typeof image === "string" && (/^https:\/\//i.test(image) || /^asset:[0-9a-f-]{36}$/i.test(image));
          const name = view(r?.[titleField] ?? r?.Name ?? r?.name ?? "Record"),
            price = r?.[priceField];
          const badge = badgeField ? String(r?.[badgeField] ?? "") : "";
          const description = descriptionField ? String(r?.[descriptionField] ?? "") : "";
          const isFeatured = featuredField && (r?.[featuredField] === true || r?.[featuredField] === "true");
          const span = isFeatured ? Math.max(1, Math.min(count, Number(p.featuredColumnSpan) || 2)) : 1;
          const rowSpan = isFeatured ? Math.max(1, Math.min(6, Number(p.featuredRowSpan) || 1)) : 1;
          const imageStyle = {
            display: "block",
            width: Number.isFinite(imageWidth) && imageWidth > 0 ? Math.min(900,imageWidth) : "100%",
            // Without an explicit pixel width, alignment still needs visible
            // breathing room: CSS max-width keeps images from filling the card.
            ...(Number.isFinite(imageWidth) && imageWidth > 0 ? {} : {
              maxWidth:["left","center","right"].includes(p.imagePosition)?"min(78%, 180px)":"100%"
            }),
            borderRadius: p.imageShape==="circle" ? "50%" : p.imageShape==="rounded" ? 12 : 0,
            marginLeft:p.imagePosition==="right" ? "auto" : p.imagePosition==="left" ? "0" : p.imagePosition==="center" ? "auto" : undefined,
            marginRight:p.imagePosition==="left" ? "auto" : p.imagePosition==="right" ? "0" : p.imagePosition==="center" ? "auto" : undefined,
            height: Number.isFinite(imageHeight) && imageHeight > 0
              ? Math.min(900, imageHeight)
              : density === "image-focused" ? 150 : imageFit ? 140 : undefined,
            // object-fit only has a visible effect when the image has a bounded box.
            // Preserve legacy auto height until an explicit imageFit is authored.
            objectFit: imageFit,
            aspectRatio: imageAspectRatio && imageAspectRatio !== "auto" ? imageAspectRatio : undefined,
          };
          const cardStyle = {
            gridColumn: span > 1 ? "span " + span : undefined,
            gridRow: rowSpan > 1 ? "span " + rowSpan : undefined,
            padding: Number.isFinite(cardPadding) && cardPadding >= 0
              ? Math.min(64, cardPadding)
              : density === "compact" ? 8 : density === "comfortable" ? 16 : density === "spacious" ? 24 : density === "image-focused" ? 10 : undefined,
            borderRadius: Number.isFinite(cardRadius) && cardRadius >= 0
              ? Math.min(48, cardRadius)
              : undefined,
            minHeight: Number.isFinite(cardMinHeight) && cardMinHeight > 0
              ? Math.min(1200, cardMinHeight)
              : undefined,
            width:Number.isFinite(Number(p.cardWidth))&&Number(p.cardWidth)>0
              ?Math.min(1200,Number(p.cardWidth)):undefined,
            maxWidth:"100%",
            backgroundColor: typeof p.cardBackgroundColor === "string" ? p.cardBackgroundColor : undefined,
            "--md-card-background": typeof p.cardBackgroundColor === "string" && p.cardBackgroundColor.trim() ? p.cardBackgroundColor : "var(--une-bg,#fff)",
            borderColor: typeof p.cardBorderColor === "string" ? p.cardBorderColor : undefined,
            borderWidth: Number.isFinite(cardBorderWidth) && cardBorderWidth >= 0
              ? Math.min(12, cardBorderWidth)
              : undefined,
            boxShadow: cardShadow,
          };
          const hasSeparateAddButton=false;
          const addSelectedRecord=()=>{
            if(p.cartTargetKey&&p.pageSessionKey&&typeof window!=="undefined")
              window.dispatchEvent(new CustomEvent("metadrive:page-cart-add",{
                detail:{pageSessionKey:p.pageSessionKey,cartTargetKey:p.cartTargetKey,record:r}
              }));
            if(p.actionFlows?.itemAdd)fire(p,"itemAdd",r);
          };
          const activateCard=()=>{
                const behavior=p.selectionBehavior || "add";
                if (behavior==="add" && !hasSeparateAddButton && p.cartTargetKey && p.pageSessionKey
                  && typeof window !== "undefined")
                  window.dispatchEvent(
                    new CustomEvent("metadrive:page-cart-add", {
                      detail: {
                        pageSessionKey: p.pageSessionKey,
                        cartTargetKey: p.cartTargetKey,
                        record: r,
                      },
                    }),
                  );
                if (behavior==="select" && p.pageSessionKey
                  && typeof window !== "undefined")
                  window.dispatchEvent(
                    new CustomEvent("metadrive:page-filter-selected", {
                      detail: {
                        pageSessionKey:p.pageSessionKey,
                        filterKey:p.selectionFilterKey||"selectedRecord",
                        value:String(r.Id??r.id??""),
                        recordId:String(r.Id??r.id??""),
                        label:name,
                        sourceObjectApiName:p.objectApiName||"",
                      },
                    }),
                  );
                if (behavior==="select" && p.pageSessionKey &&
                  /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(p.selectionFilterKey||"selectedRecord")
                  && typeof window!=="undefined")
                  window.dispatchEvent(new CustomEvent("metadrive:page-local-state",{
                    detail:{pageSessionKey:p.pageSessionKey,
                      key:p.selectionFilterKey||"selectedRecord",value:String(r.Id??r.id??"")}
                  }));
                if (p.actionFlows?.itemSelect) fire(p, "itemSelect", r);

          };
          return (
            <div
              role="button"
              tabIndex={0}
              className={
                "one-item one-item--interactive md-product-card md-product-card--" + density +
                (["lift", "highlight"].includes(p.cardHover) ? " md-product-card--hover-" + p.cardHover : "")
              }
              style={cardStyle}
              key={r.Id ?? r.id ?? i}
              aria-label={(p.selectionBehavior === "add" && !hasSeparateAddButton ? "Add " : "Select ") + name}
              onClick={activateCard}
              onKeyDown={event=>{
                if(event.target!==event.currentTarget)return;
                if(event.key==='Enter'||event.key===' '){event.preventDefault();activateCard();}
              }}
            >
              {p.showImage !== false && validImage && (
                <OneTenantImage
                  loading="lazy"
                  src={image}
                  loadAsset={p.loadAsset}
                  alt={name}
                  className="md-product-image"
                  style={imageStyle}
                />
              )}
              {false && p.showImage !== false && !validImage && (
                <span className="md-product-image md-card-image-missing" style={imageStyle} role="img" aria-label="Image unavailable">No image</span>
              )}
              {badge && <span className="md-product-badge" style={{display:"inline-block",
                padding:"3px 8px",borderRadius:999,background:p.badgeBackgroundColor||"#E4002B",
                color:p.badgeTextColor||"#fff",
                fontSize:boundedSize(p.badgeFontSize,48)??"0.75em",
                fontWeight:[400,500,600,700].includes(Number(p.badgeFontWeight))?Number(p.badgeFontWeight):700}}>{badge.slice(0,120)}</span>}
              {p.showTitle !== false && (
                <strong className="md-product-name" style={headingStyle}>{name}</strong>
              )}
              {description &&
                <small className="one-muted md-product-description" style={supportingStyle}>{description.slice(0,220)}</small>}
              {detailRows.length>0 && <dl className="md-card-detail-rows">
                {detailRows.map((detail,index)=>{
                  const raw=r?.[detail.fieldApiName];
                  const display=formatDetail(raw,detail);
                  if((raw===null||raw===undefined||raw==="")&&!String(detail.fallback??""))return null;
                  return <div className="md-card-detail-row" key={detail.fieldApiName+"-"+index}>
                    <dt>{String(detail.label||detail.fieldApiName)}</dt>
                    <dd>{display}</dd>
                  </div>;
                })}
              </dl>}
              {p.showPrice !== false && price != null && (
                <span className="md-product-price" style={valueStyle}>{currency(price)}</span>
              )}
              {false && (hasSeparateAddButton
                ? <button type="button" className="md-card-add-icon" aria-label={"Add "+name}
                    onClick={event=>{event.stopPropagation();addSelectedRecord();}}>
                    ＋
                  </button>
                : <span className="md-card-add-icon" aria-hidden="true">＋</span>
              )}
            </div>
          );
        })}
      </div>
      {categorySelected && !categoryFieldExists && (
        <div className="one-empty" role="status">
          Select a category field on this grid to filter the records.
        </div>
      )}
      {!visibleRows.length && categoryFieldExists && (
        <div className="one-empty" role="status">{p.emptyText || "No matching records"}</div>
      )}
      {!visibleRows.length && !categorySelected && (
        <div className="one-empty" role="status">{p.emptyText || "No matching items"}</div>
      )}
    </section>
  );
}

export default function OneItemGrid(p) {
  const root = css(p),
    rows = records(p);
  return (
    <div {...root}>
      <ItemGrid p={p} rows={rows} />
    </div>
  );
}
