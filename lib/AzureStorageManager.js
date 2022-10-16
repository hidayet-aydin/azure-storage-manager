const fs = require("fs");
const path = require("path");
const mime = require("mime-types");

const {
  createContainer,
  getContainerClient,
  listContainers,
  removeContainer,
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
      this.source_link = `${conObj.DefaultEndpointsProtocol}://${conObj.AccountName}.blob.${conObj.EndpointSuffix}`;
      // console.log("Source link:\n", this.source_link);
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
    if (this.containerName) {
      const contClient = await getContainerClient(
        this.connString,
        this.containerName
      );

      for await (const blob of contClient.listBlobsFlat()) {
        console.log(blob.name);
      }
    } else {
      const list = await listContainers(this.connString);
      for (const cont of list) {
        if (cont.properties.publicAccess) {
          console.log(`${cont.name}, (${cont.properties.publicAccess})`);
        }
      }
    }
  }

  async createContainer() {
    if (this.containerName) {
      await createContainer(this.connString, this.containerName, "blob");
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

  async #folderScanner(static_path, root) {
    if (!fs.existsSync(static_path)) {
      fs.mkdirSync(static_path, { recursive: true });
    }

    const files = fs.readdirSync(static_path);
    for (let index in files) {
      const newPath = path.join(static_path, files[index]);
      if (fs.lstatSync(newPath).isDirectory()) {
        await this.#folderScanner(newPath, root);
      } else {
        const url = newPath
          .replace(root, "")
          .replace(/\\/g, "/")
          .replace(/[/]/i, "");
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
        const metabytes = blob.properties.contentLength;

        let blobNameArray = blob.name.split("/");
        const fileName = blobNameArray.pop();
        const folderPath = path.join(".", this.folderPath, ...blobNameArray);
        const filePath = path.join(folderPath, fileName);

        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }

        let bytes = null;
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          bytes = stats.size.toString();
        }

        if (bytes != metabytes) {
          if (bytes) {
            console.log("Refreshed:", blob.name);
          }
          console.log("Download:", blob.name);
          await blockBlobClient.downloadToFile(filePath);
        } else {
          console.log("Existed:", filePath);
        }
      }
    } catch (error) {
      console.error(error);
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

        let metabytes = null;
        try {
          const properties = await blockBlobClient.getProperties();
          metabytes = properties?.contentLength;
        } catch (e) {
          console.log("Uploaded:", file.url);
        }

        const stats = fs.statSync(file.path);
        const bytes = stats.size.toString();

        if (metabytes != bytes) {
          if (metabytes) {
            console.log("Refreshed:", file.url);
          }
          await blockBlobClient.uploadFile(file.path, {
            metadata: { method: "automatic" },
            tags: {},
            blobHTTPHeaders: { blobContentType: file.mimetype.toString() },
          });
        } else {
          console.log("Existed:", file.url);
        }
      }
    } catch (error) {
      console.error(error);
      console.error(error.message);
    }
  };

  async delete() {
    if (!this.containerName) {
      throw new Error("Conteiner Name is not inserted!");
    }

    const contClient = await getContainerClient(
      this.connString,
      this.containerName
    );

    for await (const blob of contClient.listBlobsFlat()) {
      console.log("Deleted:", blob.name);
      const blockBlobClient = await contClient.getBlockBlobClient(blob.name);
      await blockBlobClient.deleteIfExists({
        deleteSnapshots: "include", // or 'only'
      });
    }
  }
}

module.exports = AzureStorageManager;
