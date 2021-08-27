const inquirer = require('inquirer');
const express  = require('express');
const path     = require('path');
const fs       = require('fs-extra');

let Util = require('../util.js');

module.exports = {

    setup(program){

        program.option('--rename [paths...]', 'Create a test of certain type [frontend, backend, unity, mock, ...]');

        return module.exports;

    },

    async run(opt, opts){

        console.log('@todo Renomeia um teste para outro');

    }

}
