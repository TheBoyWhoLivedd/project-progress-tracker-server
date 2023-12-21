const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    departmentName: {
      type: String,
      required: true,
      unique: true,
    },
    departmentDetails: {
      type: String,
    },
    departmentStatus: {
      type: Boolean,
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Department", departmentSchema);
