const mongoose = require("mongoose");

const projectPhaseDetailSchema = new mongoose.Schema({
  phase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Phase",
    required: true,
  },
  phaseStartDate: Date,
  phaseEstimatedEndDate: Date,
  phaseActualEndDate: Date,
  phaseLead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  phaseCompletionRate: Number,
});

module.exports = mongoose.model("ProjectPhaseDetail", projectPhaseDetailSchema);
