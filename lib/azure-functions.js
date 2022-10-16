const { BlobServiceClient } = require("@azure/storage-blob");

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
    try {
      const blobClient = BlobServiceClient.fromConnectionString(connString);
      const containerClient = await blobClient.createContainer(containerName, {
        access: type, // "blob", "container"
      });
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

module.exports = {
  getContainerClient,
  createContainer,
  removeContainer,
  listContainers,
};
