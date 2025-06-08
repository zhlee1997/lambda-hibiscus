import { handler } from "./index.js";

const testEvent = {
  version: "0",
  id: "evt_test_001",
  "detail-type": "invoice.created",
  source: "aws.partner/stripe.com/ed_test_example",
  account: "123456789012",
  time: "2025-05-18T12:00:00Z",
  region: "us-east-1",
  resources: [],
  detail: {
    id: "evt_1RQ2a12esPqFiBdr0OsRiHhW",
    type: "invoice.created",
    created: 1747556901,
    data: {
      object: {
        id: "in_1RQ2Zy2esPqFiBdrwEUHrGFF",
        customer: "cus_SKhz0ujZP5aP29",
        amount_paid: 1500,
        currency: "usd",
        status: "paid",
        created: 1747556898,
        hosted_invoice_url: "https://invoice.stripe.com/i/sample-invoice",
        invoice_pdf: "https://files.stripe.com/invoice/sample-invoice.pdf",
        parent: {
          subscription_details: {
            subscription: "sub_1RQ2Zy2esPqFiBdrfXVcepSf",
          },
        },
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
