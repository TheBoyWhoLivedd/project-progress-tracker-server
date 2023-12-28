const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: true,
  },
  currentPhase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Phase",
  },
  phasesHistory: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectPhaseDetail",
    },
  ],
  team: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  teamLead: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  projectStatus: {
    type: String,
    enum: ["Active", "Completed", "On Hold"],
    default: "Active",
  },
  startDate: Date,
  estimatedEndDate: Date,
  actualEndDate: Date,
  projectDescription: String,
});

module.exports = mongoose.model("Project", projectSchema);
