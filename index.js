#! /usr/bin/env node

const yargs = require("yargs");

const AzureStorageManager = require("./lib/AzureStorageManager");

(async function () {
  const argv = yargs
    .command("create", "create a container", {
      container: {
        description: "Azure-Blob-Storage Container [Name]",
        alias: "c",
        type: "string",
      },
      type: {
        description: "Blob type select",
        alias: "t",
        type: "string",
      },
    })
    .command("remove", "remove a container", {
      container: {
        description: "Azure-Blob-Storage Container [Name]",
        alias: "c",
        type: "string",
      },
    })
    .command(
      "list",
      "list containers [if container name exists, Retrieving file list.]",
      {
        container: {
          description: "Azure-Blob-Storage Container [Name]",
          alias: "c",
          type: "string",
        },
      }
    )
    .command(
      "upload",
      "Uploading from your current directory to Azure-Blob-Storage Container",
      {
        folder: {
          description:
            "Source folder name must be written. All contents of this folder are loaded",
          alias: "f",
          type: "string",
        },
        container: {
          description: "Azure-Blob-Storage Container [Name]",
          alias: "c",
          type: "string",
        },
      }
    )
    .command(
      "download",
      "Downloading from Azure-Blob-Storage Container to your current directory",
      {
        folder: {
          description: "Target folder name must be written.",
          alias: "f",
          type: "string",
        },
        container: {
          description: "Azure-Blob-Storage Container [Name]",
          alias: "c",
          type: "string",
        },
      }
    )
    .command("delete", "Deleting Azure-Blob-Storage Container", {
      container: {
        description: "Azure-Blob-Storage Container [Name]",
        alias: "c",
        type: "string",
      },
    })
    .help()
    .alias("help", "h").argv;

  try {
    let connectionString = process.env["AzureWebJobsStorage"];
    if (!connectionString) {
      console.log("{AzureWebJobsStorage} environment not found!");
      return;
    }

    if (argv.folder) {
      console.log({ folder: argv.folder });
    }

    const azsm = new AzureStorageManager(connectionString);

    if (argv.container) {
      console.log({ container: argv.container });
      azsm.setContainer(argv.container);
    }

    switch (argv._[0]) {
      case "create":
        if (argv.container) {
          await azsm.createContainer(argv.type);
        }
        break;

      case "remove":
        if (argv.container) {
          await azsm.removeContainer();
        }
        break;

      case "list":
        console.log("The listing time is:", new Date().toLocaleTimeString());
        await azsm.listContainer();
        break;

      case "download":
        if (argv.folder && argv.container) {
          console.log("The download time is:", new Date().toLocaleTimeString());
          azsm.setFolderPath(argv.folder);
          await azsm.download();
        }
        break;

      case "upload":
        if (argv.folder && argv.container) {
          console.log("The upload time is:", new Date().toLocaleTimeString());
          azsm.setFolderPath(argv.folder);
          await azsm.upload();
        }
        break;

      case "delete":
        if (argv.container) {
          console.log("The delete time is:", new Date().toLocaleTimeString());
          await azsm.delete();
        }
        break;

      default:
        break;
    }
  } catch (error) {
    console.log(error);
    console.log(error.message);
  }
})();

module.exports = AzureStorageManager;
