const express = require('express');
const path    = require('path');
const fs      = require('fs-extra');

let Util = require('../util.js');

module.exports = {

    setup(program){

        program.option('--api [testName]', 'Run a api test');
        program.option('--show', 'Show the results of request(useful when developing)');

        return module.exports;

    },

    // Isso deve permitir que uma api teste um front end real, assim como apenas usar as requisições para
    // simular ações de um front end real

    async run(testName, opts, folder){

        let runAll = false;

        if(!testName) runAll = true;

        let projectFolder = process.cwd();

        if(!folder){
            
            let frontEndTestPath = path.join(projectFolder, 'doc', 'tests', 'api', testName);

            if(!fs.existsSync(frontEndTestPath)){

                return console.log(`@error É requerido a pasta doc/tests/api/${testName}`);

            }

            folder = frontEndTestPath;

        }

        let tests = await fs.readdir(folder);

        Util.forEachPromise(tests, test => {

            if(test == 'preload.js') return Promise.resolve();
            if(test.indexOf('.json') !== -1) return Promise.resolve();
            if(test.indexOf('.js') == -1) return Promise.resolve();

            let testPath = path.join(folder, test);

            delete require.cache[require.resolve(testPath)];

            let browser = null;

            let env = Util.getEnv();

            let sufix = '';

            if(env.HOST == 'localhost') sufix = ':' + env.PORT;

            let url = env.PROTOCOL + "://" + env.HOST + sufix;

            env.FULLHOST = url;

            opts.projectFolder = projectFolder;
            opts.type = 'api';
            opts.test = test;
            opts.testName = testName;

            let item = require(testPath);

            if(item.expect){

                let cube    = Util.cube(env, opts);
                let answer  = null;
                let data;

                try{

                    data = item.data(cube);

                } catch(e){

                    console.log(e);

                    return cube.reject(e, new Date().getTime());

                }

                let headers = null || item.headers;

                return cube.request(item.method, item.url, data, headers).then(ret => {

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
                    answer = null;

                    return preAnswer.then(() => {

                        if(opts.show) console.log(data);

                        return item.expect(ret, cube, data);

                    });

                }).then(() => {

                    if(item.finally) return item.finally(cube);

                }).then(cube.resolve).catch(e => {

                    cube.reject(e.toString(), e);

                });

            } else{

                return require(testPath)(Util.cube(env, opts));

            }

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