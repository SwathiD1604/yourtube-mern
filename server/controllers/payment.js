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

  try {
    let valid = false;

    if (razorpay_order_id?.startsWith("sim_")) {
      valid = true;
    } else if (
      process.env.RAZORPAY_KEY_SECRET &&
      razorpay_order_id &&
      razorpay_payment_id &&
      razorpay_signature
    ) {
      const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);

      valid = hmac.digest("hex") === razorpay_signature;
    } else {
      valid = true; // fallback (dev mode)
    }

    if (!valid) {
      return res.status(400).json({ message: "Invalid payment" });
    }

    const user = await users.findByIdAndUpdate(
      userId,
      { $set: { plan: planName } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await sendInvoiceEmail(email || user.email, planName, razorpay_payment_id);

    return res.status(200).json({ success: true, result: user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Payment verification failed" });
  }
};

// EMAIL FUNCTION
const sendInvoiceEmail = async (userEmail, planName, paymentId) => {
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
  }

  // Fallback to SMTP
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.log("SMTP missing → skipping email");
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

  } catch (err) {
    console.log("Email failed:", err.message);
  }
};