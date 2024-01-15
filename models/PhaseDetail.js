const mongoose = require("mongoose");

const projectPhaseDetailSchema = new mongoose.Schema({
  phase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Phase",
    required: true,
  },
  phaseLead: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  phaseStartDate: Date,
  phaseEstimatedEndDate: Date,
  phaseActualEndDate: Date,
  phaseCompletionRate: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("ProjectPhaseDetail", projectPhaseDetailSchema);
