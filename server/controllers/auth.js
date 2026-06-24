import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";

// ===============================
// REGION DETECTION (SAFE)
// ===============================
const getRegionFromRequest = async (req) => {
  try {
    if (req.body?.location) return req.body.location;

    let ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.ip ||
      req.connection?.remoteAddress;

    if (!ip) return null;

    if (ip.startsWith("::ffff:")) ip = ip.split(":").pop();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await res.json();
    return data?.region || null;
  } catch (error) {
    console.warn("Region lookup failed:", error.message);
    return null;
  }
};

// ===============================
// OTP STORE
// ===============================
const otpStore = {};

// ===============================
// EMAIL SENDER SAFE
// ===============================
const sendOtpEmail = async (email, otp) => {
  const sendGridApiKey = process.env.SENDGRID_API_KEY;

  console.log("Email Configuration Check:");
  console.log("- SendGrid API Key:", sendGridApiKey ? "✓ Configured" : "✗ Missing");

  // Try SendGrid first (recommended for production)
  if (sendGridApiKey) {
    try {
      sgMail.setApiKey(sendGridApiKey);
      await sgMail.send({
        to: email,
        from: "yourtube@example.com",
        subject: "YourTube OTP Verification",
        html: `<h2>Your OTP is: ${otp}</h2><p>This code will expire in 5 minutes.</p>`,
      });
      console.log("✅ OTP sent via SendGrid to:", email);
      return;
    } catch (error) {
      console.error("❌ SendGrid failed:", error.message);
    }
  }

  // Fallback to SMTP
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT || 587);

  console.log("SMTP Configuration Check:");
  console.log("- SMTP_USER:", smtpUser ? "✓ Configured" : "✗ Missing");
  console.log("- SMTP_PASS:", smtpPass ? "✓ Configured" : "✗ Missing");
  console.log("- SMTP_HOST:", smtpHost);
  console.log("- SMTP_PORT:", smtpPort);

  if (!smtpUser || !smtpPass) {
    console.log("⚠️ No email service configured - OTP will be logged only");
    console.log("EMAIL:", email);
    console.log("OTP:", otp);
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
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.sendMail({
      from: `"YourTube" <${smtpUser}>`,
      to: email,
      subject: "YourTube OTP Verification",
      html: `<h2>Your OTP is: ${otp}</h2>`,
    });

    console.log("✅ OTP sent via SMTP to:", email);
  } catch (error) {
    console.error("❌ SMTP failed:", error.message);
    console.error("Full error:", error);
  }
};

// ===============================
// SEND OTP
// ===============================
export const sendotp = async (req, res) => {
  const { email, mobile } = req.body;

  if (!email && !mobile) {
    return res.status(400).json({ message: "Email or mobile required" });
  }

  let location = req.body.location;
  if (!location) location = await getRegionFromRequest(req);

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;

  const key = (email || mobile).toLowerCase().trim();
  otpStore[key] = { otp, expiresAt };

  // Send email asynchronously (fire and forget) to avoid timeout
  if (email) {
    sendOtpEmail(email, otp).catch(err => console.error("Async email error:", err));
  } else {
    console.log("OTP (mobile):", mobile, otp);
  }

  // Return immediately with OTP in response
  return res.status(200).json({
    success: true,
    method: email ? "email" : "sms",
    target: email || mobile,
    otp, // OTP returned in response for development
  });
};

// ===============================
// VERIFY OTP
// ===============================
export const verifyotp = async (req, res) => {
  const { email, mobile, otp } = req.body;

  const key = (email || mobile)?.toLowerCase().trim();

  if (!key) {
    return res.status(400).json({ message: "Missing email/mobile" });
  }

  const record = otpStore[key];

  if (!record) {
    return res.status(400).json({ message: "OTP not found" });
  }

  if (Date.now() > record.expiresAt) {
    delete otpStore[key];
    return res.status(400).json({ message: "OTP expired" });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  delete otpStore[key];

  try {
    const userEmail = email || `${mobile}@yourtube.com`;

    let user = await users.findOne({ email: userEmail });

    if (!user) {
      user = await users.create({
        email: userEmail,
        name: mobile ? `User ${mobile.slice(-4)}` : "User",
        image: "https://github.com/shadcn.png",
        mobile: mobile || "",
      });

      return res.status(201).json({ result: user });
    }

    return res.status(200).json({ result: user });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({ message: "Auth failed" });
  }
};

// ===============================
// LOGIN
// ===============================
export const login = async (req, res) => {
  const { email, name, image } = req.body;

  try {
    let user = await users.findOne({ email });

    if (!user) {
      user = await users.create({ email, name, image });
    }

    return res.status(200).json({ result: user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Login failed" });
  }
};

// ===============================
// UPDATE PROFILE
// ===============================
export const updateprofile = async (req, res) => {
  const { id } = req.params;
  const { channelname, description } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid user" });
  }

  try {
    const updated = await users.findByIdAndUpdate(
      id,
      { $set: { channelname, description } },
      { new: true }
    );

    return res.status(200).json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Update failed" });
  }
};