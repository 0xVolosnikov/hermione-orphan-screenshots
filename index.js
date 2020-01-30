'use strict';
const parseConfig = require('./config');
const util = require('util');
const readDir = util.promisify(require('fs').readdir);
const exists = util.promisify(require('fs').exists);
const lstat = util.promisify(require('fs').lstat);
const unlink = util.promisify(require('fs').unlink);
const rmdir = util.promisify(require('fs').rmdir);
const { getShortMD5 } = require('hermione/lib/utils/crypto');
const path = require('path');

/**
 * @param directoryPath
 * @param orphans
 */
async function scanDirectory(directoryPath, orphans) {
    let files = [];
    const dirElements = await readDir(directoryPath);

    for (let i = 0; i < dirElements.length; i++) {
        if (orphans.includes(dirElements[i])) {
            continue;
        }

        if (dirElements[i].endsWith('.png')) {
            files.push({ name: dirElements[i], path: directoryPath });
        } else {
            const subfiles = await scanDirectory(path.resolve(directoryPath, dirElements[i]), orphans);
            files = files.concat(subfiles);
        }
    }

    return files;
}

/**
 * @param {string} text
 * @param {string} color
 */
function color(text, color) {
    const end = '\x1b[39m';
    switch (color) {
        case 'red':
            return '\x1b[31m' + text + end;
        case 'yellow':
            return '\x1b[33m' + text + end;
        case 'green':
            return '\x1b[32m' + text + end;
    }
}

/**
 * @param {Object} hermione
 * @param {Object} options
 */
module.exports = async(hermione, options) => {
    const config = parseConfig(options);
    if (!config.enabled) {
        return;
    }

    const dirsWithScreenshots = await readDir(hermione._config.screenshotsDir);

    /**
     * @param path
     */
    async function deleteFolderRecursive(path) {
        if (await exists(path)) {
            const files = await readDir(path);
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const curPath = path + '/' + file; // TODO
                if ((await (lstat(curPath))).isDirectory()) {
                    await deleteFolderRecursive(curPath);
                } else {
                    await unlink(curPath);
                }
            }
            await rmdir(path);
        }
    }

    /**
     * @param array
     * @param actualScreenshots
     */
    function checkCases(array, actualScreenshots) {
        let res = '';
        const uniqueArray = [];
        let isCaseReplaced = false;
        for (let i = 0; i < array.length; i++) {
            const actualScreenshotIndex = actualScreenshots.findIndex((x) => x.name === array[i]);
            let actualDirectory;
            if (actualScreenshotIndex !== -1) {
                const actualScreen = actualScreenshots[actualScreenshotIndex];
                actualDirectory = actualScreen.path.replace(path.resolve(hermione._config.screenshotsDir), '')
                    .replace(array[i], '');
                actualDirectory = actualDirectory.substr(1, 7);
                isCaseReplaced = true;
            }

            array[i] = array[i].replace('.png', '');
            if (!uniqueArray.includes(array[i])) {
                uniqueArray.push(array[i]);
                res += '( ' + array[i] + ' ' + (actualDirectory ? color(' new ' + actualDirectory, 'green') : '') + ')  ';
            }
        }
        return { message: res, isReplaced: isCaseReplaced };
    }

    hermione.on(hermione.events.AFTER_TESTS_READ, async(collection) => {
        const specs = collection._specs;

        for (const browserSet in specs) {
            if (specs.hasOwnProperty(browserSet)) {
                for (let i = 0; i < specs[browserSet].length; i++) {
                    const test = specs[browserSet][i];
                    const id = getShortMD5(test.fullTitle());
                    if (dirsWithScreenshots.includes(id)) {
                        dirsWithScreenshots.splice(dirsWithScreenshots.indexOf(id), 1);
                    }
                }
            }
        }
    });

    hermione.on(hermione.events.BEGIN, async() => {
        const replacedCases = [];
        if (dirsWithScreenshots.length > 0) {
            const actualScreenshots = await scanDirectory(hermione._config.screenshotsDir, dirsWithScreenshots);

            const messages = [];

            for (let i = 0; i < dirsWithScreenshots.length; i++) {
                const scrPath = path.resolve(hermione._config.screenshotsDir, dirsWithScreenshots[i]);
                const sets = await readDir(scrPath);

                let cases = [];
                for (let setNum = 0; setNum < sets.length; setNum++) {
                    cases = cases.concat(await readDir(path.resolve(scrPath, sets[setNum])));
                }
                const { message, isReplaced } = checkCases(cases, actualScreenshots);
                messages.push(dirsWithScreenshots[i] + ' - ' + message);

                if (isReplaced) {
                    replacedCases.push(dirsWithScreenshots[i]);
                }
            }

            console.log(color(' Orphan screenshots (' + dirsWithScreenshots.length + '):', 'yellow'));
            console.log(color('--------------------------', 'yellow'));
            for (let i = 0; i < messages.length; i++) {
                console.log(messages[i]);
            }
            console.log(color('--------------------------', 'yellow'));

            if (config.autoremoveAll) {
                for (let i = 0; i < dirsWithScreenshots.length; i++) {
                    await deleteFolderRecursive(path.resolve(hermione._config.screenshotsDir, dirsWithScreenshots[i]));
                }
                console.log(color('All orphan screenshots removed', 'red'));
            } else if (config.autoremove && replacedCases.length > 0) {
                for (let i = 0; i < replacedCases.length; i++) {
                    await deleteFolderRecursive(path.resolve(hermione._config.screenshotsDir, replacedCases[i]));
                }
                console.log(color('Only replaced orphan screenshots removed', 'red'));
            }
        }
    });
};
