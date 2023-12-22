const mongoose = require("mongoose");

const phaseSchema = new mongoose.Schema({
  phaseName: {
    type: String,
    required: true,
    unique: true,
  },
  phaseDescription: String,
  phaseOrder: Number,
});

module.exports = mongoose.model("Phase", phaseSchema);
