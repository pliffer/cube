const express = require('express');
const path    = require('path');
const fs      = require('fs-extra');

let Util = require('../util.js');

module.exports = {

    setup(program){

        program.option('--learn [testName]', 'Learn how to do a test');

        // @todo Cada teste terá uma forma de ser sumonada em determinado servidor
        program.option('--type [site, port, ipc, file]', '[learn] Chose the method for learning');

        program.option('--headless [site, port, ipc, file]', '[learn] If present, doesnt show the browser');

        program.option('--instance <instance-id>', '[learn] If present run the test on chosed instance');

        return module.exports;

    },

    // Um tipo de testes deverá deixar um mock específico rodando, para que eu possa usar o front end
    // Outro tipo, roda todos os testes do frontend, em todos os testes de backend

    async run(){



    }

}

// @todo The cube needs to do certain kind of tests:

// cube --learn log.festasonline25.com.br --type site --name login --instance pliffer@hp-antigo

// cube bling.com.br(order: 61341)
// cube log.pliffer.com.br(order: 61341, sigma: order-61341)