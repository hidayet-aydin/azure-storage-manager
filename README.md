# Azure Storage Manager

File management tool for azure blob storage. You can upload or download your local files with CLI commands.

## 1. INSTALLATION

Install the library with `npm i --save azure-storage-manager`

## 2. CLI USAGE

## 2.1. Commands

| Command  | Description                                               |
| :------- | :-------------------------------------------------------- |
| list     | listing                                                   |
| create   | Creating a container                                      |
| remove   | Removing a container                                      |
| upload   | Uploading from your directory to Blob-Storage container   |
| download | Downloading from Blob-Storage container to your directory |
| delete   | Deleting Blob-Storage container content                   |
| sas      | Shared Signature Access (SAS) key generation              |

## 2.2. Parameters

### 2.2.1. General Parameters

| Parameter   | Short Parameter | Description             |
| :---------- | :-------------- | :---------------------- |
| --folder    | -f              | source folder path      |
| --container | -c              | selected container name |

### 2.2.2. Command-Special Parameters

| Command | Parameter    | Short Parameter | Description                        |
| :------ | :----------- | :-------------- | :--------------------------------- |
| create  | --type       | -t              | container type (optional)          |
| sas     | --blob       | -b              | blob name (mandatory)              |
| sas     | --permission | -p              | permission parameters (optional)   |
| sas     | --expiry     | -e              | Expiry for integer-hour (optional) |

**Environment**

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

**CLI Examples**

```bash
$ azsm list                                                        # listing all container name
$ azsm list -c <CONTAINER-NAME>                                    # listing selected container
$ azsm create -c <CONTAINER-NAME> [-t private]                     # creating a new container
$ azsm download -c <CONTAINER-NAME> -f <FOLDER-PATH>               # downloading container content
$ azsm sas -c <CONTAINER-NAME> -b <BLOB-NAME> [-e 12] [-p "racwd"] # generating SAS Key
$ azsm sas -c test -b "icons/picture-logo.png" -p r
```

**CommonJS Example**

```js
const AzureStorageManager = require("azure-storage-manager");

(async function () {
  const connectionString = process.env["AzureWebJobsStorage"];
  const azsm = new AzureStorageManager(connectionString);

  await azsm.listContainer();
  //   special, (private)
  //   public, (blob)

  azsm.setContainer("special"); // target container
  azsm.setFolderPath("special-folder"); // source folder
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

## LICENSE

MIT Licensed.

Copyright © Hidayet AYDIN 2022.
