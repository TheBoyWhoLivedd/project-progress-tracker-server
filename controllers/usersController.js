
const bcrypt = require("bcrypt");
const User = require("../models/User");

// @desc Get all users
// @route POST /users
// @access Private

const getAllUsers = async (req, res) => {
  const users = await User.find().select("-password").lean();
  if (!users?.length) {
    return res.status(400).json({ message: "No users found" });
  }
  // res.status(409).json({ message: "Trying out Error Middleware", isError: true });
  res.json(users);
};

// @desc Create new user
// @route POST /users
// @access Private
const createNewUser = async (req, res) => {
  // console.log(req.body);
  const { name, email, password, departmentId, hasAdminRights } = req.body;

  if (!name || !email || !password || !departmentId) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const duplicate = await User.findOne({ email }).lean().exec();
  if (duplicate) {
    return res.status(409).json({ message: "Duplicate email", isError: true });
  }

  const hashedPwd = await bcrypt.hash(password, 10);
  const userObject = {
    name,
    email,
    password: hashedPwd,
    departmentId,
    hasAdminRights,
  };

  const user = await User.create(userObject);

  if (user) {
    res.status(201).json({ message: `New user ${name} created` });
  }
};

// @desc Update user
// @route PATCH /users/:id
// @access Private
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, password, departmentId, hasAdminRights } = req.body;

  // confirm data
  if (!name || !email || !departmentId) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const user = await User.findById(id).exec();

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // check for duplicate email
  const duplicate = await User.findOne({ email }).lean().exec();

  // Allow updates to the original user
  if (duplicate && duplicate._id.toString() !== id) {
    return res.status(409).json({ message: "Duplicate email", isError: true });
  }

  user.name = name;
  user.email = email;
  user.departmentId = departmentId;
  user.hasAdminRights = hasAdminRights === true;

  if (password) {
    // hash password
    user.password = await bcrypt.hash(password, 10); // salt rounds
  }

  const updatedUser = await user.save();

  res.json({ message: `User ${updatedUser.name} updated` });
};

// @desc Delete user
// @route DELETE /users/:id
// @access Private
const deleteUser = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "User ID required" });
  }

  const user = await User.findById(id).exec();

  if (!user) {
    return res.status(404).json({ message: "User not found" }); // Use 404 for not found
  }

  // const notes = await Note.find({ user: id }).lean().exec();

  // if (notes.length > 0) {
  //   // Check if user has any associated notes
  //   return res
  //     .status(400)
  //     .json({ message: "Cannot delete user with associated notes" });
  // }

  await User.deleteOne({ _id: id });

  res.status(200).json({ message: `User ${user.name} successfully deleted` });
};

module.exports = {
  getAllUsers,
  createNewUser,
  updateUser,
  deleteUser,
};
