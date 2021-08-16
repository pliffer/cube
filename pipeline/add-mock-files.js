const express = require('express');
const path    = require('path');
const fs      = require('fs-extra');

let Util = require('../util.js');

module.exports = {

    setup(program){

        program.option('--add-mock-files <path>', 'Add some files to a --test-name test');
        program.option('--test-name <testName>', 'Run a backend test');

        return module.exports;

    },

    // Um tipo de testes deverá deixar um mock específico rodando, para que eu possa usar o front end
    // Outro tipo, roda todos os testes do frontend, em todos os testes de backend

    async run(arg, opts){

        if(!opts.addMockFiles){

            return console.log(`@error É obrigatório usar ${"--add-mock-files <folder>".green}`);

        }

        if(!opts.testName){

            return console.log(`@error É obrigatório usar ${"--test-name <name>".green}`);

        }

        let mockFilesPath = path.resolve(process.cwd(), opts.addMockFiles);

        return Util.findProject(mockFilesPath).then(projectPath => {

            if(!projectPath){

                return console.log(`@error Não foi possível achar o projeto a partir dessa pasta`.red);

            }

            console.log('@info Project on', projectPath);

            let destinationPath = path.join(projectPath, 'doc', 'tests', 'mock-files', opts.testName);

            // Garante que a pasta doc existe, para jogarmos os arquivos de mock
            fs.ensureDirSync(destinationPath);

            return fs.readdir(mockFilesPath).then(mockFiles => {

                if(!mockFiles.length) return console.log('@err There are no files for mock');

                let movedFiles = 0;

                mockFiles.forEach(mockFile => {

                    let mockFilePath        = path.join(mockFilesPath,   mockFile);
                    let destinationMockPath = path.join(destinationPath, mockFile);

                    fs.copySync(mockFilePath, destinationMockPath);

                    movedFiles++;

                });

                let mainFile = path.join(destinationPath, opts.testName + '.json');

                fs.writeJsonSync(mainFile, {
                    name: opts.testName,
                    from: mockFilesPath.replace(projectPath, '')
                });

                console.log(`@info ${movedFiles} arquivos foram copiados para ${destinationPath.replace(projectPath, '').green}`)

            });

        });

    }

}