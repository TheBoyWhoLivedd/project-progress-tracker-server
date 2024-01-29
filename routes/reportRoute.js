const express = require("express");
const router = express.Router();
const reportsController = require("../controllers/reportsController");
const verifyJWT = require("../middleware/verifyJWT");

router.use(verifyJWT);

router.route("/generate-report").get(reportsController.getOverallReport);

module.exports = router;
