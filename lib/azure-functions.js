const {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
  StorageSharedKeyCredential,
} = require("@azure/storage-blob");

const getContainerClient = async (connString, containerName) => {
  return new Promise(async (resolve, reject) => {
    try {
      const serviceClient = BlobServiceClient.fromConnectionString(connString);
      const contClient = await serviceClient.getContainerClient(containerName);
      return resolve(contClient);
    } catch (error) {
      return reject(error);
    }
  });
};

const createContainer = async (connString, containerName, type) => {
  return new Promise(async (resolve, reject) => {
    let accessParams = {};
    if (
      typeof type == "string" &&
      !["blob", "container", "private"].includes(type)
    ) {
      const err = new Error(
        "Type variable must be {blob}, {container}, {private}."
      );
      return reject(err.message);
    }

    switch (type) {
      case "blob":
        accessParams = {
          access: type,
        };
        break;

      case "container":
        accessParams = {
          access: type,
        };
        break;
    }

    try {
      const blobClient = BlobServiceClient.fromConnectionString(connString);
      const containerClient = await blobClient.createContainer(
        containerName,
        accessParams
      );
      console.log(`container ${containerName} created!`);
      return resolve(containerClient);
    } catch (error) {
      return reject(error);
    }
  });
};

const removeContainer = async (connString, containerName) => {
  return new Promise(async (resolve, reject) => {
    try {
      const blobClient = BlobServiceClient.fromConnectionString(connString);
      await blobClient.deleteContainer(containerName);
      console.log(`container ${containerName} removed!`);
      return resolve();
    } catch (error) {
      return reject(error);
    }
  });
};

const listContainers = async (connString) => {
  return new Promise(async (resolve, reject) => {
    const blobClient = BlobServiceClient.fromConnectionString(connString);

    const options = {
      includeDeleted: false,
      includeMetadata: true,
      includeSystem: true,
    };

    try {
      const iterator = blobClient.listContainers(options);
      let response = (await iterator.next()).value;
      const containers = [];
      while (response && response?.name) {
        containers.push(response);
        response = (await iterator.next()).value;
      }
      return resolve(containers);
    } catch (error) {
      return reject(error);
    }
  });
};

const streamUpload = async (
  connString,
  stream,
  containerName,
  fileName,
  mimetype,
  bufferSize = 1 * 1024 * 1024,
  maxBuffers = 20
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const serviceClient = BlobServiceClient.fromConnectionString(connString);
      const blobService = await serviceClient.getContainerClient(containerName);
      const blockBlobClient = blobService.getBlockBlobClient(fileName);
      await blockBlobClient.uploadStream(stream, bufferSize, maxBuffers, {
        metadata: { fileName: fileName },
        blobHTTPHeaders: { blobContentType: mimetype },
      });
      resolve(fileName);
    } catch (error) {
      return reject(error);
    }
  });
};

const generateBlobSASQuery = (
  accountName,
  accountKey,
  containerName,
  blobName,
  permissions = "racwd",
  expiryEnd = 12
) => {
  return new Promise((resolve, reject) => {
    try {
      const sharedKeyCredential = new StorageSharedKeyCredential(
        accountName,
        accountKey
      );

      const blobSAS = generateBlobSASQueryParameters(
        {
          containerName,
          blobName,
          permissions: BlobSASPermissions.parse(permissions),
          startsOn: new Date(new Date().valueOf() - expiryEnd * 3600 * 1000),
          expiresOn: new Date(new Date().valueOf() + expiryEnd * 3600 * 1000),
          // cacheControl: "cache-control-override", // Optional
          // contentDisposition: "content-disposition-override", // Optional
          // contentEncoding: "content-encoding-override", // Optional
          // contentLanguage: "content-language-override", // Optional
          // contentType: "content-type-override", // Optional
          // ipRange: { start: "0.0.0.0", end: "255.255.255.255" }, // Optional
          protocol: SASProtocol.HttpsAndHttp, // Optional
          version: "2016-05-31", // Optional
        },
        sharedKeyCredential
      ).toString();

      return resolve(blobSAS);
    } catch (error) {
      console.log(error);
      return reject(error);
    }
  });
};

module.exports = {
  getContainerClient,
  createContainer,
  removeContainer,
  listContainers,
  streamUpload,
  generateBlobSASQuery,
};
