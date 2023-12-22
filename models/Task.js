const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  taskName: {
    type: String,
    required: true,
  },
  taskDescription: String,
  associatedProject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
  },
  associatedPhase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProjectPhaseDetail",
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  taskWeight: Number,
  status: {
    type: String,
    enum: ["Pending", "In Progress", "Completed"],
    default: "Pending",
  },
  workDone: {
    type: String, // Rich text format content
    default: "",
  },
  attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
  startDate: Date,
  dueDate: Date,
  completionDate: Date,
});

module.exports = mongoose.model("Task", taskSchema);
