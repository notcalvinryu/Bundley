import { useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import {
  Page,
  Card,
  Button,
  Text,
  BlockStack,
  InlineStack,
  InlineGrid,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { OFFER_TYPE_META } from "../lib/offer-pricing";
import { PREVIEW_BY_TYPE } from "../components/discount-previews";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

// Accent palette for the "Color theme" picker. The chosen accent recolors every
// preview and is passed to the editor on create to seed the offer's accent.
const ACCENTS = [
  "#ec4899",
  "#111111",
  "#e11d48",
  "#f97316",
  "#84cc16",
  "#16a34a",
  "#0ea5e9",
  "#8b5cf6",
  "#3b5bfd",
];

export default function CreateGallery() {
  const [accent, setAccent] = useState(ACCENTS[0]);

  return (
    <Page
      title="Choose a discount type"
      subtitle="You can fully customize it later."
      backAction={{ content: "Your Offers", url: "/app/offers" }}
    >
      <TitleBar title="Choose a discount type" />
      <BlockStack gap="400">
        <InlineStack align="end" blockAlign="center" gap="200">
          <Text as="span" tone="subdued" variant="bodySm">
            Color theme
          </Text>
          <InlineStack gap="100">
            {ACCENTS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setAccent(color)}
                aria-label={`Use ${color}`}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: color,
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  boxShadow:
                    color === accent
                      ? `0 0 0 2px #fff, 0 0 0 4px ${color}`
                      : "inset 0 0 0 1px rgba(0,0,0,0.15)",
                }}
              />
            ))}
          </InlineStack>
        </InlineStack>

        <InlineGrid columns={{ xs: 1, sm: 2, lg: 3 }} gap="400">
          {OFFER_TYPE_META.map((meta) => {
            const Preview = PREVIEW_BY_TYPE[meta.id];
            return (
              <Card key={meta.id}>
                <BlockStack gap="300">
                  <div
                    style={{
                      background: "#f6f6f7",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <Preview accent={accent} />
                  </div>
                  <Text as="p" alignment="center" variant="bodySm" tone="subdued">
                    {meta.caption}
                  </Text>
                  {meta.available ? (
                    <Button
                      variant="primary"
                      fullWidth
                      url={`/app/offers/new?type=${meta.id}&accent=${encodeURIComponent(
                        accent,
                      )}`}
                    >
                      Choose
                    </Button>
                  ) : (
                    <Button fullWidth disabled>
                      Coming soon
                    </Button>
                  )}
                </BlockStack>
              </Card>
            );
          })}
        </InlineGrid>
      </BlockStack>
    </Page>
  );
}
