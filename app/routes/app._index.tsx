import type { LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineGrid,
  Button,
  List,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { getOffers } from "../models/offer.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const offers = await getOffers(session.shop);
  return {
    total: offers.length,
    active: offers.filter((o) => o.status === "ACTIVE").length,
  };
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <BlockStack gap="100">
        <Text as="span" tone="subdued" variant="bodySm">
          {label}
        </Text>
        <Text as="span" variant="heading2xl">
          {value}
        </Text>
      </BlockStack>
    </Card>
  );
}

export default function Index() {
  const { total, active } = useLoaderData<typeof loader>();

  return (
    <Page>
      <TitleBar title="Quantity Breaks">
        <Link to="/app/offers/create" rel="primary">
          Create offer
        </Link>
      </TitleBar>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <InlineGrid columns={{ xs: 2 }} gap="300">
                <Stat label="Total offers" value={total} />
                <Stat label="Active" value={active} />
              </InlineGrid>

              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Sell more with volume discounts
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Create quantity-break offers like “buy 2, save 15%”.
                    Customers pick a quantity tier right on the product page,
                    and the discount is applied automatically at checkout via a
                    Shopify discount function.
                  </Text>
                  <InlineGrid columns={{ xs: 1, sm: 2 }} gap="300">
                    <Button url="/app/offers/create" variant="primary">
                      Create an offer
                    </Button>
                    <Button url="/app/offers">View all offers</Button>
                  </InlineGrid>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  How it works
                </Text>
                <List type="number">
                  <List.Item>Pick a product and add quantity tiers.</List.Item>
                  <List.Item>
                    Set a discount per tier and mark one “Most popular”.
                  </List.Item>
                  <List.Item>
                    Set the offer to <b>Active</b> — it writes the config to the
                    product so the storefront widget and discount appear.
                  </List.Item>
                  <List.Item>
                    Add the <b>Quantity breaks</b> block to your product
                    template in the theme editor.
                  </List.Item>
                </List>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
