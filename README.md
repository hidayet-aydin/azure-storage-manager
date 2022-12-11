# Azure Storage Manager

File management tool for azure blob storage. You can upload or download your local files with CLI commands.

## 1. INSTALLATION

Install the library with `npm i --save azure-storage-manager`

## 2. ENVIRONMENT

Copy your key from your "azure blob storage" account. This key must be added with an environment named "AzureWebJobsStorage".

**Linux or macOS**

```bash
export AzureWebJobsStorage="DefaultEndpointsProtocol=https;AccountName=xxx;AccountKey=xxx;EndpointSuffix=core.windows.net"
```

**Command Prompt**

```bash
set AzureWebJobsStorage="DefaultEndpointsProtocol=https;AccountName=xxx;AccountKey=xxx;EndpointSuffix=core.windows.net"
```

**PowerShell**

```bash
$Env:AzureWebJobsStorage="DefaultEndpointsProtocol=https;AccountName=xxx;AccountKey=xxx;EndpointSuffix=core.windows.net"
```

## 3. CLI USAGE

**Basic Commands**

| Command  | Description                                               | Parameters       |
| :------- | :-------------------------------------------------------- | :--------------- |
| list     | listing                                                   | _-c_             |
| create   | Creating a container                                      | _-c_             |
| remove   | Removing a container                                      | _-c_             |
| upload   | Uploading from your directory to Blob-Storage container   | _-c, -f_         |
| download | Downloading from Blob-Storage container to your directory | _-c, -f_         |
| delete   | Deleting Blob-Storage relative container path content     | _-c_             |
| sas      | Shared Signature Access (SAS) key generation              | _-c, -b, -p, -e_ |

**Parameters**

| Short Parameter | Parameter    | Description                      |
| :-------------- | :----------- | :------------------------------- |
| -c              | --container  | selected container name          |
| -f              | --folder     | source/target folder path        |
| -t              | --type       | container type [public, private] |
| -b              | --blob       | blob name                        |
| -p              | --permission | permission parameters [racwd]    |
| -e              | --expiry     | Expiry for integer-hour          |

**CLI Examples**

```bash
$ azsm list                                                        # listing all container name
$ azsm list -c <CONTAINER-NAME>                                    # listing selected container
$ azsm create -c <CONTAINER-NAME> [-t private]                     # creating a new container
$ azsm download -c <CONTAINER-NAME> -f <FOLDER-PATH>               # downloading container content
$ azsm sas -c test -b "icons/picture-logo.png" -p "r" -e "12"      # generating SAS Key
```

**CommonJS Uploading Examples**

```js
const AzureStorageManager = require("azure-storage-manager");

(async function () {
  const connectionString = process.env["AzureWebJobsStorage"];
  const azsm = new AzureStorageManager(connectionString);

  await azsm.listContainer();
  //   special, (private)
  //   public, (blob)

  azsm.setContainer("test"); //----> container name
  azsm.setFolderPath("source"); //-> source folder
  await azsm.upload();
  // Uploading: icons/logo.png
  // Uploaded: icons/logo.png
  // Uploading: notes.txt
  // Uploaded: notes.txt
  // Uploading: picture.png
  // Uploaded: picture.png

  await azsm.listContainer();
  // icons/logo.png
  // notes.txt
  // picture.png

  const sasResult = await azsm.generateBlobSAS("icons/logo.png", "r", "6");
  console.log(sasResult);
  //   {
  //     sasKey: 'sv=2016-05-31&spr=https%2Chttp&st=2022-11-23T05%3A47%3A48Z&se=2022-11-23T17%3A47%3A48Z&sr=b&sp=r&sig=xxx',
  //     url: 'https://xxx.blob.core.windows.net/special/icons/logo.png?sv=2016-05-31&spr=https%2Chttp&st=2022-11-23T05%3A47%3A48Z&se=2022-11-23T17%3A47%3A48Z&sr=b&sp=r&sig=xxx'
  //   }
})();
```

```js
const multer = require("multer");
const express = require("express");
const getStream = require("into-stream");

const AzureStorageManager = require("azure-storage-manager");

const inMemoryStorage = multer.memoryStorage();
const uploadStrategy = multer({
  storage: inMemoryStorage,
  limits: { fileSize: 1 * 1024 * 1024 },
}).array("files", 3); // Up to 3 files can be uploaded

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/uploads", (req, res) => {
  res.send(
    '<form action="/uploads" method="post" enctype="multipart/form-data">' +
      '<input type="file" multiple name="files" id="file" />' +
      '<input type="submit" value="Upload" />' +
      "</form>"
  );
});

app.post("/uploads", uploadStrategy, async (req, res) => {
  try {
    const connectionString = process.env["AzureWebJobsStorage"];

    const azsm = new AzureStorageManager(connectionString);
    azsm.setContainer("test");

    for await (let file of req.files) {
      const stream = getStream(file.buffer);
      const fileName = file.originalname;

      await azsm.uploadStream(stream, fileName);
    }

    return res.json({
      message: "Files uploaded to Azure Blob storage.",
    });
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
});

app.listen(3000, () => console.log(`Example app listening on port ${3000}!`));
```

## LICENSE

MIT Licensed.

Copyright © Hidayet AYDIN 2022.
