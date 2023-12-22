const Phase = require("../models/Phase");

// @desc Get all phases
// @route GET /phases
// @access Private
const getAllPhases = async (req, res) => {
  // Get all phases from MongoDB
  const phases = await Phase.find().lean();

  // If no phases
  if (!phases?.length) {
    return res.status(400).json({ message: "No phases found" });
  }

  res.json(phases);
};

// @desc Create new phase
// @route POST /phases
// @access Private

const createNewPhase = async (req, res) => {
  const { phaseName, phaseDescription } = req.body;

  // Create and store the new phase
  const createdPhase = await Phase.create({
    phaseName,
    phaseDescription,
  });

  if (createdPhase) {
    return res.status(201).json({ message: "New phase created" });
  } else {
    return res.status(400).json({ message: "Invalid phase data received" });
  }
};

/**
 * Updates a phase in the database.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @return {Object} The updated phase.
 */
const updatePhase = async (req, res) => {
  const { id } = req.params;
  const { phaseName, phaseDescription } = req.body;

  if (!phaseName) {
    return res.status(400).json({ message: "Phase name is required" });
  }

  const duplicate = await Phase.findOne({
    phaseName,
    _id: { $ne: id },
  })
    .collation({ locale: "en", strength: 2 })
    .lean();

  if (duplicate) {
    return res.status(409).json({ message: "Duplicate phase name" });
  }

  const updatedPhase = await Phase.findByIdAndUpdate(
    id,
    {
      phaseName,
      phaseDescription,
    },
    { new: true }
  );

  if (!updatedPhase) {
    return res.status(404).json({ message: "Phase not found" });
  }

  res.json({
    message: `Phase '${updatedPhase.phaseName}' updated`,
  });
};

// Delete a phase
const deletePhase = async (req, res) => {
  const { id } = req.params;

  const deletedPhase = await Phase.findByIdAndDelete(id);

  if (!deletedPhase) {
    return res.status(404).json({ message: "Phase not found" });
  }

  res.json({
    message: `Phase '${deletedPhase.phaseName}' with ID ${deletedPhase._id} deleted`,
  });
};

module.exports = {
  getAllPhases,
  createNewPhase,
  updatePhase,
  deletePhase,
};
