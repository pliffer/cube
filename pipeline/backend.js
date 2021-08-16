const express = require('express');
const path    = require('path');
const fs      = require('fs-extra');

let Util = require('../util.js');

module.exports = {

    setup(program){

        program.option('-b, --backend [testName]', 'Run a backend test');

        return module.exports;

    },

    // Um tipo de testes deverá deixar um mock específico rodando, para que eu possa usar o front end
    // Outro tipo, roda todos os testes do frontend, em todos os testes de backend

    async run(testName, opts, folder){

        let runAll = false;

        if(!testName) runAll = true;

        if(!folder){

            if(!fs.existsSync(path.join(process.cwd(), 'doc', 'tests', 'backend', testName))){

                return console.log(`@error É requerido a pasta doc/tests/backend/${testName}`);

            }

            folder = path.join(process.cwd(), 'doc', 'tests', 'backend', testName);

        }

        let tests = await fs.readdir(folder);

        let initObj = {

            port: 9999,
            host: 'localhost',
            testName: testName,

            // Isso aqui virá do arquivo de definição do test
            body_parser: true,
            cors: true,

            socket: {

                setup(io){

                    // @todo

                }

            },

            gzip: true

        };

        if(fs.existsSync(path.join(folder, 'assets'))) initObj.assets = path.join(folder, 'assets');

        let kugel = require('../microkugel.js')(initObj);

        tests.forEach(test => {

            let testPath = path.join(folder, test);

            let routeObj = require(testPath);

            let router = new express.Router();

            routeObj({

                get(route, f){

                    router.get(route, (req, res) => {

                        res.std(f(req.query))

                    })

                },

                post(route, f){

                    router.post(route, (req, res) => {

                        res.std(f(req.body))

                    })

                },

                put(route, f){

                    router.put(route, (req, res) => {

                        res.std(f(req.body))

                    })

                },

                // jwt: {

                //     get(route, f){

                //         router.get(route, global.helpers.jwt.middleware, (req, res) => {

                //             res.std(f(req.decoded, req.query))

                //         })

                //     },

                //     post(route, f){

                //         router.post(route, global.helpers.jwt.middleware, (req, res) => {

                //             res.std(f(req.decoded, req.body))

                //         })

                //     },

                //     put(route, f){

                //         router.put(route, global.helpers.jwt.middleware, (req, res) => {

                //             res.std(f(req.decoded, req.body))

                //         })

                //     }

                // }

            });

            // Caso a rota esteja prefixada
            if(typeof routeObj.route !== 'undefined'){

                // Router com prefixo
                kugel.app.use(routeObj.route, router)

            } else{

                // Router sem prefixo
                kugel.app.use(Router)

            }

        });

    }

}