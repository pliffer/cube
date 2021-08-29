const express  = require('express');
const path     = require('path');
const fs       = require('fs-extra');

let Util = require('../util.js');

module.exports = {

    setup(program){

        program.option('--results',   'Show the results of cube');
        program.option('--count <n>', 'Count the quantity of lines');

        return module.exports;

    },

    // Isso deve permitir que uma api teste um front end real, assim como apenas usar as requisições para
    // simular ações de um front end real

    async run(opt, opts){

        if(!opt) return;

        let qty = opts.count || 5;

        let projectFolder = process.cwd();

        let frontEndTestPath = path.join(projectFolder, 'doc', 'tests', 'results');

        if(!fs.existsSync(frontEndTestPath)){

            return console.log(`@error É requerido a pasta doc/tests/results`);

        }

        let tests = await fs.readdir(frontEndTestPath);

        let testNumber = 0;

        return Util.forEachPromise(tests, test => {

            let testPath = path.join(frontEndTestPath, test);

            return fs.readdir(testPath).then(results => {

                console.log((++testNumber + '. ' + test).yellow);

                results.sort((result1, result2) => {

                    let unixtime1 = result1.split('-')[0];
                    let unixtime2 = result2.split('-')[0];

                    return unixtime2 - unixtime1;

                });

                results.forEach((result, k) => {

                    if(k >= qty) return;

                    let resultSplit = result.split('-');

                    // getSimpleHour
                    let unixtime = Number(resultSplit[0]);

                    let date = Util.getBeautifulDate(unixtime) + ' ' + Util.getSimpleHour(unixtime);

                    let resolved = resultSplit[3].substr(0, 8) == 'RESOLVED';

                    let status = resolved?resultSplit[2].green:resultSplit[2].red;

                    let file = resultSplit[1];

                    console.log(`${testNumber.toString().yellow}.${k+1} ${date} - ${file.yellow}(${status})`);

                });

            });

        }).then(async () => {

            let type = await Util.ask('Qual tipo de teste deseja interagir?');

            console.log(type);

        });

    },

}