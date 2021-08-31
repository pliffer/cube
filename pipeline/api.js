const express = require('express');
const path    = require('path');
const fs      = require('fs-extra');

let Util = require('../util.js');

module.exports = {

    setup(program){

        program.option('--api [testName]', 'Run a api test');
        program.option('--show',           'Show the results of request(useful when developing)');
        program.option('--url <url>',      'Test using an url, instead of parsing based on blitz.json or .env')
        program.option('--timeout <ms>',   'Let the user choose how many seconds triggers timeout')
        program.option('--verbose',        'If enabled, show more info')

        // @todo Quero poder passar propriedades na linha de comando e o arquivo conseguir testar
        // --args {searchTerm: 'ola', page: 12, perpage: 155}

        return module.exports;

    },

    test(opts, preData){

        if(!preData) preData = null;

        if(opts.test == 'preload.js') return Promise.resolve();
        if(opts.test.indexOf('.json') !== -1) return Promise.resolve();
        if(opts.test.indexOf('.js') == -1) return Promise.resolve();

        let testPath = path.join(opts.folder, opts.test);

        delete require.cache[require.resolve(testPath)];

        let browser = null;

        let env = Util.getEnv();

        let sufix = '';

        if(env.HOST == 'localhost') sufix = ':' + env.PORT;

        let url = env.PROTOCOL + "://" + env.HOST + sufix;

        if(opts.url) env.FULLHOST = opts.url;

        if(!env.FULLHOST) env.FULLHOST = url;

        if(env.PRODUCTION_URL) env.FULLHOST = env.PRODUCTION_URL;

        let item = require(testPath);

        if(item.enabled === false){

            console.log(`@info ${opts.test} disabled`)

            return Promise.resolve();

        }

        if(typeof item.data == 'undefined'){

            item.data = () => {
                return Promise.resolve();
            }

        }

        item.opts = JSON.parse(JSON.stringify(opts));

        if(item.expect){

            let cube    = Util.cube(env, opts);

            cube.item = item;

            let answer  = null;
            let data;

            opts._pipeline_file = module.exports;

            try{

                data = item.data(cube, preData);

            } catch(e){

                return cube.reject(e, new Date().getTime());

            }

            let prePromise = Promise.resolve();

            if(data.then){

                prePromise = data.then(dataReturn => {

                    data = dataReturn;

                });

            }

            return prePromise.then(() => {

                if(cube.resolved === true) return Promise.resolve();

                let headers = null || item.headers;

                cube.log(data);

                return cube.request(item.method, item.url, data, headers, opts).then(ret => {

                    let preAnswer = Promise.resolve();

                    if(item.filter){

                        preAnswer = item.filter(ret);

                    } else{

                        preAnswer = new Promise((resolve, reject) => {

                            if(ret.res.statusCode !== 200) return reject(ret.res.statusCode + ' ' + ret.res.statusMessage);

                            resolve();

                        });

                    }

                    // Detectar e filtrar erros
                    answer = ret;

                    return preAnswer.then(() => {

                        if(opts.show) console.log(data);

                        return item.expect(ret, cube, data);

                    });

                }).then(() => {

                    if(item.finally) return item.finally(cube);

                }).then(() => {

                    return cube.resolve();

                }).then(() => {

                    if(opts._external){

                        return answer.body;

                    }

                }).catch(e => {

                    cube.item = item;

                    cube.reject(e.toString(), e);

                });

            });

        } else{

            return require(testPath)(Util.cube(env, opts));

        }

    },

    runAll(opts){

        let testPath = path.join(opts.projectFolder, 'doc', 'tests', 'api');

        if(!fs.existsSync(testPath)){

            return console.log(`@error É requerido a pasta doc/tests/api`);

        }

        opts.folder = testPath;

        Util.forEachFile(opts.folder, (filename) => {

            let testfolder = path.join(opts.folder, filename);

            return Util.forEachFile(testfolder, testfile => {

                opts.folder = testfolder;
                opts.test   = testfile;

                return module.exports.test(opts);

            });

        })

    },

    // Isso deve permitir que uma api teste um front end real, assim como apenas usar as requisições para
    // simular ações de um front end real

    async run(testName, opts, folder){

        let runAll = false;

        if(testName === true) testName = false;

        if(!testName) runAll = true;

        opts.projectFolder = process.cwd();
        opts.testName      = testName;
        opts.type          = 'api';

        if(runAll) return module.exports.runAll(opts);

        if(!folder){

            folder = path.join(opts.projectFolder, 'doc', 'tests', 'api', testName);

            if(!fs.existsSync(folder)){

                return console.log(`@error É requerido a pasta doc/tests/api/${testName}`);

            }

            opts.folder = folder;

        }

        let tests = await fs.readdir(folder);

        Util.forEachPromise(tests, test => {

            opts.test = test;

            return module.exports.test(opts);

        });


    },

    examples: {

        "sample-test": `

module.exports = {

    method: '$method',
    url: '$route',

    description: '$description',

    headers: {},

    data(){

        // Request payload
        return {}

    },

    expect(answer, cube, data){

        if(!answer.body.success){

            return Promise.reject(answer.body.message);

        }

        cube.set(new Date().getTime(), answer.body);

    },

    finally(cube){}

}

`,

    },

    create(obj){

        console.log('@info Creating a cube api test named ' + obj.name.green);

        let finalPath = path.resolve(process.cwd(), obj.path);

        obj.path = finalPath;

        let testsPath = path.join(obj.path, 'doc', 'tests', 'api', obj.name);
        let testPath  = path.join(testsPath, obj.name + '.js');

        if(!fs.existsSync(testsPath)) fs.ensureDirSync(testsPath);

        if(fs.existsSync(testPath)){

            console.log('@info Abrindo existente', testPath);

        } else{

            let example = module.exports.examples["sample-test"].trim();

            example = example.replace('$description', obj.goal);
            example = example.replace('$route', obj.route);
            example = example.replace('$method', obj.method);

            fs.writeFileSync(testPath, example, 'utf-8');

        }

        Util.spawn(['subl', testsPath]);

    }

}