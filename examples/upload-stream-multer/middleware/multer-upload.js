const multer = require("multer");

const inMemoryStorage = multer.memoryStorage();
const uploadStrategy = multer({
  storage: inMemoryStorage,
  limits: { fileSize: 1 * 1024 * 1024 },
}).array("files", 3); // Up to 3 files can be uploaded

const multerUpload = (req, res, next) => {
  uploadStrategy(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: { message: err.message } });
    } else if (err) {
      return res.status(500).json({ error: { message: err.message } });
    }

    return next();
  });
};

module.exports = multerUpload;
