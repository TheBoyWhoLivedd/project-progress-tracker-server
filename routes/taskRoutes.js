const express = require("express");
const router = express.Router();
const tasksController = require("../controllers/tasksController");
const verifyJWT = require("../middleware/verifyJWT");

router.use(verifyJWT);

router.route("/").get(tasksController.getAllTasks);

router
  .route("/:projectId")
  .get(tasksController.getTasksByProjectId)
  .post(tasksController.createNewTask);

router
  .route("/:projectId/:taskId")
  .patch(tasksController.updateTask)
  .delete(tasksController.deleteTask);

module.exports = router;
