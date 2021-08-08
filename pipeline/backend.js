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

            console.log(test);

        });

    }

}