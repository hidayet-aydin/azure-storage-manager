const express = require("express");
const getStream = require("into-stream");
const AzureStorageManager = require("azure-storage-manager");

const multerUpload = require("./middleware/multer-upload");

const service = express();
service.use(express.json());
service.use(express.urlencoded({ extended: true }));

service.get("/uploads", (req, res) => {
  res.send(
    '<form action="/uploads" method="post" enctype="multipart/form-data">' +
      '<input type="file" multiple name="files" id="file" />' +
      '<input type="submit" value="Upload" />' +
      "</form>"
  );
});

service.post("/uploads", multerUpload, async (req, res) => {
  try {
    if (req.files.length <= 0) {
      throw new Error(`You must select at least 1 file.`);
    }

    const containerName = "test";
    const connectionString = process.env["AzureWebJobsStorage"];

    const azsm = new AzureStorageManager(connectionString);
    azsm.setContainer(containerName);

    const file_list = [];
    for await (let file of req.files) {
      const fileName = file.originalname;

      const stream = getStream(file.buffer);
      const result = await azsm.uploadStream(
        stream,
        fileName,
        false,
        "boom-360/"
      );

      file_list.push(result);
    }

    return res.status(201).json({
      message: "Files uploaded to Azure Blob storage.",
      container: containerName,
      files: file_list,
    });
  } catch (err) {
    console.log(err.message);
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res
        .status(413)
        .send({ error: { message: "Too many files to upload." } });
    }
    return res.status(500).json({ error: { message: err.message } });
  }
});

service.listen(3000, () =>
  console.log(`Example app listening on port ${3000}!`)
);
