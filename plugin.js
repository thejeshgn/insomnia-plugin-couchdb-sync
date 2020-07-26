const fs = require('fs')
const axios = require('axios')
const { v4 } = require('uuid')

const storeKey = key => `insomnia-plugin-sync-${key}`

const getOrSetEndpoint = async context => {
  console.log(storeKey);
  console.log(context);
  if (await context.store.hasItem(storeKey('endpoint'))) {
    return context.store.getItem(storeKey('endpoint'))
  } else {
    await changeSettings(context);
    return context.store.getItem(storeKey('endpoint'))
  }
}

const getOrSetAuthorization = async context => {
  console.log(storeKey);
  console.log(context);
  if (await context.store.hasItem(storeKey('authorization'))) {
    return context.store.getItem(storeKey('authorization'))
  } else {
    await changeSettings(context);
    return context.store.getItem(storeKey('authorization'))
  }
}


const changeSettings = async context => {
    const endpoint = await context.app.prompt('set endpoint')
    await context.store.setItem(storeKey('endpoint'), endpoint)
    const authorization = await context.app.prompt('set Authorization')
    await context.store.setItem(storeKey('authorization'), authorization)
}


const depositWorkspace = async content => {
  console.log(__dirname);
  if (!fs.existsSync(__dirname+'/deposit')) fs.mkdirSync(__dirname+'/deposit')
  fs.writeFileSync(__dirname+'/deposit/'+Date.now()+'_export.json', JSON.stringify(content))
}

const getWorkspace = async (context, models) => {
  return await context.data.export.insomnia({
    includePrivate: false,
    format: 'json',
    workspace: models.workspace,
  })
}

const workspaceEndpoint = (endpoint, name) => {
  if(name){
    const url = new URL(endpoint+encodeURI(name));
    return url.href;    
  }else{
  const url = new URL(endpoint);
  return url.href;    
  }
}



module.exports.workspaceActions = [
{
    label: 'Sync Settings',
    icon: 'fa-gear',
    action: async (context, models) => {
      console.log('models', models);
      console.log('context', context);

      await changeSettings(context)


    }
  },
  {
    label: 'Sync upload',
    icon: 'fa-upload',
    action: async (context, models) => {
      console.log('models', models);
      if (!confirm('Ready to upload?')) return
      const revision = v4()
      const endpoint = await getOrSetEndpoint(context)
      const authorization = await getOrSetAuthorization(context)
      const workspace = await getWorkspace(context, models)
      await context.store.setItem(storeKey('revision'), revision)

      const _rev = await context.store.getItem(storeKey('_rev'))      
      

      if(_rev){
          const data = {"_id":models.workspace.name, "workspace":workspace, "revision": revision, "_rev": _rev }
          await depositWorkspace(data)
          await axios.put(workspaceEndpoint(endpoint, models.workspace.name), data, {
            headers: {'Content-Type': 'application/json', 'Authorization': authorization}
          }).then((res) => {
            console.log('insomnia-plugin-sync', 'upload', res)
            console.log('insomnia-plugin-sync', 'upload', res["data"].rev)
            context.store.setItem(storeKey('_rev'), res["data"].rev)
          }).catch((err) => {
            console.error('insomnia-plugin-sync', 'upload', err)
            context.app.alert("Error while uploading")
          })
      }else{
          const data = { "_id":models.workspace.name, "workspace":workspace, "revision": revision}
          await depositWorkspace(data)
          await axios.post(workspaceEndpoint(endpoint, null), data, {
            headers: {'Content-Type': 'application/json', 'Authorization': authorization}
          }).then((res) => {
            console.log('insomnia-plugin-sync', 'upload', res)
            console.log('insomnia-plugin-sync', 'data', res["data"].rev)
            context.store.setItem(storeKey('_rev'), res["data"].rev)

          }).catch((err) => {
            console.error('insomnia-plugin-sync', 'upload', err)
            context.app.alert("Error while uploading")
          })          
      }
       

    }
  },
  {
    label: 'Sync download',
    icon: 'fa-download',
    action: async (context, models) => {
      if (!confirm('Ready to download?')) return
      const endpoint = await getOrSetEndpoint(context)
      const authorization = await getOrSetAuthorization(context)
      const revision = await context.store.getItem(storeKey('revision'))      
      const workspace = await getWorkspace(context, models)
      await depositWorkspace({ workspace, revision })

      await axios.get(workspaceEndpoint(endpoint, models.workspace.name), {headers: {'Content-Type': 'application/json', 'Authorization': authorization}}

        ).then((res) => {

        const data = res.data

        if (typeof data !== 'object' || typeof data.workspace === 'undefined') {
          context.app.alert('Invalid API data type. See console...')
          console.warn('sync upload', res.data)
          return
        }

        context.store.setItem(storeKey('revision'), data.revision)
        context.store.setItem(storeKey('_rev'), data._rev)
        context.data.import.raw(data.workspace).then((res) => {
          console.log('insomnia-plugin-sync', 'download')
        }).catch((err) => {
          console.error('insomnia-plugin-sync', 'download', err)
          context.app.alert("Error while downloading")
        })
      })
    },
  },
  {
    label: 'Sync check',
    icon: 'fa-check',
    action: async (context, models) => {
      const endpoint = await getOrSetEndpoint(context)
      const authorization = await getOrSetAuthorization(context)
      const revision = await context.store.getItem(storeKey('revision'))

      await axios.get(workspaceEndpoint(endpoint, models.workspace.name), {headers: {'Content-Type': 'application/json', 'Authorization': authorization}}

        ).then((res) => {
        context.app.alert('Sync plugin', revision === res.data.revision ? 'Up to date' : 'Update ready')
      })
    },
  }

]
