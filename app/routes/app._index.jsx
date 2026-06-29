import { useEffect, useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { connectMongo } from "../mongodb.server";
import Announcement from "../models/Announcement";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Fetch from MongoDB
  let dbAnnouncements = [];
  try {
    await connectMongo();
    dbAnnouncements = await Announcement.find().sort({ createdAt: -1 }).limit(10);
  } catch (e) {
    console.error("MongoDB error:", e);
  }

  // Fetch current metafield value
  let currentMetafieldValue = "";
  try {
    const response = await admin.graphql(
      `#graphql
      query ShopMetafields {
        shop {
          metafield(namespace: "my_app", key: "announcement") {
            value
          }
        }
      }`
    );
    const responseJson = await response.json();
    currentMetafieldValue = responseJson.data?.shop?.metafield?.value || "";
  } catch (e) {
    console.error("Shopify GraphQL error:", e);
  }

  return {
    dbAnnouncements: JSON.parse(JSON.stringify(dbAnnouncements)),
    currentMetafieldValue,
  };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const announcement = formData.get("announcement") || "";

  // 1. Save to MongoDB
  let savedDbRecord = null;
  try {
    await connectMongo();
    savedDbRecord = await Announcement.create({ announcement });
  } catch (e) {
    console.error("MongoDB save error:", e);
  }

  // 2. Sync to Shopify (GraphQL Metafield)
  let userErrors = [];
  try {
    const shopResponse = await admin.graphql(
      `#graphql
      query ShopId {
        shop {
          id
        }
      }`
    );
    const shopJson = await shopResponse.json();
    const shopId = shopJson.data?.shop?.id;

    if (shopId) {
      const metafieldResponse = await admin.graphql(
        `#graphql
        mutation SetMetafield($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              namespace
              key
              value
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            metafields: [
              {
                ownerId: shopId,
                namespace: "my_app",
                key: "announcement",
                type: "single_line_text_field",
                value: announcement,
              },
            ],
          },
        }
      );
      const metafieldJson = await metafieldResponse.json();
      userErrors = metafieldJson.data?.metafieldsSet?.userErrors || [];
    } else {
      userErrors = [{ message: "Could not retrieve Shop GID" }];
    }
  } catch (e) {
    console.error("Shopify metafield save error:", e);
    userErrors = [{ message: e.message }];
  }

  return {
    success: userErrors.length === 0,
    errors: userErrors,
    savedDbRecord,
  };
};

export default function Index() {
  const { dbAnnouncements, currentMetafieldValue } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const shopify = useAppBridge();

  const [announcementText, setAnnouncementText] = useState(currentMetafieldValue);

  const isSaving = navigation.state === "submitting";

  useEffect(() => {
    if (actionData?.success) {
      shopify.toast.show("Announcement saved and synced!");
    } else if (actionData?.errors?.length > 0) {
      shopify.toast.show(`Error: ${actionData.errors[0].message}`);
    }
  }, [actionData, shopify]);

  return (
    <s-page heading="Announcement Banner">
      <s-section heading="Manage Announcement Settings">
        <s-paragraph>
          Update the global banner message that appears on your online storefront. The message is stored in your database and synchronized to your Shopify store's metafields.
        </s-paragraph>

        <Form method="post">
          <s-stack direction="block" gap="base">
            <s-text-field
              name="announcement"
              label="Announcement Text"
              placeholder="e.g. 50% Off Everything Today!"
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.currentTarget.value)}
              autocomplete="off"
            />
            <s-button type="submit" {...(isSaving ? { loading: true } : {})}>
              Save Announcement
            </s-button>
          </s-stack>
        </Form>
      </s-section>

      <s-section slot="aside" heading="Metafield Sync Status">
        <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
          <s-stack direction="block" gap="small">
            <div>
              <strong>Current Banner Value:</strong>
              <div style={{ marginTop: "4px", fontStyle: "italic", color: currentMetafieldValue ? "#000" : "#8c8c8c" }}>
                {currentMetafieldValue || "No announcement set"}
              </div>
            </div>
            <div style={{ marginTop: "8px" }}>
              <strong>Namespace:</strong> <code>my_app</code>
            </div>
            <div>
              <strong>Key:</strong> <code>announcement</code>
            </div>
          </s-stack>
        </s-box>
      </s-section>

      <s-section heading="Database Audit History (MongoDB)">
        <s-paragraph>
          Review historical changes saved to your database.
        </s-paragraph>
        {dbAnnouncements.length === 0 ? (
          <s-paragraph>No records found in database yet.</s-paragraph>
        ) : (
          <s-stack direction="block" gap="small">
            {dbAnnouncements.map((item, idx) => (
              <s-box key={item._id || idx} padding="base" borderWidth="base" borderRadius="base">
                <s-stack direction="inline" align="space-between" gap="base">
                  <div>
                    <strong>Message:</strong> "{item.announcement}"
                  </div>
                  <div style={{ color: "#6d7175", fontSize: "12px" }}>
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
