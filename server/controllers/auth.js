import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import nodemailer from "nodemailer";


const getRegionFromRequest = async (req) => {
  try {
    // Prefer explicit location in body if provided
    if (req.body && req.body.location) return req.body.location;

    let ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip || req.connection?.remoteAddress;
    if (!ip) return null;
    // Normalize IPv4 mapped addresses
    if (ip.startsWith("::ffff:")) ip = ip.split(":").pop();

    // Use ipapi.co to lookup region for the remote IP
    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await res.json();
    if (data && data.region) return data.region;
    return null;
  } catch (error) {
    console.warn("Region lookup failed:", error?.message || error);
    return null;
  }
};

// In-memory OTP storage
const otpStore = {};

const sendOtpEmail = async (email, otp) => {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #d32f2f; text-align: center; border-bottom: 2px solid #d32f2f; padding-bottom: 10px;">YourTube Secure Verification</h2>
      <p>Dear User,</p>
      <p>Your one-time verification code (OTP) for logging into YourTube is:</p>
      <div style="font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; letter-spacing: 4px; color: #d32f2f;">
        ${otp}
      </div>
      <p>This code is valid for 5 minutes. Do not share this OTP with anyone.</p>
      <p style="font-size: 12px; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; margin-top: 20px;">
        YourTube Security Team.
      </p>
    </div>
  `;

  if (!smtpUser || !smtpPass) {
    console.log("-----------------------------------------");
    console.log("[OTP EMAIL SIMULATION] SMTP Credentials missing. OTP Details:");
    console.log(`To: ${email}`);
    console.log(`OTP: ${otp}`);
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
      from: `"YourTube Security" <${smtpUser}>`,
      to: email,
      subject: `YourTube Login OTP: ${otp}`,
      html: htmlContent,
    });
    console.log(`OTP email sent successfully to ${email}`);
  } catch (error) {
    console.error("Failed to send OTP email:", error);
  }
};

export const sendotp = async (req, res) => {
  const { email, mobile } = req.body;
  let location = req.body.location;
  if (!location) {
    location = await getRegionFromRequest(req);
  }

  if (!email && !mobile) {
    return res.status(400).json({ message: "Email or mobile number is required" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins expiration

  const southIndianStates = ["tamil nadu", "kerala", "karnataka", "andhra pradesh", "telangana"];
  const isSouthIndia = !!(location && southIndianStates.includes(location.toLowerCase().trim()));

  try {
    if (isSouthIndia) {
      if (!email) {
        return res.status(400).json({ message: "Email is required for South India login verification" });
      }
      otpStore[email.toLowerCase().trim()] = { otp, expiresAt };
      await sendOtpEmail(email, otp);
      return res.status(200).json({
        success: true,
        method: "email",
        target: email,
        devOtp: !process.env.SMTP_USER ? otp : undefined,
      });
    } else {
      if (!mobile) {
        return res.status(400).json({ message: "Mobile number is required for verification" });
      }
      otpStore[mobile.trim()] = { otp, expiresAt };
      console.log("-----------------------------------------");
      console.log(`[OTP SMS SIMULATION] Sent OTP to Mobile: ${mobile}`);
      console.log(`OTP: ${otp}`);
      console.log("-----------------------------------------");
      return res.status(200).json({
        success: true,
        method: "sms",
        target: mobile,
        devOtp: otp,
      });
    }
  } catch (error) {
    console.error("Send OTP error:", error);
    return res.status(500).json({ message: "Failed to generate OTP" });
  }
};

export const verifyotp = async (req, res) => {
  const { email, mobile, otp, location, name, image } = req.body;

  const southIndianStates = ["tamil nadu", "kerala", "karnataka", "andhra pradesh", "telangana"];
  const isSouthIndia = location && southIndianStates.includes(location.toLowerCase());
  const key = isSouthIndia ? (email ? email.toLowerCase() : "") : mobile;

  if (!key) {
    return res.status(400).json({ message: "Verification key is missing" });
  }

  const record = otpStore[key];
  if (!record) {
    return res.status(400).json({ message: "No OTP sent for this contact info" });
  }

  if (Date.now() > record.expiresAt) {
    delete otpStore[key];
    return res.status(400).json({ message: "OTP has expired. Please request a new one." });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP. Please try again." });
  }

  // Clear OTP on success
  delete otpStore[key];

  try {
    // Find or create user
    const userEmail = email || `${mobile}@yourtube.com`; // fallback email for mobile-only login
    let user = await users.findOne({ email: userEmail });

    if (!user) {
      user = await users.create({ 
        email: userEmail, 
        name: name || (mobile ? `User ${mobile.slice(-4)}` : "User"),
        image: image || "https://github.com/shadcn.png",
        mobile: mobile || "",
      });
      return res.status(201).json({ result: user });
    } else {
      if (mobile && !user.mobile) {
        user.mobile = mobile;
        await user.save();
      }
      return res.status(200).json({ result: user });
    }
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({ message: "Authentication failed during OTP verification" });
  }
};

export const login = async (req, res) => {
  const { email, name, image } = req.body;

  try {
    const existingUser = await users.findOne({ email });

    if (!existingUser) {
      const newUser = await users.create({ email, name, image });
      return res.status(201).json({ result: newUser });
    } else {
      return res.status(200).json({ result: existingUser });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          channelname: channelname,
          description: description,
        },
      },
      { new: true }
    );
    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
