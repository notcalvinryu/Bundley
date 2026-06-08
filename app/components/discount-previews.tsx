// Lightweight, presentational mockups of each discount template, shown in the
// "Choose a discount type" gallery. They approximate the storefront widget for
// each type and are recolored by the `accent` prop from the gallery's
// color-theme picker. Pure UI — no data, no server imports.
import type { CSSProperties, ReactNode } from "react";
import type { OfferType } from "../lib/offer-pricing";

export type PreviewProps = { accent: string };

// A light tint of the accent for selected backgrounds (8-digit hex alpha).
function tint(accent: string, alpha = "16"): string {
  return /^#[0-9a-fA-F]{6}$/.test(accent) ? accent + alpha : "#f5f7ff";
}

const shell: CSSProperties = {
  background: "#fff",
  borderRadius: 10,
  padding: 12,
  fontSize: 12,
  lineHeight: 1.3,
  color: "#1a1a1a",
};

const headerStyle: CSSProperties = {
  textAlign: "center",
  fontWeight: 700,
  fontSize: 10,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: "#1a1a1a",
  marginBottom: 10,
};

function Dot({ accent, selected }: { accent: string; selected: boolean }) {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        borderRadius: "50%",
        border: `2px solid ${selected ? accent : "#bbb"}`,
        position: "relative",
        flex: "0 0 auto",
      }}
    >
      {selected && (
        <span
          style={{
            position: "absolute",
            inset: 2,
            borderRadius: "50%",
            background: accent,
          }}
        />
      )}
    </span>
  );
}

function Tag({ accent, children }: { accent: string; children: ReactNode }) {
  return (
    <span
      style={{
        background: tint(accent, "22"),
        color: accent,
        fontSize: 9,
        fontWeight: 700,
        padding: "1px 6px",
        borderRadius: 5,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Thumb({ size = 34 }: { size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        background: "linear-gradient(135deg,#ececec,#f6f6f6)",
        border: "1px solid #e3e3e3",
        flex: "0 0 auto",
        display: "block",
      }}
    />
  );
}

function Row({
  accent,
  selected = false,
  title,
  sub,
  price,
  compare,
  badge,
  tag,
}: {
  accent: string;
  selected?: boolean;
  title: ReactNode;
  sub?: ReactNode;
  price?: ReactNode;
  compare?: ReactNode;
  badge?: ReactNode;
  tag?: ReactNode;
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        padding: "8px 10px",
        border: `2px solid ${selected ? accent : "#e3e3e3"}`,
        borderRadius: 8,
        background: selected ? tint(accent) : "#fff",
        marginBottom: 8,
      }}
    >
      {badge && (
        <span
          style={{
            position: "absolute",
            top: -8,
            right: 10,
            background: accent,
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            padding: "1px 6px",
            borderRadius: 5,
            textTransform: "uppercase",
          }}
        >
          {badge}
        </span>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <Dot accent={accent} selected={selected} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {title}
            {tag}
          </div>
          {sub && <div style={{ fontSize: 10, color: "#6b7280" }}>{sub}</div>}
        </div>
      </div>
      {(price || compare) && (
        <div style={{ textAlign: "right", flex: "0 0 auto" }}>
          {price && <div style={{ fontWeight: 700 }}>{price}</div>}
          {compare && (
            <div
              style={{
                fontSize: 10,
                color: "#9ca3af",
                textDecoration: "line-through",
              }}
            >
              {compare}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function QuantityBreaksPreview({ accent }: PreviewProps) {
  return (
    <div style={shell}>
      <div style={headerStyle}>Buy more &amp; save</div>
      <Row accent={accent} title="Single" sub="Standard price" price="$24.98" compare="$39.98" />
      <Row
        accent={accent}
        selected
        badge="Most popular"
        title="Duo"
        sub="You save 47%"
        price="$42.48"
        compare="$79.96"
      />
      <Row accent={accent} title="Trio" sub="You save 50%" price="$59.97" compare="$119.94" />
    </div>
  );
}

export function BxgyPreview({ accent }: PreviewProps) {
  return (
    <div style={shell}>
      <Row
        accent={accent}
        selected
        title="Buy 1, get 1 free"
        tag={<Tag accent={accent}>Save 69%</Tag>}
        price="$24.98"
        compare="$79.96"
      />
      <Row
        accent={accent}
        title="Buy 2, get 3 free"
        tag={<Tag accent={accent}>Save 75%</Tag>}
        price="$49.96"
        compare="$199.90"
      />
      <Row
        accent={accent}
        title="Buy 3, get 6 free"
        tag={<Tag accent={accent}>Save 79%</Tag>}
        price="$74.94"
        compare="$359.82"
      />
      <div
        style={{
          background: tint(accent, "20"),
          color: accent,
          fontWeight: 700,
          fontSize: 11,
          textAlign: "center",
          padding: "7px 0",
          borderRadius: 8,
        }}
      >
        + FREE special gift!
      </div>
    </div>
  );
}

export function PacksPreview({ accent }: PreviewProps) {
  return (
    <div style={shell}>
      <Row accent={accent} title="1 pack" sub="Standard price" price="$24.98" compare="$39.98" />
      <Row
        accent={accent}
        selected
        badge="Most popular"
        title={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Thumb size={28} />
            2 pack
          </span>
        }
        sub="You save 47%"
        price="$42.48"
        compare="$79.96"
      />
      <Row accent={accent} title="3 pack" tag={<Tag accent={accent}>Save 47%</Tag>} price="$63.72" compare="$119.94" />
    </div>
  );
}

export function BundlePreview({ accent }: PreviewProps) {
  return (
    <div style={shell}>
      <Row accent={accent} title="This product only" price="$24.98" compare="$39.98" />
      <div
        style={{
          border: `2px solid ${accent}`,
          borderRadius: 8,
          background: tint(accent),
          padding: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Dot accent={accent} selected />
            <b>Complete the bundle</b>
          </span>
          <b>$39.19</b>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Thumb />
          <span style={{ color: accent, fontWeight: 700 }}>+</span>
          <Thumb />
          <span style={{ fontSize: 10, color: "#6b7280", marginLeft: "auto" }}>
            Save $51.78!
          </span>
        </div>
      </div>
    </div>
  );
}

export function SubscriptionPreview({ accent }: PreviewProps) {
  return (
    <div style={shell}>
      <Row accent={accent} selected title="Buy 1, get 1 free" tag={<Tag accent={accent}>Save 75%</Tag>} price="$19.98" compare="$79.96" />
      <Row accent={accent} title="Buy 2, get 3 free" tag={<Tag accent={accent}>Save 80%</Tag>} price="$39.96" compare="$199.90" />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          border: "1.5px dashed #c9c9c9",
          borderRadius: 8,
          padding: "8px 10px",
        }}
      >
        <span
          style={{
            width: 15,
            height: 15,
            borderRadius: 4,
            background: accent,
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✓
        </span>
        <div>
          <b>Subscribe &amp; Save 20%</b>
          <div style={{ fontSize: 10, color: "#6b7280" }}>Delivered weekly</div>
        </div>
      </div>
    </div>
  );
}

export function ProgressiveGiftsPreview({ accent }: PreviewProps) {
  const tile: CSSProperties = {
    flex: 1,
    border: "1px solid #e3e3e3",
    borderRadius: 8,
    padding: "10px 4px",
    textAlign: "center",
    fontSize: 9,
    color: "#6b7280",
  };
  return (
    <div style={shell}>
      <div style={{ ...headerStyle, textTransform: "none", fontSize: 11 }}>
        🎁 Unlock free gifts with your order
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ ...tile, borderColor: accent, background: tint(accent) }}>
          <div style={{ fontWeight: 700, color: accent, marginBottom: 4 }}>FREE</div>
          🚚
          <div style={{ marginTop: 4 }}>Free shipping</div>
        </div>
        <div style={{ ...tile, borderColor: accent, background: tint(accent) }}>
          <div style={{ fontWeight: 700, color: accent, marginBottom: 4 }}>FREE</div>
          <Thumb size={22} />
          <div style={{ marginTop: 4 }}>Free gift</div>
        </div>
        <div style={tile}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>$60+</div>
          🔒
          <div style={{ marginTop: 4 }}>Locked</div>
        </div>
      </div>
    </div>
  );
}

// Map an offer type to its preview component for the gallery.
export const PREVIEW_BY_TYPE: Record<
  OfferType,
  (props: PreviewProps) => JSX.Element
> = {
  QUANTITY_BREAKS: QuantityBreaksPreview,
  BXGY: BxgyPreview,
  PACKS: PacksPreview,
  BUNDLE: BundlePreview,
  SUBSCRIPTION: SubscriptionPreview,
  PROGRESSIVE_GIFTS: ProgressiveGiftsPreview,
};
