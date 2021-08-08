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

    // global.app.onload(() => {

    //     // Passa por cada arquivo dentro de routes e o inicia
    //     fs.readdirSync(global.dir.routes).forEach(routeName => {

    //         let routeFile = path.join(global.dir.routes, routeName)

    //         let routeObj = require(routeFile)

    //         if(typeof routeObj === 'object') return

    //         let router = new express.Router()

    //         routeObj({

    //             get(route, f){

    //                 router.get(route, (req, res) => {

    //                     res.std(f(req.query))

    //                 })

    //             },

    //             post(route, f){

    //                 router.post(route, (req, res) => {

    //                     res.std(f(req.body))

    //                 })

    //             },

    //             put(route, f){

    //                 router.put(route, (req, res) => {

    //                     res.std(f(req.body))

    //                 })

    //             },

    //             jwt: {

    //                 get(route, f){

    //                     router.get(route, global.helpers.jwt.middleware, (req, res) => {

    //                         res.std(f(req.decoded, req.query))

    //                     })

    //                 },

    //                 post(route, f){

    //                     router.post(route, global.helpers.jwt.middleware, (req, res) => {

    //                         res.std(f(req.decoded, req.body))

    //                     })

    //                 },

    //                 put(route, f){

    //                     router.put(route, global.helpers.jwt.middleware, (req, res) => {

    //                         res.std(f(req.decoded, req.body))

    //                     })

    //                 }

    //             }

    //         })

    //         // Caso a rota esteja prefixada
    //         if(typeof routeObj.route !== 'undefined'){

    //             // Router com prefixo
    //             app.use(routeObj.route, router)

    //         } else{

    //             // Router sem prefixo
    //             app.use(router)

    //         }

    //     })

    //     // Ignore cordova.js 404 error on browser environment
    //     app.get('cordova.js', (req, res) => res.send(''))

    // })

    server.listen(port, () => {

        console.log(`@info ${config.testName} listening on //${host}:${port}`)

        console.log(global.config.socket)

        if (global.config.socket) global.config.socket.setup(io);

    })

    return {
        app: app,
        server: server,
        io: io
    }

});