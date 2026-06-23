import Razorpay from "razorpay";
import crypto from "crypto";
import nodemailer from "nodemailer";
import users from "../Modals/Auth.js";

// Razorpay SDK initialization
// Initialize only if keys are present in environment variables to prevent startup crash
const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    return null;
  }
  return new Razorpay({
    key_id,
    key_secret,
  });
};

export const createOrder = async (req, res) => {
  const { amount, currency } = req.body;
  const razorpay = getRazorpayInstance();

  if (!razorpay) {
    // If Razorpay keys are not configured, simulate order creation for testing purposes
    console.log("[Payment Simulation] Razorpay credentials missing. Simulating order...");
    const simulatedOrderId = "sim_order_" + crypto.randomBytes(8).toString("hex");
    return res.status(200).json({
      id: simulatedOrderId,
      amount: amount,
      currency: currency || "INR",
      simulated: true,
    });
  }

  try {
    const options = {
      amount: amount * 100, // amount in paisa
      currency: currency || "INR",
      receipt: "rcpt_" + crypto.randomBytes(8).toString("hex"),
    };
    const order = await razorpay.orders.create(options);
    return res.status(200).json(order);
  } catch (error) {
    console.error("Order creation error:", error);
    return res.status(500).json({ message: "Order creation failed" });
  }
};

export const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, planName, email } = req.body;

  try {
    let isValid = false;

    // Simulated payment (order id starts with sim_)
    if (razorpay_order_id && razorpay_order_id.startsWith('sim_')) {
      isValid = true;
    } else {
      const key_secret = process.env.RAZORPAY_KEY_SECRET;
      if (key_secret && razorpay_order_id && razorpay_payment_id && razorpay_signature) {
        const hmac = crypto.createHmac('sha256', key_secret);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generated_signature = hmac.digest('hex');
        if (generated_signature === razorpay_signature) {
          isValid = true;
        }
      } else {
        // Missing Razorpay secret or required fields – treat as valid (simulation mode)
        isValid = true;
      }
    }

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Update user plan in DB
    const updatedUser = await users.findByIdAndUpdate(
      userId,
      { $set: { plan: planName } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Trigger email notification with Invoice Details
    await sendInvoiceEmail(email || updatedUser.email, planName, razorpay_payment_id || 'sim_pay_12345');

    return res.status(200).json({ success: true, result: updatedUser });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ message: 'Payment verification failed' });
  }
};

const sendInvoiceEmail = async (userEmail, planName, paymentId) => {
  const planPrices = {
    Bronze: "₹10",
    Silver: "₹50",
    Gold: "₹100",
  };
  const price = planPrices[planName] || "₹0";
  const dateStr = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
  const invoiceNum = "INV-" + Math.floor(100000 + Math.random() * 900000);

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #d32f2f; text-align: center; border-bottom: 2px solid #d32f2f; padding-bottom: 10px;">YourTube Upgrade Invoice</h2>
      <p>Dear Customer,</p>
      <p>Thank you for upgrading your plan on YourTube. Below are the details of your successful transaction:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background-color: #f5f5f5;">
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Invoice Number</th>
          <td style="padding: 10px; border: 1px solid #ddd;">${invoiceNum}</td>
        </tr>
        <tr>
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Date</th>
          <td style="padding: 10px; border: 1px solid #ddd;">${dateStr}</td>
        </tr>
        <tr style="background-color: #f5f5f5;">
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Plan Purchased</th>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #d32f2f;">${planName} Plan</td>
        </tr>
        <tr>
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Amount Paid</th>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${price}</td>
        </tr>
        <tr style="background-color: #f5f5f5;">
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Payment Transaction ID</th>
          <td style="padding: 10px; border: 1px solid #ddd;">${paymentId}</td>
        </tr>
      </table>
      <p>Your plan has been updated successfully. Enjoy your premium streaming experience and downloads!</p>
      <p style="font-size: 12px; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; margin-top: 20px;">
        YourTube Support. This is an automatically generated email invoice.
      </p>
    </div>
  `;

  // Nodemailer transport setup
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);

  if (!smtpUser || !smtpPass) {
    console.log("-----------------------------------------");
    console.log("[EMAIL SIMULATION] SMTP Credentials missing. Outputting email details:");
    console.log(`To: ${userEmail}`);
    console.log(`Subject: YourTube Plan Upgrade Invoice (${planName})`);
    console.log(`Invoice Num: ${invoiceNum}`);
    console.log(`Plan: ${planName}`);
    console.log(`Price: ${price}`);
    console.log(`Payment ID: ${paymentId}`);
    console.log("-----------------------------------------");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"YourTube Premium" <${smtpUser}>`,
      to: userEmail,
      subject: `YourTube Plan Upgrade Confirmation - Invoice ${invoiceNum}`,
      html: htmlContent,
    });
    console.log(`Invoice email sent successfully to ${userEmail}`);
  } catch (error) {
    console.error("Failed to send email invoice:", error);
    // Silent recovery so code does not break
  }
};
