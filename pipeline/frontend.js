const express = require('express');
const path    = require('path');
const fs      = require('fs-extra');

const puppeteer     = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

let Util = require('../util.js');

module.exports = {

    setup(program){

        program.option('-f, --frontend [testName]', 'Run a frontend test');

        return module.exports;

    },

    // Isso deve permitir que uma api teste um front end real, assim como apenas usar as requisições para
    // simular ações de um front end real

    browsers: {},
    page: null,
    browser: null,
    socket: null,

    newTab(info){

        if(typeof info._userdata === 'undefined'){
            info._userdata = 'random';
        }

        let newTab = null;

        let groupPath = info.testFolder;

        fs.ensureDirSync(path.join(groupPath, 'userdata'));

        let obj = {

            headless: false,
            ignoreHTTPSErrors: true,
            userDataDir: path.join(groupPath, 'userdata', info._userdata),

            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',

            ]

        }

        // let testPath    = path.join(groupPath, test);
        let preloadPath = path.join(groupPath, 'preload.js');

        fs.ensureFileSync(preloadPath);

        if(info.headless) obj.headless = true;

        if(process.env.EXECUTABLE_PATH){

            obj.executablePath = process.env.EXECUTABLE_PATH;

        }

        return puppeteer.launch(obj).then(browser => {

            module.exports.browser = browser;

            const context = browser.defaultBrowserContext();

            if(!module.exports.browsers[info._userdata]){
                module.exports.browsers[info._userdata] = [];
            }

            module.exports.browsers[info._userdata].push(browser);

            return browser.newPage().then(page => {

                newTab = page;

                page.on('close', function(){

                    browser.close();

                });

                return newTab.evaluateOnNewDocument(fs.readFileSync(preloadPath, 'utf8'));

            }).then(() => {

                return {
                    tab: newTab,
                    browser: browser
                }

            }).catch(async e => {

                await browser.close();

                console.log(e);

                if(module.exports.browsers[info._userdata]){

                    module.exports.browsers[info._userdata].forEach(browser => {
                        browser.close();
                    });

                }

                return Promise.reject(e);

            });

        });

    },

    async start(group, test, url, info){

        if(typeof info._userdata === 'undefined'){
            info._userdata = 'random';
        }

        let newTab = null;

        let groupPath = path.join(info.project.finalPath, 'doc', 'tests');

        fs.ensureDirSync(path.join(groupPath, 'userdata'));

        let obj = {

            headless: false,
            ignoreHTTPSErrors: true,
            userDataDir: path.join(groupPath, 'userdata', info._userdata),

            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',

            ]

        }

        let testPath    = path.join(groupPath, test);
        let preloadPath = path.join(groupPath, 'preload.js');

        fs.ensureFileSync(preloadPath);

        if(process.env.HEADLESS == 'true'){

            obj.headless = true;

        }

        if(process.env.EXECUTABLE_PATH){

            obj.executablePath = process.env.EXECUTABLE_PATH;

        }

        if(!url) return Promise.reject('No URL');

        return puppeteer.launch(obj).then(browser => {

            module.exports.browser = browser;

            const context = browser.defaultBrowserContext();

            if(!module.exports.browsers[info._userdata]){
                module.exports.browsers[info._userdata] = [];
            }

            module.exports.browsers[info._userdata].push(browser);

            return context.overridePermissions(url, ['geolocation', 'notifications']).then(() => {

                return browser.newPage();

            }).then(page => {

                newTab = page;

                page.on('close', function(){

                    browser.close();

                });

                return newTab.evaluateOnNewDocument(fs.readFileSync(path.join(__dirname, 'default.preload.js'), 'utf8'));

            }).then(() => {

                return newTab.evaluateOnNewDocument(fs.readFileSync(preloadPath, 'utf8'));

            }).then(() => {

                return require(testPath)(newTab, url, info._userdata, info);

            }).then(async data => {

                await browser.close();

                // // Impede que exista cache no require
                delete require.cache[require.resolve(testPath)];

                return data;

            }).catch(async e => {

                await browser.close();

                // Impede que exista cache no require
                delete require.cache[require.resolve(testPath)];

                if(module.exports.browsers[info._userdata]){

                    module.exports.browsers[info._userdata].forEach(browser => {
                        browser.close();
                    });

                }

                return Promise.reject(e);

            });

        });

    },

    async run(testName, opts, folder){

        let runAll = false;

        if(!testName) runAll = true;

        if(!folder){

            let frontEndTestPath = path.join(process.cwd(), 'doc', 'tests', 'frontend', testName);

            if(!fs.existsSync(frontEndTestPath)){

                return console.log(`@error É requerido a pasta doc/tests/frontend/${testName}`);

            }

            folder = frontEndTestPath;

        }

        let tests = await fs.readdir(folder);

        Util.forEachPromise(tests, test => {

            if(test == 'preload.js') return Promise.resolve();
            if(test == 'userdata') return Promise.resolve();

            let testPath = path.join(folder, test, test);

            delete require.cache[require.resolve(testPath)];

            let browser = null;

            return module.exports.newTab({
                test: test,
                testFolder: folder
            }).then(window => {

                browser = window.browser;

                let env = Util.getEnv();

                return require(testPath)(window.tab, browser, env);

            }).then(() => {

                browser.close();

            })

        });

    },

    examples: {

        "sample-test": `

module.exports = (tab, browser, env) => {

    return new Promise((resolve, reject) => {

        setTimeout(reject, 5000);

    });

}

`,

    },

    create(obj){

        console.log('@info Creating a cube front end test named ' + obj.name.green);

        let finalPath = path.resolve(process.cwd(), obj.path);

        obj.path = finalPath;

        let testsPath = path.join(obj.path, 'doc', 'tests', 'frontend', obj.name);
        let testPath  = path.join(testsPath, obj.name + '.js');

        if(!fs.existsSync(testsPath)) fs.ensureDirSync(testsPath);

        if(fs.existsSync(testPath)){

            console.log('@info Abrindo existente', testPath);

        } else{

            fs.writeFileSync(testPath, module.exports.examples["sample-test"].trim(), 'utf-8');

        }

        Util.spawn(['subl', testsPath]);

    }

}