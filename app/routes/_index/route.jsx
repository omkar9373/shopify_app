import { Form, useLoaderData, useActionData, useNavigation } from "react-router";
import { useState } from "react";
import { connectMongo } from "../../mongodb.server";
import Announcement from "../../models/Announcement";
import { unauthenticated } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  try {
    await connectMongo();
    const latestAnnouncement = await Announcement.findOne().sort({ createdAt: -1 });
    return {
      currentAnnouncement: latestAnnouncement ? latestAnnouncement.announcement : "",
    };
  } catch (error) {
    console.error("Loader DB error:", error);
    return { currentAnnouncement: "" };
  }
};

export const action = async ({ request }) => {
  const formData = await request.formData();
  const announcement = formData.get("announcement") || "";

  // 1. Save to MongoDB
  try {
    await connectMongo();
    await Announcement.create({ announcement });
  } catch (e) {
    console.error("MongoDB save error:", e);
    return { success: false, error: "Failed to save to database." };
  }

  // 2. Sync to Shopify (GraphQL Metafield) for the default store
  const defaultShop = "announcement-store-wbf5rwea.myshopify.com";
  let synced = false;
  try {
    const { admin } = await unauthenticated.admin(defaultShop);
    
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
            }
            userErrors {
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
      const userErrors = metafieldJson.data?.metafieldsSet?.userErrors || [];
      if (userErrors.length === 0) {
        synced = true;
      } else {
        console.error("Shopify user errors:", userErrors);
      }
    }
  } catch (e) {
    console.error("Shopify metafield sync error:", e);
  }

  return { success: true, synced, announcement };
};

export default function App() {
  const { currentAnnouncement } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const [announcementText, setAnnouncementText] = useState(currentAnnouncement);

  const isSaving = navigation.state === "submitting";

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Announcement settings</h1>
        <p className={styles.text}>
          Update the global banner message directly on MongoDB and sync it with your Shopify store.
        </p>

        <Form className={styles.form} method="post">
          <label className={styles.label}>
            <span className={styles.labelSpan}>Announcement Text</span>
            <input
              className={styles.input}
              type="text"
              name="announcement"
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="e.g. 50% Off Everything Today!"
              required
            />
          </label>
          <button className={styles.button} type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Announcement"}
          </button>
        </Form>

        {actionData?.success && (
          <div className={`${styles.statusMessage} ${styles.success}`}>
            ✓ Saved successfully! {actionData.synced ? "Synced to Shopify." : "Database updated, but Shopify sync failed."}
          </div>
        )}
        {actionData?.success === false && (
          <div className={`${styles.statusMessage} ${styles.error}`}>
            ✗ Error: {actionData.error}
          </div>
        )}
      </div>
    </div>
  );
}
