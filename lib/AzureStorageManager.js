const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mime = require("mime-types");
const { v4: uuidv4 } = require("uuid");

const {
  createContainer,
  getContainerClient,
  listContainers,
  removeContainer,
  generateBlobSASQuery,
  streamUpload,
} = require("./azure-functions");

class AzureStorageManager {
  #fileList;
  constructor(connString) {
    if (!connString) {
      throw new Error("Connection String is not inserted!");
    }

    try {
      const conObj = connString.split(";").reduce((prev, curr) => {
        const peer = curr.split("=");
        prev[peer[0]] = peer[1];
        return prev;
      }, {});
      conObj.source_link = `${conObj.DefaultEndpointsProtocol}://${conObj.AccountName}.blob.${conObj.EndpointSuffix}`;
      // console.log("Source link:\n", conObj.source_link);
      this.conObj = conObj;
    } catch (error) {
      throw new Error("Connection String is not proper!");
    }

    this.connString = connString;
    this.containerName = null;
    this.folderPath = null;
    this.#fileList = [];
  }

  setContainer(containerName) {
    this.containerName = containerName;
  }

  async listContainer() {
    let result = [];
    if (this.containerName) {
      let [container, ...subPath] = this.containerName.split("/");
      subPath = subPath.join("/");

      const contClient = await getContainerClient(this.connString, container);
      for await (const blob of contClient.listBlobsFlat()) {
        let check = blob.name.match(subPath);
        if (check && check.index == 0) {
          console.log(blob.name);
          result.push(blob.name);
        }
      }
    } else {
      const list = await listContainers(this.connString);
      for (const cont of list) {
        console.log(
          `${cont.name}, (${cont.properties.publicAccess || "private"})`
        );
        result.push(
          `${cont.name}, (${cont.properties.publicAccess || "private"})`
        );
      }
    }
    return result;
  }

  async createContainer(type = "blob") {
    if (this.containerName) {
      await createContainer(this.connString, this.containerName, type);
      return;
    } else {
      throw new Error("Conteiner Name is not inserted!");
    }
  }

  async removeContainer() {
    if (this.containerName) {
      await removeContainer(this.connString, this.containerName);
    } else {
      throw new Error("Conteiner Name is not inserted!");
    }
  }

  getFileList() {
    return this.#fileList;
  }

  setFolderPath(path) {
    if (!path) {
      throw new Error("Root Folder is not inserted!");
    }
    this.folderPath = path;
    this.#folderScanner(this.folderPath, this.folderPath);
    return this.#fileList;
  }

  #folderScanner(static_path, root) {
    if (!fs.existsSync(static_path)) {
      fs.mkdirSync(static_path, { recursive: true });
    }

    const files = fs.readdirSync(static_path);
    for (let index in files) {
      const newPath = path.join(static_path, files[index]);
      if (fs.lstatSync(newPath).isDirectory()) {
        this.#folderScanner(newPath, root);
      } else {
        let url = newPath;
        if (url.startsWith(root)) {
          url = url.replace(root, "");
        }
        url = url.replace(/\\/g, "/").replace(/^\//i, "");
        const mimetype = mime.contentType(path.extname(newPath));
        this.#fileList.push({ path: newPath, url, mimetype });
      }
    }
  }

  async download() {
    try {
      if (!this.containerName) {
        throw new Error("Conteiner Name is not inserted!");
      }

      if (!this.folderPath) {
        throw new Error("Folder Path is not inserted!");
      }

      const contClient = await getContainerClient(
        this.connString,
        this.containerName
      );

      for await (const blob of contClient.listBlobsFlat()) {
        const blockBlobClient = await contClient.getBlobClient(blob.name);

        let blobNameArray = blob.name.split("/");
        const fileName = blobNameArray.pop();
        const folderPath = path.join(".", this.folderPath, ...blobNameArray);
        const filePath = path.join(folderPath, fileName);

        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }

        let fileMD5 = null;
        if (fs.existsSync(filePath)) {
          const hashSum = crypto.createHash("md5");
          const fileBuffer = fs.readFileSync(filePath);
          fileMD5 = hashSum.update(fileBuffer).digest("base64");
        }

        const contentMD5 = blob.properties.contentMD5?.toString("base64");
        if (!contentMD5) {
          console.log("Downloading:", blob.name);
          await blockBlobClient.downloadToFile(filePath);
          console.log("Downloaded:", blob.name);
          continue;
        }
        if (fileMD5 != contentMD5) {
          if (fileMD5) {
            console.log("Refreshed:", blob.name);
          }
          console.log("Downloading:", blob.name);
          await blockBlobClient.downloadToFile(filePath);
          console.log("Downloaded:", blob.name);
        } else {
          console.log("Existed:", filePath);
        }
      }
    } catch (error) {
      console.error(error.message);
    }
  }

  upload = async (files = this.#fileList) => {
    try {
      if (!this.containerName) {
        throw new Error("Conteiner Name is not inserted!");
      }

      const contClient = await getContainerClient(
        this.connString,
        this.containerName
      );

      for await (let file of files) {
        const blockBlobClient = await contClient.getBlockBlobClient(file.url);

        let contentMD5 = null;
        try {
          const properties = await blockBlobClient.getProperties();
          contentMD5 = properties?.contentMD5.toString("base64");
        } catch (e) {
          // console.log("New Uploading:", file.url);
        }

        const hashSum = crypto.createHash("md5");
        const fileBuffer = fs.readFileSync(file.path);
        const fileMD5 = hashSum.update(fileBuffer).digest("base64");

        if (contentMD5 != fileMD5) {
          console.log("Uploading:", file.url);
          await blockBlobClient.uploadFile(file.path, {
            metadata: { method: "automatic" },
            tags: {},
            blobHTTPHeaders: { blobContentType: file.mimetype.toString() },
          });
          if (contentMD5) {
            console.log("Refreshed:", file.url);
          } else {
            console.log("Uploaded:", file.url);
          }
        } else {
          console.log("Existed:", file.url);
        }
      }
    } catch (error) {
      console.error(error.message);
    }
  };

  uploadStream = async (stream, fileName, isUuid = false, prefix = "") => {
    try {
      if (!this.containerName) {
        throw new Error("Conteiner Name is not inserted!");
      }

      if (typeof fileName != "string" || fileName.trim().length < 3) {
        throw new Error("{fileName} is invalid!");
      }

      if (typeof isUuid != "boolean") {
        throw new Error("{isUuid} is invalid!");
      }

      if (typeof prefix != "string") {
        throw new Error("{prefix} is invalid!");
      }

      const mimetype = mime.contentType(fileName);
      if (!mimetype) {
        throw new Error("{mime-type} is invalid!");
      }

      if (isUuid) {
        fileName = `${prefix}${uuidv4()}`;
      } else {
        fileName = `${prefix}${fileName.trim()}`;
      }

      await streamUpload(
        this.connString,
        stream,
        this.containerName,
        fileName,
        mimetype
      );

      return fileName;
    } catch (error) {
      console.error(error.message);
    }
  };

  async delete() {
    if (!this.containerName) {
      throw new Error("Conteiner Name is not inserted!");
    }

    let [container, ...subPath] = this.containerName.split("/");
    subPath = subPath.join("/");

    const contClient = await getContainerClient(this.connString, container);
    for await (const blob of contClient.listBlobsFlat()) {
      let check = blob.name.match(subPath);
      if (check && check.index == 0) {
        console.log("Deleted:", blob.name);
        const blockBlobClient = await contClient.getBlockBlobClient(blob.name);
        await blockBlobClient.deleteIfExists({
          deleteSnapshots: "include", // or 'only'
        });
      }
    }
  }

  async generateBlobSAS(blobName, permissions, expiryEnd) {
    if (!this.conObj.AccountName || !this.conObj.AccountKey) {
      throw new Error("{AccountName} or {AccountKey} can not found!");
    }

    if (!this.containerName) {
      throw new Error("Conteiner Name is not inserted!");
    }

    if (!blobName) {
      throw new Error("Blob Name is not inserted!");
    }

    const sasKey = await generateBlobSASQuery(
      this.conObj.AccountName,
      this.conObj.AccountKey,
      this.containerName,
      blobName,
      permissions,
      expiryEnd
    );
    const url = `${this.conObj.source_link}/${this.containerName}/${blobName}?${sasKey}`;

    return { sasKey, url };
  }
}

module.exports = AzureStorageManager;
