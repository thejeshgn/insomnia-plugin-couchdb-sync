### Insomnia Core sync plugin

A simple plugin to sync (upload and download) workspaces via import/export through a couchdb server. It uses the standard CouhDB RESTFul APIS.

You can click "Sync upload" to upload your workspace, "Sync Download" to download the workspace.

The upload/download is made via the workspace name, but Insomnia will create a new Workspace if the same id doesn't exist (and eventually you will have 2 workspaces with the same name, at the first download).

In coucndb the workspace name is used as `_id`.

Lets say your couchdb is running locally. `http://localhost:5984`

1. Let's your couchdb database is called `insomnia`. A workspace JSON will be availabe through `http://localhost:5984/insomnia/<workspace_nam>`.
2. Endpoint is `http://localhost:5984/insomnia/`
3. Authorization is `Basic <code>`
4. Where `<code>` is Base64 of `username:pawword` which has access to 	insomnia DB.
5. Uploaded document looks like `{"_id:"workspace name", "workspace":"workspace export ", "revision":"insomina workspace revision", "_rev":"couchdb revision"}`