# azure-storage-manager"

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

## 2.2. Parameters

| Parameter   | Short Parameter | Description             |
| :---------- | :-------------- | :---------------------- |
| --folder    | -f              | source folder path      |
| --container | -c              | selected container name |

**Examples**

```bash
$ azsm list                                          # listing all container name
$ azsm list -c <CONTAINER-NAME>                      # listing selected container content
$ azsm create -c <CONTAINER-NAME>                    # creating a new container
$ azsm download -c <CONTAINER-NAME> -f <FOLDER-PATH> # downloading container content
```

## 2.3. Environment

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

## LICENSE

MIT Licensed.

Copyright © Hidayet AYDIN 2022.
