const multer = require("multer");
const { s3Uploadv3 } = require("../services/s3Service");
const { logEvents } = require("../middleware/logger");

// Set up multer storage and file filter
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1000000000 },
});

// Controller function for file uploading
const uploadFile = async (req, res) => {
  // console.log("Request files",req.files)
  try {
    const results = await s3Uploadv3(req.files);
    console.log(results);
    return res.status(200).json({ status: "success", results });
  } catch (err) {
    console.log(err);
    // More detailed error handling can be implemented here
    return res.status(500).json({
      status: "error",
      message: "An error occurred during the file upload.",
    });
  }
};

// Error handling middleware
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    // handle different types of multer errors
    let message = "Error in file upload";
    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        message = "File is too large";
        break;
      case "LIMIT_FILE_COUNT":
        message = "File limit reached";
        break;
      case "LIMIT_UNEXPECTED_FILE":
        message = "File must be an image";
        break;
    }

    logEvents(
      `${err.name}\t${err.message}\t${req.method}\t${req.url}\t${req.headers.origin}`,
      "errLog.log"
    );

    console.log(err.stack);

    return res.status(400).json({ message, isError: true });
  }
  next(error);
};

module.exports = { upload, uploadFile, handleMulterError };
