const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

const db = getFirestore();

exports.sendQueuedNotification = onDocumentCreated(
  "notificationQueue/{notificationId}",
  async (event) => {
    const snapshot = event.data;

    if (!snapshot) {
      console.log("No notification document found.");
      return;
    }

    const notification = snapshot.data();

    if (!notification || notification.status !== "pending") {
      console.log("Notification is not pending.");
      return;
    }

    const notificationId = event.params.notificationId;

    try {
      const tokensSnapshot = await db
        .collection("fcmTokens")
        .where("enabled", "==", true)
        .get();

      if (tokensSnapshot.empty) {
        await snapshot.ref.update({
          status: "no_devices",
          successCount: 0,
          failureCount: 0,
          completedAt: FieldValue.serverTimestamp()
        });

        console.log("No enabled devices found.");
        return;
      }

      const tokens = [];

      tokensSnapshot.forEach((doc) => {
        const data = doc.data();

        if (data.token) {
          tokens.push(data.token);
        }
      });

      if (tokens.length === 0) {
        await snapshot.ref.update({
          status: "no_devices",
          successCount: 0,
          failureCount: 0,
          completedAt: FieldValue.serverTimestamp()
        });

        return;
      }

      const message = {
        notification: {
          title: notification.title || "عقارات الطفيلة",
          body: notification.body || "لديك إشعار جديد"
        },

        data: {
          title: notification.title || "عقارات الطفيلة",
          body: notification.body || "لديك إشعار جديد",
          tag: "al-tafylah-aqarat-notification",
          url: "/"
        },

        tokens: tokens
      };

      const response = await getMessaging().sendEachForMulticast(message);

      await snapshot.ref.update({
        status: response.failureCount === tokens.length ? "failed" : "sent",
        successCount: response.successCount,
        failureCount: response.failureCount,
        completedAt: FieldValue.serverTimestamp()
      });

      console.log(
        `Notification ${notificationId}: ${response.successCount} sent, ${response.failureCount} failed.`
      );

      // تنظيف الـTokens غير الصالحة
      const cleanupPromises = [];

      response.responses.forEach((result, index) => {
        if (!result.success) {
          const errorCode = result.error?.code || "";

          if (
            errorCode.includes("registration-token-not-registered") ||
            errorCode.includes("invalid-registration-token")
          ) {
            const token = tokens[index];

            const matchingDocs = tokensSnapshot.docs.filter(
              (doc) => doc.data().token === token
            );

            matchingDocs.forEach((doc) => {
              cleanupPromises.push(
                doc.ref.update({
                  enabled: false,
                  disabledAt: FieldValue.serverTimestamp()
                })
              );
            });
          }
        }
      });

      await Promise.all(cleanupPromises);

    } catch (error) {
      console.error("Notification sending error:", error);

      await snapshot.ref.update({
        status: "failed",
        error: error.message || String(error),
        completedAt: FieldValue.serverTimestamp()
      });
    }
  }
);
