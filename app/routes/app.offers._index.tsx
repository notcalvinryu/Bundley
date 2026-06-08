import { useMemo, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Text,
  EmptyState,
  Tabs,
  TextField,
  Button,
  Popover,
  ActionList,
  InlineStack,
  BlockStack,
  Box,
  useBreakpoints,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import {
  getOffers,
  getOffer,
  setOfferStatus,
  deleteOffer,
  syncOfferToMetafield,
  ensureDiscountActivated,
  OFFER_TYPE_META,
  normalizeOfferType,
} from "../models/offer.server";

const TYPE_TITLE: Record<string, string> = Object.fromEntries(
  OFFER_TYPE_META.map((m) => [m.id, m.title]),
);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const offers = await getOffers(session.shop);
  return {
    offers: offers.map((offer) => ({
      id: offer.id,
      title: offer.title,
      typeTitle: TYPE_TITLE[normalizeOfferType(offer.type)],
      status: offer.status,
      productTitle: offer.productTitle ?? "No product",
      created: new Date(offer.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    })),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent"));
  const id = String(formData.get("id"));

  if (intent === "toggle") {
    const offer = await getOffer(session.shop, id);
    if (offer) {
      const next = offer.status === "ACTIVE" ? "DRAFT" : "ACTIVE";
      const updated = await setOfferStatus(session.shop, id, next);
      if (updated) {
        await syncOfferToMetafield(admin.graphql, updated);
        if (next === "ACTIVE") await ensureDiscountActivated(admin.graphql);
      }
    }
    return { ok: true };
  }

  if (intent === "delete") {
    const offer = await getOffer(session.shop, id);
    if (offer) {
      await syncOfferToMetafield(admin.graphql, {
        ...offer,
        status: "ARCHIVED",
      });
      await deleteOffer(session.shop, id);
    }
    return { ok: true };
  }

  return { ok: false };
};

type OfferRow = Awaited<ReturnType<typeof loader>>["offers"][number];

// iOS-style on/off switch wired to the row's status fetcher.
function StatusToggle({
  active,
  loading,
  onToggle,
}: {
  active: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={active ? "Deactivate offer" : "Activate offer"}
      disabled={loading}
      onClick={onToggle}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        border: "none",
        padding: 0,
        cursor: loading ? "default" : "pointer",
        background: active ? "#1a1a1a" : "#c9cccf",
        position: "relative",
        opacity: loading ? 0.6 : 1,
        transition: "background 0.15s ease",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: active ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.15s ease",
        }}
      />
    </button>
  );
}

function OfferRowActions({ offer }: { offer: OfferRow }) {
  const fetcher = useFetcher();
  const [menuOpen, setMenuOpen] = useState(false);
  const active = offer.status === "ACTIVE";
  // Reflect the pending status while the toggle request is in flight.
  const pendingActive =
    fetcher.state !== "idle" && fetcher.formData?.get("intent") === "toggle"
      ? !active
      : active;
  const toggling =
    fetcher.state !== "idle" && fetcher.formData?.get("intent") === "toggle";

  const toggle = () => {
    const form = new FormData();
    form.set("intent", "toggle");
    form.set("id", offer.id);
    fetcher.submit(form, { method: "post" });
  };

  const remove = () => {
    setMenuOpen(false);
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete “${offer.title}”? This can't be undone.`)
    ) {
      return;
    }
    const form = new FormData();
    form.set("intent", "delete");
    form.set("id", offer.id);
    fetcher.submit(form, { method: "post" });
  };

  return (
    <InlineStack gap="200" blockAlign="center">
      <StatusToggle active={pendingActive} loading={toggling} onToggle={toggle} />
      <Popover
        active={menuOpen}
        onClose={() => setMenuOpen(false)}
        activator={
          <Button
            variant="tertiary"
            onClick={() => setMenuOpen((o) => !o)}
            accessibilityLabel="More actions"
          >
            ⋯
          </Button>
        }
      >
        <ActionList
          actionRole="menuitem"
          items={[
            { content: "Edit", url: `/app/offers/${offer.id}` },
            { content: "Delete", destructive: true, onAction: remove },
          ]}
        />
      </Popover>
    </InlineStack>
  );
}

export default function OffersIndex() {
  const { offers } = useLoaderData<typeof loader>();
  const { smUp } = useBreakpoints();
  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState("");

  const tabs = [
    { id: "all", content: "All deals" },
    { id: "active", content: "Active" },
    { id: "inactive", content: "Inactive" },
    { id: "scheduled", content: "Scheduled" },
    { id: "ab", content: "A/B test archive" },
  ];

  const filtered = useMemo(() => {
    return offers.filter((offer) => {
      const matchesQuery =
        !query.trim() ||
        offer.title.toLowerCase().includes(query.toLowerCase()) ||
        offer.productTitle.toLowerCase().includes(query.toLowerCase());
      if (!matchesQuery) return false;
      const status = offer.status;
      if (tab === 1) return status === "ACTIVE";
      if (tab === 2) return status !== "ACTIVE";
      if (tab === 3) return false; // Scheduled — not yet supported
      if (tab === 4) return false; // A/B test archive — not yet supported
      return true;
    });
  }, [offers, query, tab]);

  return (
    <Page>
      <TitleBar title="Your Offers" />

      <BlockStack gap="400">
        <Card padding="0">
          <Box
            padding="400"
            borderBlockEndWidth="025"
            borderColor="border"
          >
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h1" variant="headingLg">
                Your Offers
              </Text>
              <Button variant="primary" url="/app/offers/create">
                Create offer
              </Button>
            </InlineStack>
          </Box>

          {offers.length === 0 ? (
            <EmptyState
            heading="Create your first offer"
            action={{ content: "Create offer", url: "/app/offers/create" }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>
              Offer volume discounts, BXGY deals and more. Customers pick a deal
              on the product page and the discount applies automatically at
              checkout.
            </p>
          </EmptyState>
          ) : (
            <>
              <Tabs tabs={tabs} selected={tab} onSelect={setTab} />
          <Box
            paddingInline="400"
            paddingBlockStart="300"
            paddingBlockEnd="300"
            borderBlockEndWidth="025"
            borderColor="border"
          >
            <InlineStack align="space-between" blockAlign="center" gap="300">
              <div style={{ maxWidth: 280, width: "100%" }}>
                <TextField
                  label="Search deals"
                  labelHidden
                  autoComplete="off"
                  placeholder="Search deals"
                  value={query}
                  onChange={setQuery}
                  prefix={<span aria-hidden>🔍</span>}
                />
              </div>
              <Button disclosure variant="tertiary">
                {`(${offers.length}) Performance metrics`}
              </Button>
            </InlineStack>
          </Box>

          <IndexTable
            condensed={!smUp}
            resourceName={{ singular: "deal", plural: "deals" }}
            itemCount={filtered.length}
            selectable={false}
            headings={[
              { title: "Deal" },
              { title: "Created" },
              { title: "Visitors" },
              { title: "CR" },
              { title: "AOV" },
              { title: "Added revenue" },
              { title: "Total revenue" },
              { title: "Actions" },
            ]}
            emptyState={
              <Box padding="600">
                <Text as="p" alignment="center" tone="subdued">
                  No deals in this view.
                </Text>
              </Box>
            }
          >
            {filtered.map((offer, index) => (
              <IndexTable.Row id={offer.id} key={offer.id} position={index}>
                <IndexTable.Cell>
                  <InlineStack gap="300" blockAlign="center" wrap={false}>
                    <span
                      aria-hidden
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        flex: "0 0 auto",
                        background:
                          offer.status === "ACTIVE" ? "#29845a" : "#8a8a8a",
                      }}
                    />
                    <BlockStack gap="050">
                      <Link to={`/app/offers/${offer.id}`}>
                        <Text as="span" fontWeight="semibold">
                          {offer.title}
                        </Text>
                      </Link>
                      <Text as="span" tone="subdued" variant="bodySm">
                        {offer.productTitle}
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </IndexTable.Cell>
                <IndexTable.Cell>{offer.created}</IndexTable.Cell>
                <IndexTable.Cell>0</IndexTable.Cell>
                <IndexTable.Cell>0%</IndexTable.Cell>
                <IndexTable.Cell>$0.00</IndexTable.Cell>
                <IndexTable.Cell>$0</IndexTable.Cell>
                <IndexTable.Cell>$0</IndexTable.Cell>
                <IndexTable.Cell>
                  <OfferRowActions offer={offer} />
                </IndexTable.Cell>
              </IndexTable.Row>
            ))}
          </IndexTable>
            </>
          )}
        </Card>
      </BlockStack>
    </Page>
  );
}
