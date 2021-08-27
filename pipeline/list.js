const express = require('express');
const path    = require('path');
const fs      = require('fs-extra');

let Util = require('../util.js');

module.exports = {

    setup(program){

        program.option('--list <testType>', 'List subfolders and files of certain test type');

        return module.exports;

    },

    // Isso deve permitir que uma api teste um front end real, assim como apenas usar as requisições para
    // simular ações de um front end real

    async run(testName, opts){

        let projectFolder = process.cwd();

        let testPath = path.join(projectFolder, 'doc', 'tests', testName);

        if(!fs.existsSync(testPath)){

            console.log(`@err ${testPath} does not exists`);

        }

        let tests = await fs.readdir(testPath);

        tests.forEach((test, k) => {

            console.log((k+1) + '. ' + test);

        });

    }

}