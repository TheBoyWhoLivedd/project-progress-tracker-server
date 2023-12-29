const Project = require("../models/Project");
const Task = require("../models/Task");

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
