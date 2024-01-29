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
    ref: "Phase",
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  taskWeight: Number,
  status: {
    type: String,
    enum: ["Backlog", "To Do", "In Progress", "Done", "Cancelled"],
    default: "To Do",
  },
  workDone: {
    type: String,
    default: "",
  },
  remarks: [
    {
      text: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  attachments: [
    {
      name: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },
  ],
  startDate: Date,
  dueDate: Date,
  completionDate: Date,
});

module.exports = mongoose.model("Task", taskSchema);
