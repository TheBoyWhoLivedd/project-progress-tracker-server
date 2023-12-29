const express = require("express");
const router = express.Router();
const {
  upload,
  uploadFile,
  handleMulterError,
} = require("../controllers/fileUploadController");

const verifyJWT = require("../middleware/verifyJWT");

router.use(verifyJWT);

router.post("/", upload.array("file"), uploadFile);

router.use(handleMulterError);

module.exports = router;
