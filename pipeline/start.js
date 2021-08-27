const path    = require('path');
const fs      = require('fs-extra');

let Util = require('../util.js');

module.exports = {

    setup(program){

        program.option('-s, --start [folder]', 'Run a test');

        return module.exports;

    },

    async run(folder){

        if(folder == '.') folder = process.cwd();
        else{
            folder = path.resolve(process.cwd(), folder);
        }

        let testPath = path.join(folder, 'doc', 'tests');

        if(!fs.existsSync(testPath)){

            return console.log(`@error É requerido a pasta doc/tests`);

        }

        let tests = await fs.readdir(testPath);

        console.log(`@info Crie testes com --create ou --learn e ajude cube a crescer`.yellow);

        if(!tests.length) return console.log(`${"@error".red} É requerido haver algum tipo de teste [frontend, backend, unity, mock, etc...] na pasta ${"doc/tests/<tipo>".green}`);

        tests.forEach(test => {

            if(!global.pipeline[test]) return console.log(`@error Não existe um procedimento para o teste ${test}`);

            global.pipeline[test].run(false, {}, path.join(testPath, test));

        });

    }

}