import Razorpay from "razorpay";
import crypto from "crypto";
import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
import users from "../Modals/Auth.js";

// Razorpay instance
const getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// CREATE ORDER
export const createOrder = async (req, res) => {
  const { amount, currency } = req.body;

  const razorpay = getRazorpayInstance();

  try {
    if (!razorpay) {
      const fakeOrder = {
        id: "sim_" + crypto.randomBytes(8).toString("hex"),
        amount,
        currency: currency || "INR",
        simulated: true,
      };

      return res.status(200).json(fakeOrder);
    }

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: currency || "INR",
      receipt: "rcpt_" + crypto.randomBytes(8).toString("hex"),
    });

    return res.status(200).json(order);
  } catch (err) {
    console.error("Order error:", err);
    return res.status(500).json({ message: "Order failed" });
  }
};

// VERIFY PAYMENT
export const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userId,
    planName,
    email,
  } = req.body;

  console.log("Payment verification request:", {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature: razorpay_signature ? "present" : "missing",
    userId,
    planName,
    email,
  });

  try {
    let valid = false;

    if (razorpay_order_id?.startsWith("sim_")) {
      console.log("Using simulated payment validation");
      valid = true;
    } else if (
      process.env.RAZORPAY_KEY_SECRET &&
      razorpay_order_id &&
      razorpay_payment_id &&
      razorpay_signature
    ) {
      console.log("Using Razorpay signature validation");
      const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const generatedSignature = hmac.digest("hex");
      console.log("Generated signature:", generatedSignature);
      console.log("Received signature:", razorpay_signature);
      valid = generatedSignature === razorpay_signature;
    } else {
      console.log("RAZORPAY_KEY_SECRET missing or incomplete data, using fallback validation");
      valid = true; // fallback (dev mode)
    }

    if (!valid) {
      console.error("Payment validation failed");
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    console.log("Payment validated, updating user plan");
    const user = await users.findByIdAndUpdate(
      userId,
      { $set: { plan: planName } },
      { new: true }
    );

    if (!user) {
      console.error("User not found:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("User plan updated, sending invoice email");
    await sendInvoiceEmail(email || user.email, planName, razorpay_payment_id);

    console.log("Payment verification successful");
    return res.status(200).json({ success: true, result: user });
  } catch (err) {
    console.error("Payment verification error:", err);
    return res.status(500).json({ message: "Payment verification failed", error: err.message });
  }
};

// EMAIL FUNCTION
const sendInvoiceEmail = async (userEmail, planName, paymentId) => {
  console.log("Attempting to send invoice email to:", userEmail);
  const sendGridApiKey = process.env.SENDGRID_API_KEY;

  // Try SendGrid first
  if (sendGridApiKey) {
    try {
      sgMail.setApiKey(sendGridApiKey);
      await sgMail.send({
        to: userEmail,
        from: "yourtube@example.com",
        subject: "YourTube Invoice - Plan Upgrade Successful",
        html: `
          <h2>🎉 Plan Upgrade Successful!</h2>
          <p><strong>Plan:</strong> ${planName}</p>
          <p><strong>Payment ID:</strong> ${paymentId}</p>
          <p>Thank you for upgrading to YourTube Premium. Your new plan is now active.</p>
          <p>Best regards,<br>YourTube Team</p>
        `,
      });
      console.log("✅ Invoice email sent via SendGrid");
      return;
    } catch (error) {
      console.error("❌ SendGrid failed:", error.message);
    }
  } else {
    console.log("⚠️ SendGrid API key not configured");
  }

  // Fallback to SMTP
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.log("⚠️ SMTP missing → skipping email");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: smtpUser,
      to: userEmail,
      subject: "YourTube Invoice",
      html: `<h2>Plan: ${planName}</h2><p>Payment ID: ${paymentId}</p>`,
    });

    console.log("✅ Invoice email sent via SMTP");
  } catch (err) {
    console.log("❌ Email failed:", err.message);
  }
};