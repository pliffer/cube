const inquirer = require('inquirer');
const express  = require('express');
const path     = require('path');
const fs       = require('fs-extra');

let Util = require('../util.js');

module.exports = {

    setup(program){

        // @todo Cada teste terá uma forma de ser sumonada em determinado servidor

        program.option('--create <frontend, backend, unity, mock>', 'Create a test of certain type [frontend, backend, unity, mock, ...]');

        program.option('--name <name>', 'craete a test with an specified name');
        program.option('--goal <goal>', 'create a test with an specified goal');
        program.option('--path <path>', 'create a test with an specified path');

        return module.exports;

    },

    // Um tipo de testes deverá deixar um mock específico rodando, para que eu possa usar o front end
    // Outro tipo, roda todos os testes do frontend, em todos os testes de backend

    async run(opt, opts){

        let questionList = [];

        if(!opts.name){

            questionList.push({
                name: 'name',
                message: 'Qual o nome do teste?'
            });

        }

        if(!opts.goal){

            questionList.push({
                name: 'goal',
                message: 'Qual o objetivo?',
            });

        }

        if(!opts.path){

            questionList.push({
                name: 'path',
                message: 'Qual a pasta do projeto?',
                default: process.cwd()
            });

        }

        return inquirer.prompt(questionList).then(answers => {

            for(option in opts){

                answers[option] = opts[option];

            }

            let pipelineFile = global.pipeline[opts.create];

            if(!pipelineFile){

                return console.log(`@err Type of test missing on cube pipeline folder(blitz open cube)`);
            
            }

            pipelineFile.create(answers);

        });

    }

}
