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
  phaseCompletionRate: Number,
});

module.exports = mongoose.model("ProjectPhaseDetail", projectPhaseDetailSchema);
