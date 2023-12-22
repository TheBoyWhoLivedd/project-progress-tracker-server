const express = require("express");
const router = express.Router();
const phasesController = require("../controllers/phasesController");
const verifyJWT = require("../middleware/verifyJWT");

router.use(verifyJWT);

router
  .route("/")
  .get(phasesController.getAllPhases)
  .post(phasesController.createNewPhase);

router
  .route("/:id")
  .patch(phasesController.updatePhase)
  .delete(phasesController.deletePhase);

module.exports = router;
