const express = require("express");
const router = express.Router();
const departmentsController = require("../controllers/departmentsController");
const verifyJWT = require("../middleware/verifyJWT");

router.use(verifyJWT);

router
  .route("/")
  .get(departmentsController.getAllDepartments)
  .post(departmentsController.createNewDepartment);

router
  .route("/:id")
  .patch(departmentsController.updateDepartment)
  .delete(departmentsController.deleteDepartment);

module.exports = router;
