const Department = require("../models/Department");

// @desc Get all departments
// @route GET /departments
// @access Private
const getAllDepartments = async (req, res) => {
  // Get all departments from MongoDB
  const departments = await Department.find().lean();

  // If no departments
  if (!departments?.length) {
    return res.status(400).json({ message: "No departments found" });
  }

  res.json(departments);
};

// @desc Create new department
// @route POST /departments
// @access Private

const createNewDepartment = async (req, res) => {
  const { departmentName, departmentDetails, departmentStatus } = req.body;

  // Create and store the new department
  const createdDepartment = await Department.create({
    departmentName,
    departmentDetails,
    departmentStatus,
  });

  if (createdDepartment) {
    return res.status(201).json({ message: "New department created" });
  } else {
    return res
      .status(400)
      .json({ message: "Invalid department data received" });
  }
};

/**
 * Updates a department in the database.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @return {Object} The updated department.
 */
const updateDepartment = async (req, res) => {
  const { id } = req.params;
  const { departmentName, departmentDetails, departmentStatus } = req.body;

  if (!departmentName) {
    return res.status(400).json({ message: "Department name is required" });
  }

  const duplicate = await Department.findOne({
    departmentName,
    _id: { $ne: id },
  })
    .collation({ locale: "en", strength: 2 })
    .lean();

  if (duplicate) {
    return res.status(409).json({ message: "Duplicate department name" });
  }

  const updatedDepartment = await Department.findByIdAndUpdate(
    id,
    {
      departmentName,
      departmentDetails,
      departmentStatus,
    },
    { new: true }
  );

  if (!updatedDepartment) {
    return res.status(404).json({ message: "Department not found" });
  }

  res.json({
    message: `Department '${updatedDepartment.departmentName}' updated`,
  });
};

// Delete a department
const deleteDepartment = async (req, res) => {
  const { id } = req.params;

  const deletedDepartment = await Department.findByIdAndDelete(id);

  if (!deletedDepartment) {
    return res.status(404).json({ message: "Department not found" });
  }

  res.json({
    message: `Department '${deletedDepartment.departmentName}' with ID ${deletedDepartment._id} deleted`,
  });
};

module.exports = {
  getAllDepartments,
  createNewDepartment,
  updateDepartment,
  deleteDepartment,
};
