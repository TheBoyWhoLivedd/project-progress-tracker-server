const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
// const cryptoRandomString = require('crypto-random-string');
const Cryptr = require("cryptr");
const { sendEmail } = require("../config/mail");

// @desc Login
// @route POST /auth
// @access Public
const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const foundUser = await User.findOne({ email: username }).exec();
  console.log(foundUser);
  if (!foundUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const match = await bcrypt.compare(password, foundUser.password);

  if (!match) return res.status(401).json({ message: "Unauthorized" });

  const accessToken = jwt.sign(
    {
      UserInfo: {
        userId: foundUser._id,
        userName: foundUser.name,
        isAdmin: foundUser.hasAdminRights,
      },
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { userId: foundUser._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  // Create secure cookie with refresh token
  res.cookie("jwt", refreshToken, {
    httpOnly: true, //accessible only by web server
    secure: true, //https
    sameSite: "None", //cross-site cookie
    maxAge: 7 * 24 * 60 * 60 * 1000, //cookie expiry: set to match rT
  });

  // Send accessToken containing username and roles
  res.json({ accessToken });
};

// @desc Refresh
// @route GET /auth/refresh
// @access Public - because access token has expired
const refresh = (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.jwt) return res.status(401).json({ message: "Unauthorized" });

  const refreshToken = cookies.jwt;

  jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    async (err, decoded) => {
      if (err) return res.status(403).json({ message: "Forbidden" });
      // console.log(decoded.userId);
      const foundUser = await User.findOne({
        _id: decoded.userId,
      }).exec();
      // console.log("foundUser", foundUser);
      if (!foundUser) return res.status(401).json({ message: "Unauthorized" });

      const accessToken = jwt.sign(
        {
          UserInfo: {
            userId: foundUser._id,
            userName: foundUser.name,
            isAdmin: foundUser.hasAdminRights,
          },
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
      );

      res.json({ accessToken });
    }
  );
};

// @desc Forgot Password
// @route POST /auth/forgot-password
// @access Public
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      // Consider if revealing user existence is a security concern for your application
      return res.status(404).json({ message: "No user found with this email" });
    }

    // Generate random string
    const { default: cryptoRandomString } = await import(
      "crypto-random-string"
    );
    const randomStr = cryptoRandomString({ length: 64, type: "alphanumeric" });
    // Encrypt email
    const cryptr = new Cryptr(process.env.SECRET_KEY);
    const encryptedEmail = cryptr.encrypt(email);

    // Here you should save the reset token and encryptedEmail with the user record
    // For demonstration, we're directly using them
    // Ensure your User model supports saving these values as needed
    user.password_reset_token = randomStr;
    await user.save();
    // Save or handle user update logic
    const apiUrl =
      process.env.NODE_ENV === "development"
        ? "http://localhost:5173"
        : process.env.API_URL;

    const resetPasswordUrl = `${apiUrl}/reset-password/${encryptedEmail}?signature=${randomStr}`;

    // Create email content
    const htmlContent = `
    <h2>Hello ${user.name}</h2>
    <p>We received a reset password request for your account. If this was not you, please ignore this email.</p>
    <a href="${resetPasswordUrl}" style="background: #000; color: #fff; padding: 10px; border-radius: 10px; text-decoration: none;">Reset Password</a>
    <hr />
    <h3>Regards,</h3>
    <p>Uganda Revenue Authority</p>
  `;

    await sendEmail(email, "Reset Password", htmlContent);
    res.json({
      message: "Email sent successfully. Please check your email.",
      encryptedEmail,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "There was an error sending the email." });
  }
};

const resetPassword = async (req, res) => {
  const { encryptedEmail, signature, password, password_confirmation } =
    req.body;

  if (password !== password_confirmation) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  const cryptr = new Cryptr(process.env.SECRET_KEY);
  let email;

  try {
    email = cryptr.decrypt(encryptedEmail);
  } catch (error) {
    return res.status(400).json({ message: "Invalid reset link" });
  }

  console.log(email);
  console.log(signature);

  const user = await User.findOne({
    email: email,
    password_reset_token: signature,
  });

  // console.log(user);

  if (!user) {
    return res.status(400).json({
      message:
        "Reset link is not correct or has expired. Please double-check it.",
    });
  }

  try {
    const salt = bcrypt.genSaltSync(10);
    user.password = bcrypt.hashSync(password, salt);
    user.password_reset_token = null; // Clear the reset token
    await user.save();

    res.json({
      message:
        "Password changed successfully. Please login with your new password.",
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "An error occurred while updating the password." });
  }
};

// @desc Logout
// @route POST /auth/logout
// @access Public - just to clear cookie if exists
const logout = (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(204); //No content
  res.clearCookie("jwt", { httpOnly: true, sameSite: "None", secure: true });
  res.json({ message: "Cookie cleared" });
};

module.exports = {
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
};
