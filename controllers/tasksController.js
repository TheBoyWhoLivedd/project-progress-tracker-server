const Project = require("../models/Project");
const Task = require("../models/Task");
const PhaseDetail = require("../models/PhaseDetail");
const { default: mongoose } = require("mongoose");
const Phase = require("../models/Phase");

async function calculatePhaseCompletionRate(phaseId) {
  // Fetch all tasks associated with the phase
  const tasks = await Task.find({ associatedPhase: phaseId }).lean();
  // console.log("tasks", tasks);
  // Sum weights of completed tasks and total weights
  let completedWeight = 0,
    totalWeight = 0;
  tasks.forEach((task) => {
    totalWeight += task.taskWeight;
    if (task.status === "Done") {
      completedWeight += task.taskWeight;
    }
  });

  console.log("totalWeight", totalWeight);
  console.log("completedWeight", completedWeight);

  // Calculate completion rate (ensure no division by zero)
  return totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;
}

async function updatePhaseCompletionInProject(projectId, phaseId) {
  // console.log("phaseId", phaseId);
  // console.log("projectId", projectId);
  const completionRate = await calculatePhaseCompletionRate(phaseId);
  // console.log("completion Rate", completionRate);

  const updatedPhaseDetail = await PhaseDetail.updateMany(
    { phase: phaseId },
    { $set: { phaseCompletionRate: completionRate } },
    { new: true }
  );

  if (!updatedPhaseDetail) {
    throw new Error("PhaseDetail not found for the given phaseId");
  }
}

async function updateProjectCompletionRate(projectId) {
  const project = await Project.findById(projectId).populate("phasesHistory");

  const phases = await Phase.find().lean();
  const phasesCount = phases.length || 0;

  if (phasesCount === 0) return;

  let totalCompletion = 0;
  const encounteredPhases = new Set();

  for (const phaseDetail of project.phasesHistory) {
    if (!encounteredPhases.has(phaseDetail.phase.toString())) {
      totalCompletion += phaseDetail.phaseCompletionRate;
      encounteredPhases.add(phaseDetail.phase.toString());
    }
  }

  const projectCompletionRate = totalCompletion / phasesCount;
  await Project.findByIdAndUpdate(projectId, { projectCompletionRate });
}

// @desc Get all tasks
// @route GET /tasks
// @access Private
const getAllTasks = async (req, res) => {
  // Get all tasks from MongoDB
  const tasks = await Task.find().lean();

  // If no tasks
  if (!tasks?.length) {
    return res.status(400).json({ message: "No tasks found" });
  }

  res.json(tasks);
};

// @desc Get tasks by project ID
// @route GET /tasks/project/:projectId
// @access Private
const getTasksByProjectId = async (req, res) => {
  const { projectId } = req.params;

  // Check if the project exists
  const projectExists = await Project.findById(projectId);
  if (!projectExists) {
    return res.status(404).json({ message: "Project not found" });
  }

  // Get tasks associated with the project
  const tasks = await Task.find({ associatedProject: projectId }).lean();

  // If no tasks are found for the project
  if (!tasks.length) {
    // return res.status(404).json({ message: "No tasks found for this project" });
    return res.json([]);
  }

  res.json(tasks);
};

// @desc Create new task
// @route POST /tasks
// @access Private

const createNewTask = async (req, res) => {
  const {
    taskName,
    taskDescription,
    associatedPhase,
    assignedTo,
    taskWeight,
    status,
    attachments,
    startDate,
    dueDate,
  } = req.body;
  const projectId = req.params.projectId;
  console.log("projectId", projectId); // assuming the param name is projectId

  // Validate that the dueDate is not before startDate
  if (new Date(startDate) > new Date(dueDate)) {
    return res
      .status(400)
      .json({ message: "Due date cannot be before the start date" });
  }

  // Check if there's a project with the provided projectId
  const projectExists = await Project.findById(projectId);
  if (!projectExists) {
    return res.status(404).json({ message: "Project not found" });
  }

  // Create and store the new task
  const createdTask = await Task.create({
    taskName,
    taskDescription,
    associatedProject: projectId,
    associatedPhase,
    assignedTo,
    taskWeight,
    status,
    attachments,
    startDate,
    dueDate,
  });

  await updatePhaseCompletionInProject(projectId, associatedPhase);
  await updateProjectCompletionRate(projectId);

  // Assuming you want to return the created task as well
  return res
    .status(201)
    .json({ message: "New task created", task: createdTask });
};

/**
 * Updates a task in the database.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @return {Object} The updated task.
 */
// @desc Update a task
// @route PUT /tasks/:id
// @access Private

const updateTask = async (req, res) => {
  const {
    taskName,
    taskDescription,
    associatedPhase,
    assignedTo,
    taskWeight,
    status,
    attachments,
    startDate,
    dueDate,
  } = req.body;

  const taskId = req.params.taskId;

  // Validate that the dueDate is not before startDate
  if (new Date(startDate) > new Date(dueDate)) {
    return res
      .status(400)
      .json({ message: "Due date cannot be before the start date" });
  }

  // Check if the task exists
  const task = await Task.findById(taskId);
  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  // Process new and existing attachments
  // Assuming attachments have a structure { _id, name, url }
  // and new attachments don't have an _id yet

  // Splitting attachments into new and existing
  const newAttachments = attachments.filter((att) => !att._id);
  const existingAttachmentIds = new Set(
    attachments.filter((att) => att._id).map((att) => att._id)
  );

  // Removing attachments that are no longer present
  task.attachments = task.attachments.filter((att) =>
    existingAttachmentIds.has(att._id)
  );

  // Adding new attachments
  task.attachments.push(...newAttachments);

  // Update the task with the new details
  task.taskName = taskName;
  task.taskDescription = taskDescription;
  task.associatedPhase = associatedPhase;
  task.assignedTo = assignedTo;
  task.taskWeight = taskWeight;
  task.status = status;
  task.startDate = startDate;
  task.dueDate = dueDate;

  // Save the updated task
  const updatedTask = await task.save();

  await updatePhaseCompletionInProject(
    task.associatedProject,
    new mongoose.Types.ObjectId(associatedPhase)
  );

  await updateProjectCompletionRate(task.associatedProject);

  // Return the updated task
  return res.json({
    message: `Task '${updatedTask.taskName}' updated`,
    task: updatedTask,
  });
};

// Delete a task
const deleteTask = async (req, res) => {
  const { taskId } = req.params;

  const deletedTask = await Task.findByIdAndDelete(taskId);

  if (!deletedTask) {
    return res.status(404).json({ message: "Task not found" });
  }

  await updatePhaseCompletionInProject(
    deletedTask.associatedProject,
    new mongoose.Types.ObjectId(associatedPhase)
  );

  await updateProjectCompletionRate(deletedTask.associatedProject);

  res.json({
    message: `Task '${deletedTask.taskName}' with ID ${deletedTask._id} deleted`,
  });
};

module.exports = {
  getAllTasks,
  getTasksByProjectId,
  createNewTask,
  updateTask,
  deleteTask,
};
