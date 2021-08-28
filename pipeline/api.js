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

        return module.exports;

    },

    test(opts){

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

        let item = require(testPath);

        if(item.expect){

            let cube    = Util.cube(env, opts);
            let answer  = null;
            let data;

            opts._pipeline_file = module.exports;

            try{

                data = item.data(cube);

            } catch(e){

                console.log(e);

                return cube.reject(e, new Date().getTime());

            }

            let prePromise = Promise.resolve();

            if(data.then){

                prePromise = data.then(dataReturn => {

                    data = dataReturn;

                });

            }

            return prePromise.then(() => {

                let headers = null || item.headers;

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

                    cube.reject(e.toString(), e);

                });

            });

        } else{

            return require(testPath)(Util.cube(env, opts));

        }

    },

    // Isso deve permitir que uma api teste um front end real, assim como apenas usar as requisições para
    // simular ações de um front end real

    async run(testName, opts, folder){

        let runAll = false;

        if(!testName) runAll = true;

        opts.projectFolder = process.cwd();
        opts.type = 'api';
        opts.testName = testName;

        if(!folder){
            
            let frontEndTestPath = path.join(opts.projectFolder, 'doc', 'tests', 'api', testName);

            if(!fs.existsSync(frontEndTestPath)){

                return console.log(`@error É requerido a pasta doc/tests/api/${testName}`);

            }

            folder = frontEndTestPath;

        }

        opts.folder = folder;

        let tests = await fs.readdir(folder);

        Util.forEachPromise(tests, test => {

            opts.test = test;

            return module.exports.test(opts);

        });

    },

    examples: {

        "sample-test": `

module.exports = {

    method: 'post',
    url: '/auth',

    description: '$description',

    headers: {
        // jwt
        // x-access-token
    },

    data(){

        return {
            "mail": "example@example.com.br",
            "pass": "example"
        }

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

            fs.writeFileSync(testPath, example, 'utf-8');

        }

        Util.spawn(['subl', testsPath]);

    }

}