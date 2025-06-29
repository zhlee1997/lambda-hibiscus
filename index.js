const mysql = require("mysql2/promise");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

// Validate environment variables
if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  console.error("Missing required database environment variables");
}

const salt = bcrypt.genSaltSync(10); // optionally extract to config
let defaultPasswordHash = bcrypt.hashSync("hibiscus123", salt); // default password hash

exports.handler = async (event) => {
  console.log("DB_HOST:", DB_HOST);
  console.log("DB_USER:", DB_USER);
  console.log("DB_NAME:", DB_NAME);
  console.log("Received Stripe event:", JSON.stringify(event, null, 2));

  const detail = event.detail;

  if (detail.type === "checkout.session.completed") {
    const invoice = detail.data.object;

    // Extract essential fields
    const stripeInvoiceId = invoice.id;
    const stripeCustomerId = invoice.customer;
    const stripeCustomerEmail = invoice.customer_details.email || null;
    const stripeCustomerName = invoice.customer_details.name || null;
    const stripePaymentIntentId = invoice.payment_intent;
    const amount = invoice.amount_total / 100; // Stripe uses cents
    const currency = invoice.currency || "usd";
    const status = invoice.status === "complete" ? "succeeded" : invoice.status;
    // TODO: const receiptUrl = invoice.hosted_invoice_url || null;
    const receiptUrl = null;
    // TODO: const invoicePdfUrl = invoice.invoice_pdf || null;
    const invoicePdfUrl = null;
    const stripeCreatedAt = new Date(invoice.created * 1000);

    // Safely extract subscription ID from nested fields
    let subscriptionId = null;
    try {
      // subscriptionId =
      //   invoice.parent?.subscription_details?.subscription ||
      //   invoice.lines?.data?.[0]?.parent?.subscription_item_details
      //     ?.subscription ||
      //   null;
      subscriptionId = invoice.subscription;
    } catch (err) {
      console.warn("Subscription ID not found.");
    }

    if (
      !stripeCustomerId ||
      !subscriptionId ||
      !stripeInvoiceId ||
      !stripeCustomerEmail
    ) {
      console.error("❌ Missing required Stripe fields");
      return { statusCode: 400, body: "Missing required Stripe fields" };
    }

    try {
      const connection = await mysql.createConnection({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
      });

      // Step 1: Get internal user_id (BIGINT) by email
      const [rows] = await connection.execute(
        `SELECT id FROM users WHERE email = ?`,
        [stripeCustomerEmail]
      );

      let internalUserId;

      if (rows.length === 0) {
        // TODO: User not found, then create a new user in the users table
        // TODO: Then get the internal user_id, insert the transaction, and return success
        console.log(`User not found for email ${stripeCustomerEmail}`);

        // TODO: Adjust the SQL query to match
        const insertUserQuery = `
    INSERT INTO users (
      user_id,
      first_name,
      last_name,
      email,
      username,
      password,
      member_status,
      stripe_customer_id,
      stripe_subscription_id,
      last_login_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
        const [result] = await connection.execute(insertUserQuery, [
          uuidv4(), // Generate a unique user_id
          stripeCustomerName, // first_name
          stripeCustomerName, // TODO: last_name (assuming same as first name)
          stripeCustomerEmail,
          stripeCustomerEmail, // TODO: username (assuming same as email)
          defaultPasswordHash, // set a default password hash (hibiscus123)
          "active",
          stripeCustomerId,
          subscriptionId,
          new Date(),
        ]);

        internalUserId = result.insertId; // Get the auto-incremented user ID
        console.log(`✅ Created new user with id ${internalUserId}`);
      } else {
        // Use the existing user's internal user_id
        // And set the internalUserId to the existing user's id
        internalUserId = rows[0].id;

        // Existing user found, get their internal user_id
        // And update the stripe_customer_id and stripe_subscription_id
        console.log(`User found for email ${stripeCustomerEmail}`);
        const updateUserQuery = `
          UPDATE users
          SET stripe_customer_id = ?, stripe_subscription_id = ?
          WHERE id = ?
        `;

        await connection.execute(updateUserQuery, [
          stripeCustomerId,
          subscriptionId,
          internalUserId, // Use the existing user's internal user_id
        ]);
        console.log(`✅ Updated existing user with id ${internalUserId}`);
      }

      // Step 2: Insert transaction
      const insertQuery = `
      INSERT INTO transactions (
        user_id,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_invoice_id,
        stripe_payment_intent_id,
        amount,
        currency,
        status,
        receipt_url,
        invoice_pdf_url,
        stripe_created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      await connection.execute(insertQuery, [
        internalUserId,
        stripeCustomerId,
        subscriptionId,
        stripeInvoiceId,
        stripePaymentIntentId,
        amount,
        currency,
        status,
        receiptUrl,
        invoicePdfUrl,
        stripeCreatedAt,
      ]);

      await connection.end();

      console.log(`✅ Inserted transaction for invoice ${stripeInvoiceId}`);
      return { statusCode: 200, body: "Transaction inserted successfully" };
    } catch (error) {
      console.error("❌ Error inserting invoice:", error);
      return { statusCode: 500, body: "Database insertion failed" };
    }
  } else if (detail.type === "charge.succeeded") {
    // Handle charge.succeeded event if needed
    const charge = detail.data.object;

    const stripeChargeId = charge.id;
    const stripeCustomerId = charge.customer;
    const stripePaymentIntentId = charge.payment_intent;
    const receiptUrl = charge.receipt_url || null;
    const amount = charge.amount / 100; // Stripe uses cents
    const currency = charge.currency || "usd";
    const cardBrand = charge.payment_method_details?.card?.brand || null;
    const cardType = charge.payment_method_details?.type || null;
    const cardLast4 = charge.payment_method_details?.card?.last4 || null;
    const cardExpMonth = charge.payment_method_details?.card?.exp_month || null;
    const cardExpYear = charge.payment_method_details?.card?.exp_year || null;
    const status = charge.status || "succeeded"; // Default to succeeded if not provided
    const stripeCreatedAt = new Date(charge.created * 1000);

    // If it's a charge.succeeded event and description is Subscription update
    // then we execcute the insert transaction query
    if (
      charge.description &&
      charge.description.includes("Subscription update")
    ) {
      // TODO: Extract subscription ID and invoice ID
      // let subscriptionId = null;
      let subscriptionId = "subscriptionId";
      // let stripeInvoiceId = null;
      let stripeInvoiceId = "stripeInvoiceId";
      let invoicePdfUrl = null;

      let internalUserId;
      const stripeCustomerEmail = charge.billing_details?.email || null;

      const connection = await mysql.createConnection({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
      });

      // Get internal user_id (BIGINT) by email
      const [rows] = await connection.execute(
        `SELECT id FROM users WHERE email = ?`,
        [stripeCustomerEmail]
      );

      // Existing user found, get their internal user_id
      internalUserId = rows[0].id;

      const insertQuery = `
      INSERT INTO transactions (
        user_id,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_invoice_id,
        stripe_payment_intent_id,
        amount,
        currency,
        status,
        receipt_url,
        invoice_pdf_url,
        stripe_created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      await connection.execute(insertQuery, [
        internalUserId,
        stripeCustomerId,
        subscriptionId,
        stripeInvoiceId,
        stripePaymentIntentId,
        amount,
        currency,
        status,
        receiptUrl,
        invoicePdfUrl,
        stripeCreatedAt,
      ]);

      await connection.end();

      console.log(
        "Charge succeeded for subscription update, proceeding to charge receipt insertion."
      );
    }

    const insertQuery = `
      INSERT INTO charge_receipts (
        stripe_charge_id,
        stripe_customer_id,
        stripe_payment_intent_id,
        receipt_url,
        amount,
        currency,
        card_brand,
        card_last4,
        card_exp_month,
        card_exp_year,
        charge_status,
        stripe_created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const connection = await mysql.createConnection({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
      });

      await connection.execute(insertQuery, [
        stripeChargeId,
        stripeCustomerId,
        stripePaymentIntentId,
        receiptUrl,
        amount,
        currency,
        !cardBrand ? cardType : cardBrand, // Use cardType if cardBrand is not available
        cardLast4,
        cardExpMonth,
        cardExpYear,
        status,
        stripeCreatedAt,
      ]);

      await connection.end();

      console.log(`✅ Inserted charge receipt for charge ${stripeChargeId}`);
      return { statusCode: 200, body: "Charge receipt inserted successfully" };
    } catch (error) {
      console.error("❌ Error inserting charge receipt:", error);
      return { statusCode: 500, body: "Database insertion failed" };
    }
  }
  console.warn(`⚠️ Unsupported event type: ${detail.type}. No action taken.`);
};
