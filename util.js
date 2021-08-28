const Prompt  = require('prompt-password');
const dotenv  = require('dotenv');
const path    = require('path');
const open    = require('open');
const fs      = require('fs-extra');
const cp      = require('child_process');
const uuid    = require('uuid').v4;
const request = require('request');
const chance  = require('chance');

let Util = {

	config: {
		enabled: {}
	},

	_extensions: {

		programming: ['js', 'cs'],
		markup: ['md', 'html'],
		shell: ['sh', 'bat', ],
		precompiled: ['scss', 'sass', 'pug', 'jade', 'ts'],
		other: ['conf', 'css', 'example', 'EXAMPLE', 'txt']

	},

    open(url){

        opn(url);

    },

    identifyFramework(dir){

        // @todo Adicionar uma metodologia mais prática na identificação dos frameworks
        // como por exemplo uma adição por JSON

        // Pega-se os arquivos irmãos, a fim de identificar qual framework estamos
        let brotherFiles = fs.readdirSync(dir);

        let possibility = {};

        let possibleFiles = {

            wordpressTheme:  ['entry.php', 'header.php', 'functions.php', 'sidebar.php', 'comments.php'],
            magento:         ['Gruntfile.js.sample', 'auth.json.sample', 'phpserver', 'SECURITY.md', 'generated', 'COPYING.txt'],
            magentoTheme:    ['theme.xml', 'registration.php', 'i18n'],
            prestashop:      ['header.php', 'init.php', 'error500.html', 'prestashop', 'Adapter', 'classes', 'localization', 'images.inc.php'],
            prestashopTheme: ['404.tpl', 'breadcrumb.tpl', 'my-account.tpl', 'config.xml', 'cms.tpl']

        }

        brotherFiles.forEach(file => {

            for(framework in possibleFiles){

                if(possibleFiles[framework].includes(file)){

                    if(!possibility[framework]) possibility[framework] = 0;

                    possibility[framework]++;

                }

            }

        });

        let max    = 0;
        let chosed = '';

        Object.keys(possibility).forEach(framework => {

            if(possibility[framework] > max){

                chosed = framework;
                max = possibility[framework];

            }

        });

        return chosed;

    },

    parseJson(path){

        return fs.readFile(path, 'utf-8').then(json => {

            // Remove os comentários
            json = json.replace(/\s\/\/.+?\n/g, '');

            return JSON.parse(json);

        }).catch(e => {

            console.log(`@err ${path} is in an invalid json format`);

        });

    },

    forEachPromise: function(arr, callback){

        if(!arr || arr.length == 0) return Promise.resolve();

        return new Promise(function(resolve, reject){

            var index = 0;

            var tick = function(){

                if(typeof arr[index] === 'undefined'){

                    return resolve();

                }

                var callbackPromise = callback(arr[index]);

                if(callbackPromise && callbackPromise.then){

                    callbackPromise.then(function(){

                        index++;

                        tick();

                    });

                } else{

                    index++;

                    tick();

                }

            }

            tick();

        });

    },

    random(min, max){
        return Math.floor(Math.random()*(max-min+1)+min);
    },

	populateRecursively(entriesPath, entries){

		return new Promise((resolve, reject) => {

			fs.readdirSync(entriesPath).forEach(entry => {

				let entryPath = path.join(entriesPath, entry);

				if(/node_modules/.test(entryPath)) return;
				if(/platforms\/android/.test(entryPath)) return;
                if(/\.git/.test(entryPath)) return;
				if(/plugins\/cordova/.test(entryPath)) return;

				let stat = fs.lstatSync(entryPath)

				if(!stat.isFile()){

					Util.populateRecursively(entryPath, entries);

				} else{
					entries.push(entryPath);
				}

			});

			resolve(entries);

		});

	},

    ignorableExt: ['.log', '.pdf', '.xlsx', '.xls', '.ods', '.png', '.jpg', '.jpeg', '.bmp', '.mp3', '.ogg', '.xml'],

    forEachEntry(entriesPath, callback, opt = {}){

        if(!opt.content) opt.content = true;

        return new Promise((resolve, reject) => {

            fs.readdirSync(entriesPath).forEach(entry => {

                let entryPath = path.join(entriesPath, entry);

                if(/node_modules/.test(entryPath)) return;
                if(/platforms\/android/.test(entryPath)) return;
                if(/\.git/.test(entryPath)) return;
                if(/plugins\/cordova/.test(entryPath)) return;
                if(/cache/.test(entryPath)) return;

                let ext = path.extname(entry);

                if(module.exports.ignorableExt.includes(ext)) return;

                let stat = fs.lstatSync(entryPath)

                // Se for acima de 5mb, ignora
                if(stat.size / 1024 / 1024 > 5){
                    return;
                }

                if(!stat.isFile()){

                    Util.forEachEntry(entryPath, callback);

                } else{

                    if(opt.content){
                        
                        callback(entryPath, fs.readFileSync(entryPath, 'utf-8'));

                    } else{

                        callback(entryPath);

                    }                    

                }

            });

            resolve();

        });

    },

	getAllEntries(entriesPath){

		let entries = [];

		return Util.populateRecursively(entriesPath, entries).then(() => {

			return entries;

		});

	},

	toPipeline(entries){

		fs.readdirSync(global.dir.pipeline).forEach(pipeFile => {

			require(path.join(global.dir.pipeline, pipeFile))(entries, Util.config);

		});

	},

    fileDiff(file1, file2){

        return new Promise(async (resolve, reject) => {

            let data1 = await fs.readFileSync(file1, 'utf-8');
            let data2 = await fs.readFileSync(file2, 'utf-8');

            data1 = data1.split("\n");
            data2 = data2.split("\n");

            let lines = data1.length;

            if(data2.length > lines){

                lines = data2.length;

            }

            let err    = false;
            let result = [];

            for(let i = 0; i < lines; i++){

                if(err) continue;

                if(data1[i] != data2[i]){

                    err = true;

                    if(typeof data1[i] == 'undefined') data1[i] = '';
                    if(typeof data2[i] == 'undefined') data2[i] = '';

                    let maxLength = data1[i].length;

                    if(data2[i].length > maxLength) maxLength = data2[i].length;

                    let letterErr = false;
                    let part1Err  = '';
                    let part2Err  = '';

                    for(let l = 0; l < maxLength; l++){

                        if(letterErr) continue;

                        let part1 = data1[i].substr(0, l);
                        let part2 = data2[i].substr(0, l);

                        if(part1 !== part2){

                            part1Err = part1;
                            part2Err = data1[i].substr(l);
                            letterErr = true;

                        }

                    }

                    result.push({
                        line: i,
                        part1: part1Err,
                        part2: part2Err,
                        data1: data1,
                        data2: data2
                    });

                }

            }

            return resolve(result);

        });

    },

    showDiff(files, diff, columns){

        let subjects = [];

        let maxLength = 0;

        let maxAllowed = Math.floor(columns/2) - 10;

        let begin = -4;
        let end   = Math.abs(begin) + 1;

        if(i+diff.line < 0) begin = 0;

        let modLine = diff.line;

        let equalLineNumber = -1;
        let equalLine = "";

        let maxLineLength = diff.data1.length;

        if(diff.data2.length > maxLineLength) maxLineLength = diff.data2.length;

        maxLineLength = maxLineLength.toString().length;

        diff.data2.forEach((line, lineNumber) => {

            if(lineNumber < modLine) return;

            if(line == diff.data1[modLine]){
                equalLine = line;
                equalLineNumber = lineNumber;
            }

        });

        for(var i = begin; i < end; i++){

            let left  = diff.data1[i + diff.line];
            let right = diff.data2[i + diff.line];

            if(!left) left = '';
            if(!right) right = '';

            if(left.length  > maxLength) maxLength = left.length;
            if(right.length > maxLength) maxLength = right.length;

            if(maxLength > maxAllowed){

                maxLength = maxAllowed;

                left  = left.substr(0,  maxLength);
                right = right.substr(0, maxLength);

            }

            subjects.push([left, right]);

        }

        let fileBlankRepeat = maxLength - files.file1.length;

        if(fileBlankRepeat < 0) fileBlankRepeat = 0;

        // Mostra o nome dos arquivos acima das linhas
        console.log(files.file1.cyan + " ".repeat(fileBlankRepeat) + "      | " + files.file2.cyan);

        subjects.forEach((subject, k) => {

            let bias = 0;
            let subjectLeft = subject[0];
            let stepLine = false;

            if(equalLineNumber > -1){

                bias = equalLineNumber - modLine;

            }

            if(k >= Math.abs(begin) && bias > 0){

                stepLine = k - Math.abs(begin);

                if(k - Math.abs(begin) < bias){

                    subjectLeft = '';

                } else{

                    subjectLeft = subjects[k-bias][0];

                }

            }

            let fill = " ".repeat(maxLength - subjectLeft.length);
            let line = (diff.line + k + begin + 1);

            let lineLeft = line;
            let lineRight = line;

            if(stepLine !== false){

                if(stepLine > bias - 1){

                    lineLeft = line - bias;

                } else{

                    lineLeft = ' -';

                }

                if(modLine + end < bias && stepLine > 1){

                    lineLeft = (bias + k + begin + 1);

                    subjectLeft = diff.data1[line+1];

                    let repeatBy = maxLength - subjectLeft.length;

                    if(repeatBy < 0) repeatBy = 0;
 
                    fill = " ".repeat(repeatBy);


                }


            }

            if(lineLeft.toString().length < maxLineLength){

                lineLeft = " ".repeat(maxLineLength - lineLeft.toString().length) + lineLeft.toString();

            }

            if(lineRight.toString().length < maxLineLength){

                lineRight = " ".repeat(maxLineLength - lineRight.toString().length) + lineRight.toString();

            }

            if(lineRight == modLine + 1){

                lineRight = lineRight.toString().blue;

            } else{

                lineRight = lineRight.toString().yellow;

            }

            if(lineLeft == modLine + 1){

                lineLeft = lineLeft.toString().blue;

            } else{

                lineLeft = lineLeft.toString().yellow;

            }

            console.log(lineLeft + ' ' + Util.sintaxHighlight(subjectLeft, 'js') + " " + fill + " | " + lineRight + " " + Util.sintaxHighlight(subject[1], 'js'));

        });

        console.log("");

    },

    sintaxHighlight(txt, lang = 'js'){

        let parsed = txt;

        parsed = parsed.replace('let', 'let'.italic.blue);
        parsed = parsed.replace('const', 'const'.italic.blue);
        parsed = parsed.replace('var', 'var'.italic.blue);

        parsed = parsed.replace(/\"(.+?)\"/g, '"' + "$1".yellow.italic + '"')
        parsed = parsed.replace(/\'(.+?)\'/g, '\'' + "$1".yellow.italic + '\'')

        return parsed;

    },
    
    lineLog(msg){

        process.stdout.write(`\r${msg}`);

    },

    randomCached(folder){

        return module.exports.listCached(folder).then(list => {

            return module.exports.getCache(folder, list[module.exports.random(0, list.length-1)]);

        });

    },

    listCached(folder){

        let filepath = path.join(__dirname, 'cache', folder);

        return fs.readdir(filepath).catch(e => {

            console.log(`@err ${e.toString()}`);

            throw e;

        });

    },

    setCache(folder, filename, object){

        let cacheDir = path.join(__dirname, 'cache', folder);

        return fs.ensureDir(cacheDir).then(() => {

            filename = filename.replace('.json', '');

            let filepath = path.join(cacheDir, filename + '.json');

            return fs.writeJson(filepath, object);

        }).catch(e => {

            console.log(`@err ${e.toString()}`);

            throw e;

        });

    },

    getCache(folder, file){

        let sufix = '.json';

        if(file.substr(-5) == '.json') sufix = '';

        let filepath = path.join(__dirname, 'cache', folder, file + sufix);

        return fs.exists(filepath).then(exists => {

            if(!exists) return Promise.reject(file + ' not cached at ' + folder);

            return fs.readJson(filepath);

        }).catch(e => {

            console.log(`@err ${e.toString()}`);

            throw e;

        });

    },

    run(string, dataCallback, opts){

        return new Promise((resolve, reject) => {

            return module.exports.spawn(string.split(' '), dataCallback, opts).then(resolve).catch(reject);

        });

    },

    getEnv(){

        let envPath = path.join(process.cwd(), '.env');

        if(!fs.existsSync(envPath)){

            console.log(`@err There's no .env on this folder to be parsed`)

            return false;

        }

        let envBuffer = fs.readFileSync(envPath);

        return dotenv.parse(envBuffer);

    },

    inheritSpawn(args, additionalOpts){

        let opts = {
            stdio: ['inherit', 'inherit', 'inherit']
        };

        let callback = () => {};

        if(additionalOpts){

            if(additionalOpts.callback) callback = additionalOpts.callback;

            delete additionalOpts.callback;

            for(opt in additionalOpts) opts[opt] = additionalOpts[opt];

        }

        return new Promise((resolve, reject) => {

            let spawn = cp.spawn(args.shift(), args, opts);

            callback(spawn);

            spawn.on('exit', resolve);
            spawn.on('error', reject);

        });

    },

    jwt(jwt){

        return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());

    },

    cube(info, opts){

        let cube = function(env){

            this.id  = uuid();
            this.dir = opts.projectFolder;
            this.env = env;

            let that = this;

            this.util   = module.exports;
            this.chance = chance;

            this.jsons = function(location, filter){

                let testDir = path.join(this.dir, 'doc', 'tests', opts.type, opts.test);

                let authPath = path.resolve(testDir, location);

                if(!fs.existsSync(authPath)) throw 'cube.jsons(location) not found';

                let successfulAuths = fs.readdirSync(authPath);

                let chosed = successfulAuths.find(successfulAuth => {

                    let successfulAuthPath = path.join(authPath, successfulAuth);

                    let authContent = fs.readJsonSync(successfulAuthPath);

                    let filterResult = filter(authContent);

                    return filterResult;

                });

                return fs.readJsonSync(path.join(authPath, chosed));

            }

            this.run = function(testName){

                return opts._pipeline_file.test({
                    projectFolder: opts.projectFolder,
                    type: opts.type,
                    test: testName + '.js',
                    folder: path.resolve(opts.folder, '../', testName),
                    _external: true
                });

            }

            this.set = function(filename, object, prepath = ''){

                let cacheDir = path.join(this.dir, 'doc', 'tests', opts.type, opts.test.replace('.js', ''), prepath);

                filename = filename.toString().replace('.json', '');

                let filepath = path.join(cacheDir, filename + '.json');

                return fs.ensureDir(cacheDir).then(() => {

                    return fs.writeJson(filepath, object);

                }).catch(e => {

                    console.log(`@err ${e.toString()}`);

                    throw e;

                });

            }

            this.get = function(filename){

                let sufix = '.json';

                if(filename.substr(-5) == '.json') sufix = '';

                let filepath = path.join(this.dir, 'doc', 'tests', opts.type, opts.test, filename + sufix);

                return fs.exists(filepath).then(exists => {

                    if(!exists) return Promise.reject(filename + ' not cached at ' + filepath);

                    return fs.readJson(filepath);

                }).catch(e => {

                    console.log(`@err ${e.toString()}`);

                    throw e;

                });

            }

            this.call = function(toRequire, data){

                console.log('calling', toRequire);



            }

            // this.getProfiles = function(){

            //     let profilePath = path.join(this.dir, 'doc', 'tests', opts.type, opts.testName, 'profiles');

            //     if(!fs.existsSync(profilePath)) return console.log(`@error ${profilePath} does not exists`);

            //     let profiles   = [];

            //     return fs.readdir(profilePath).then(profileFiles => {

            //         let profileRet = [];

            //         profileFiles.forEach(profile => {

            //             profileRet.push(fs.readJson(path.join(profilePath, profile)).then(profileData => {

            //                 profiles.push(profileData);

            //             }));

            //         });

            //         return Promise.all(profileRet);

            //     }).then(() => {

            //         return profiles;

            //     });

            // }

            this.request = (method, url, data = {}, headers = null, opts = {}) => {

                if(!method) return console.log(`@error Method argument needed`);
                if(!url) return console.log(`@error url argument needed`);

                if(!opts.timeout) opts.timeout = 5000;
                if(!opts.show)    opts.show = false;

                let testUrl = env.FULLHOST + url;

                console.log('@info Requisitando ' + testUrl.green);

                let initialFeedbackTime = new Date().getTime();

                let feedback = setInterval(() => {

                    // Util.lineLog("\n");
                    Util.lineLog('@info Aguardando resposta (' + (new Date().getTime() - initialFeedbackTime)/1000 + ' segundos passados)');

                }, 100);

                return new Promise((resolve, reject) => {

                    let jwt = false;

                    if(method == 'jwt.post'){
                        method = 'post';
                        jwt = true;
                    }

                    if(method == 'jwt.get'){
                        method = 'get';
                        jwt = true;
                    }

                    if(jwt){

                        // @todo Eu sinto que dá para fazer algo aqui, mas esse if ficou obsoleto com os headers

                    }

                    return request[method](testUrl, {
                        headers: headers,
                        json: data,
                        timeout: Number(opts.timeout)
                    }, (err, res, body) => {

                        clearInterval(feedback);

                        if(err){


                            Util.lineLog("\n");

                            if(err.code == 'ETIMEDOUT'){

                                console.log('@info Aumente o tempo usando --timeout <ms>')

                            }

                            if(opts.show) console.log(err);

                            return reject(err);

                        }

                        if(opts.show) console.log(body);

                        resolve({
                            res: res,
                            body: body
                        });

                    });

                });

            }

            this.resolve = () => {

                let resultFolder = path.join(that.dir, 'doc', 'tests', 'results', opts.type);

                let resultName = new Date().getTime() + '-' + opts.test + '-RESOLVED.json';

                let resultFile = path.join(resultFolder, resultName)

                fs.ensureDirSync(resultFolder);

                let content = '';

                fs.writeJsonSync(resultFile, content);

                console.log(`@cube ${"[RESOLVED]".green} ${opts.type} -> ${opts.test}`);

            }

            this.reject = (errName, additionalData) => {

                let resultFolder = path.join(that.dir, 'doc', 'tests', 'results', opts.type);

                let resultName = new Date().getTime() + '-' + opts.test + '-REJECTED-' + errName + '.json';

                let resultFile = path.join(resultFolder, resultName)

                fs.ensureDirSync(resultFolder);

                fs.writeJsonSync(resultFile, additionalData);

                console.log(`@cube ${"[REJECT]".red} ${opts.type} -> ${opts.test}: ${errName}`);

            }

            return this;
            
        }

        return new cube(info);

    },

    askPass(msg){

        return new Prompt({

            type: 'password',
            message: msg,
            name: 'password'

        }).run();

    },

    spawn(args, dataCallback = () => {}, opts = {}){

        return new Promise((resolve, reject) => {

            let spawn = cp.spawn(args.shift(), args, opts);

            spawn.stdout.on('data', (data) => {

                dataCallback(data.toString(), 'data');

            });

            spawn.stderr.on('data', (data) => {

                dataCallback(data.toString(), 'err');

            });

            spawn.on('exit', resolve);
            spawn.on('error', reject);

        });

    },

    findProject(src){

        let splitted = src.split('/');

        let projectFound = false;

        for(let i = splitted.length; i > 0; i--){

            if(projectFound) continue;

            let iterationPath = "/";

            for(let j = 0; j < i; j++){

                iterationPath = path.join(iterationPath, splitted[j]);

            }

            // Se existir o package.json
            if(fs.existsSync(path.join(iterationPath, 'package.json'))){

                projectFound = iterationPath;
                continue;

            }

            // Se existir o blitz.json
            if(fs.existsSync(path.join(iterationPath, 'blitz.json'))){

                projectFound = iterationPath;
                continue;

            }

        }

        return Promise.resolve(projectFound);

    },

    getSimpleHour: function(unixtime, outputSeconds){

        if(typeof unixtime === 'undefined') unixtime = new Date().getTime();

        if(typeof outputSeconds === 'undefined') outputSeconds = true;

        var date = new Date(unixtime);

        var hour    = date.getHours();
        var minutes = date.getMinutes();
        var seconds = date.getSeconds();

        if(hour < 10){
            hour = '0' + hour;
        }

        if(minutes < 10){
            minutes = '0' + minutes;
        }

        if(seconds < 10){
            seconds = '0' + seconds;
        }

        if(outputSeconds){
            outputSeconds = ':' + seconds;
        } else{
            outputSeconds = '';
        }

        return hour + ':' + minutes + outputSeconds;

    },

    getDbSimpleDate: function(unixtime, db){

        if(typeof unixtime === 'undefined'){
            unixtime = new Date().getTime();
        }

        var date = new Date(unixtime);

        var year  = date.getFullYear();
        var month = date.getMonth() + 1;
        var day   = date.getDate();

        if(month < 10){
            month = '0' + month;
        }

        if(day < 10){
            day = '0' + day;
        }

        var offset = date.getTimezoneOffset() / 60;

        if(offset < 10){
            offset = '0' + offset;
        }

        return year + '-' + month + '-' + day + 'T' + module.exports.getSimpleHour(unixtime) + '-' + offset + ':00';

    },

    getLightDate: function(unixtime, delimiter){

        if(typeof unixtime === 'undefined'){
            unixtime = new Date().getTime();
        }

        if(typeof delimiter === 'undefined'){
            delimiter = '-';
        }

        var date = new Date(unixtime);

        var year  = date.getFullYear();
        var month = date.getMonth() + 1;
        var day   = date.getDate();

        if(month < 10){
            month = '0' + month;
        }

        if(day < 10){
            day = '0' + day;
        }

        var offset = date.getTimezoneOffset() / 60;

        if(offset < 10){
            offset = '0' + offset;
        }

        return day + delimiter + month;

    },

    getSimpleDate: function(unixtime, db){

        if(typeof unixtime === 'undefined'){
            unixtime = new Date().getTime();
        }

        if(typeof db === 'undefined'){

            db = false;

        }

        var date = new Date(Number(unixtime));

        var year  = date.getFullYear();
        var month = date.getMonth() + 1;
        var day   = date.getDate();

        if(month < 10){
            month = '0' + month;
        }

        if(day < 10){
            day = '0' + day;
        }

        var offset = date.getTimezoneOffset() / 60;

        if(offset < 10){
            offset = '0' + offset;
        }

        var middleOne = db?'T':' ';

        return year + '-' + month + '-' + day + middleOne + module.exports.getSimpleHour(unixtime) + '-' + offset + ':00';

    },

    months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
    monthsShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],

    getBeautifulDate: function(unixtime){

        if(typeof unixtime === 'undefined') unixtime = new Date().getTime();

        var date = new Date(Number(unixtime));

        return date.getDate() + ' de ' + module.exports.months[date.getMonth()];

    },

    // @version 2.0
    isToday: function(date){

        date = new Date(date);

        return date.toDateString() === new Date().toDateString();

    },

    simpleDateName: function(name){

        return name + '_' + module.exports.simpleDate();

    },

    simpleDate: function(){

        return module.exports.getSimpleHour(new Date(), false).replace(':', 'h') + '_' + module.exports.getLightDate() + '-' + new Date().getFullYear();

    }

}

module.exports = Util;