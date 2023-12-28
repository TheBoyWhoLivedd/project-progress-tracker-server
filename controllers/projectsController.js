const PhaseDetail = require("../models/PhaseDetail");
const Project = require("../models/Project");

// @desc Get all projects
// @route GET /projects
// @access Private
const getAllProjects = async (req, res) => {
  // Get all projects from MongoDB
  const projects = await Project.find().lean();

  // If no projects
  if (!projects?.length) {
    return res.status(400).json({ message: "No projects found" });
  }

  res.json(projects);
};

// @desc Create new project
// @route POST /projects
// @access Private

const createNewProject = async (req, res) => {
  const {
    projectName,
    projectDescription,
    currentPhase,
    phaseStartDate,
    phaseEstimatedEndDate,
    team,
    teamLead,
    projectStatus,
    startDate,
    estimatedEndDate,
    actualEndDate,
  } = req.body;

  // Validate dates
  if (new Date(phaseEstimatedEndDate) < new Date(phaseStartDate)) {
    return res.status(400).json({
      message: "Phase estimated end date can't be before the phase start date.",
    });
  }

  if (new Date(estimatedEndDate) < new Date(startDate)) {
    return res.status(400).json({
      message:
        "Project estimated end date can't be before the project start date.",
    });
  }

  if (actualEndDate && new Date(actualEndDate) < new Date(startDate)) {
    return res.status(400).json({
      message:
        "Project actual end date can't be before the project start date.",
    });
  }

  // First, create a ProjectPhaseDetail document
  const newPhaseDetail = await PhaseDetail.create({
    phase: currentPhase,
    phaseStartDate,
    phaseEstimatedEndDate,
  });

  // Now, create the Project with the phase history
  const createdProject = await Project.create({
    projectName,
    projectDescription,
    currentPhase,
    team,
    teamLead,
    projectStatus,
    startDate,
    estimatedEndDate,
    actualEndDate,
    phasesHistory: [newPhaseDetail._id],
  });

  if (createdProject) {
    return res
      .status(201)
      .json({ message: "New project created", project: createdProject });
  } else {
    return res.status(400).json({ message: "Invalid project data received" });
  }
};

/**
 * Updates a project in the database.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @return {Object} The updated project.
 */
const updateProject = async (req, res) => {
  const { id } = req.params;
  const {
    projectName,
    projectDescription,
    currentPhase,
    team,
    teamLead,
    projectStatus,
    startDate,
    estimatedEndDate,
    actualEndDate,
  } = req.body;

  // Check for required fields
  if (
    !projectName ||
    !projectDescription ||
    !currentPhase ||
    !startDate ||
    !estimatedEndDate
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Check for date validity
  if (new Date(estimatedEndDate) < new Date(startDate)) {
    return res.status(400).json({
      message:
        "Project estimated end date can't be before the project start date.",
    });
  }

  if (actualEndDate && new Date(actualEndDate) < new Date(startDate)) {
    return res.status(400).json({
      message:
        "Project actual end date can't be before the project start date.",
    });
  }

  // Check for duplicate project name
  const duplicate = await Project.findOne({
    projectName,
    _id: { $ne: id },
  });

  if (duplicate) {
    return res.status(409).json({ message: "Duplicate project name" });
  }

  // Update the project
  const updatedProject = await Project.findByIdAndUpdate(
    id,
    {
      projectName,
      projectDescription,
      currentPhase,
      team,
      teamLead,
      projectStatus,
      startDate,
      estimatedEndDate,
      actualEndDate,
    },
    { new: true }
  );

  if (!updatedProject) {
    return res.status(404).json({ message: "Project not found" });
  }

  res.json({
    message: `Project '${updatedProject.projectName}' updated successfully`,
    project: updatedProject,
  });
};

// Delete a project
const deleteProject = async (req, res) => {
  const { id } = req.params;

  const deletedProject = await Project.findByIdAndDelete(id);

  if (!deletedProject) {
    return res.status(404).json({ message: "Project not found" });
  }

  res.json({
    message: `Project '${deletedProject.projectName}' with ID ${deletedProject._id} successfully deleted`,
  });
};

module.exports = {
  getAllProjects,
  createNewProject,
  updateProject,
  deleteProject,
};
