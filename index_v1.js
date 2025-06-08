const mysql = require("mysql2/promise");

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

// Validate environment variables
if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  console.error("Missing required database environment variables");
}

exports.handler = async (event) => {
  console.log("DB_HOST:", DB_HOST);
  console.log("DB_USER:", DB_USER);
  console.log("DB_NAME:", DB_NAME);
  console.log("Received event:", JSON.stringify(event, null, 2));

  const detail = event.detail;
  const invoice = detail.data.object;

  // Extract essential fields
  const eventId = detail.id;
  const invoiceId = invoice.id;
  const customerId = invoice.customer || null;

  // Safely extract subscription ID from nested fields
  let subscriptionId = null;
  try {
    subscriptionId =
      invoice.parent?.subscription_details?.subscription ||
      invoice.lines?.data?.[0]?.parent?.subscription_item_details
        ?.subscription ||
      null;
  } catch (err) {
    console.warn("Subscription ID not found.");
  }

  const amountPaid = invoice.amount_paid || 0;
  const currency = invoice.currency || "usd";
  const status = invoice.status || "unknown";
  const createdAt = new Date(invoice.created * 1000); // Convert UNIX timestamp to JS Date

  try {
    const connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
    });

    const query = `
      INSERT INTO stripe_invoices
      (event_id, invoice_id, subscription_id, customer_id, amount_paid, currency, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await connection.execute(query, [
      eventId,
      invoiceId,
      subscriptionId,
      customerId,
      amountPaid,
      currency,
      status,
      createdAt,
    ]);

    await connection.end();

    console.log(`✅ Successfully inserted invoice ${invoiceId}`);
    return { statusCode: 200, body: "Invoice processed successfully" };
  } catch (error) {
    console.error("❌ Error inserting invoice:", error);
    return { statusCode: 500, body: "Database insertion failed" };
  }
};
