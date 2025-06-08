import { handler } from "./index.js";

const testEvent = {
  version: "0",
  id: "1234-abcd", // EventBridge ID
  "detail-type": "invoice.paid",
  source: "stripe.webhook",
  account: "123456789012",
  time: "2025-05-18T12:00:00Z",
  region: "us-east-1",
  resources: [],
  detail: {
    id: "evt_1RQ2a12esPqFiBdr0OsRiHhW",
    type: "invoice.paid",
    data: {
      object: {
        id: "in_1RQ2Zy2esPqFiBdrwEUHrGFF",
        customer: "cus_SKhz0ujZP5aP29",
        amount_paid: 1300,
        currency: "myr",
        status: "paid",
        created: 1747556898, // UNIX timestamp
        lines: {
          data: [
            {
              parent: {
                subscription_item_details: {
                  subscription: "sub_1RQ2Zy2esPqFiBdrfXVcepSf",
                },
              },
            },
          ],
        },
      },
    },
  },
};

handler(testEvent)
  .then((res) => console.log("Success:", res))
  .catch((err) => console.error("Error:", err));
