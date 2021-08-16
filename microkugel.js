const compression = require('compression')
const bodyParser  = require('body-parser')
const fileUpload  = require('express-fileupload')
const express     = require('express')
const socket      = require('socket.io')
const colors      = require('colors')
const path        = require('path')
const http        = require('http')
const fs          = require('fs-extra')

module.exports = (config => {

    global.config = config;

    const port     = config.port;
    const host     = config.host;

    // Set the constants
    const app = express()

    if (global.config.body_parser) {

        app.use(bodyParser.json({

            limit: process.env.BODYPARSER_LIMIT || '250mb'

        }))

        app.use(bodyParser.urlencoded({

            limit: process.env.BODYPARSER_LIMIT || '250mb',

            // @todo Verificar necessidade de colocar o extended em .env
            extended: true

        }))

    }

    // Warning: CORS
    if (global.config.cors) {

        app.use((req, res, next) => {

            res.header('Access-Control-Allow-Origin', '*')
            res.header('Access-Control-Allow-Credentials', 'true')
            res.header('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, action, x-access-token')

            next()

        })

    }

    app.use(fileUpload())

    var server = http.createServer(app)

    if (global.config.socket) {

        var io = socket(server)
    }

    // Configure the gzip
    if (global.config.gzip){

        app.use(compression({

            filter: (req, res) => {

                if (req.headers['x-no-compression']) return false
                return compression.filter(req, res)

            }

        }))

    }

    // Enable delivery of static content
    if (global.config.assets) {

        // Configure the assets folder
        app.use(express.static(global.config.assets))

    }

    app.use((req, res, next) => {

        res.ifcan = (permissions, promise) => {

            if(typeof permissions == 'string') permissions = [permissions]

            var includeAll = true

            permissions.forEach(function(permission){

                if(!req.decoded.permissions || !req.decoded.permissions.includes(permission)){

                    includeAll = false

                }

            })

            if(includeAll || req.decoded.permissions.includes('admin')){

                res.std(promise)

            } else{

                res.std(Promise.reject('401 - No permission'))

            }

        }

        res.std = promise => {

            // Turn the result into a promise
            if(typeof promise.then === 'undefined') promise = Promise.resolve(promise);

            promise.then(result => {

                res.json({
                    success: true,
                    message: result,
                    unixtime: new Date().getTime()
                });

            }).catch(e => {

                console.error('@error'.yellow, e.toString().red);

                if(typeof e === 'undefined') e = "";

                res.json({
                    success: false,
                    message: e.toString(),
                    unixtime: new Date().getTime()
                });

            });

        }

        next()

    })

    server.listen(port, () => {

        console.log(`@info ${config.testName} listening on //${host}:${port}`)

        if (global.config.socket) global.config.socket.setup(io);

    })

    return {
        app: app,
        server: server,
        io: io
    }

});