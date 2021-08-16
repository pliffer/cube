const express = require('express');
const path    = require('path');
const fs      = require('fs-extra');

let Util = require('../util.js');

module.exports = {

    setup(program){

        program.option('--unapply-mock-files <testName>', 'Unpply the mock files test');

        // @todo Option for deleting

        return module.exports;

    },

    // Um tipo de testes deverá deixar um mock específico rodando, para que eu possa usar o front end
    // Outro tipo, roda todos os testes do frontend, em todos os testes de backend

    async run(arg, opts){

        if(!opts.unapplyMockFiles){

            return console.log(`@error É obrigatório usar ${"--apply-mock-files <testName>".green}`);

        }

        let mockHalfPath  = path.join('doc', 'tests', 'mock-files', opts.unapplyMockFiles);
        let mockFilesPath = path.join(process.cwd(), mockHalfPath);

        if(!fs.existsSync(mockFilesPath)){

            return console.log(`@error ${mockHalfPath.red} not found, so, ${opts.unapplyMockFiles.green} is not a valid test for apply`);

        }

        let mockMainFilePath = path.join(mockFilesPath, opts.unapplyMockFiles + '.json');

        if(!fs.existsSync(mockMainFilePath)){

            return console.log(`@error Main file (${opts.unapplyMockFiles + ".json"}) not found or not parseable`);

        }

        let mockMainFile = fs.readJsonSync(mockMainFilePath);

        let to = mockMainFile.from;

        return fs.readdir(mockFilesPath).then(mockFiles => {

            let files = 0;

            mockFiles.forEach(mockFile => {

                if(mockFile == opts.unapplyMockFiles + '.json') return;

                let fromPath        = path.join(mockFilesPath, mockFile);
                let destinationPath = path.join(process.cwd(), to, mockFile);

                if(fs.existsSync(destinationPath)){
                    fs.removeSync(destinationPath);
                    files++;
                }

            });

            console.log(`@info ${files} have been unapplied. To apply, run ` + ("blitz --apply-mock-files " + opts.unapplyMockFiles).green);

        });

    }

}