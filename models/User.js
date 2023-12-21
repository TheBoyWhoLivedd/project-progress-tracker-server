const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: (prop) => `Invalid Email Address: ${prop.value}`,
      },
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    password_reset_token: {
      required: false,
      type: mongoose.Schema.Types.String,
      trim: true,
    },
    magic_link_token: {
      required: false,
      type: mongoose.Schema.Types.String,
      trim: true,
    },
    magic_link_sent_at: {
      required: false,
      type: mongoose.Schema.Types.Date,
    },
    hasAdminRights: {
      type: Boolean,
      default: false,
    },
  },

  { versionKey: false, timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
