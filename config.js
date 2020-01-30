'use strict';

const { root, section, option } = require('gemini-configparser');

const ENV_PREFIX = 'hermione_orphan-screenshots_';
const CLI_PREFIX = '--hermione-orphan-screenshots-';

const assertType = (type, name) => (value) => {
    if (value && typeof value !== type) {
        throw new Error(`"${name}" must be a ${type}`);
    }
};

const getParser = () => {
    return root(section({
        enabled: option({
            defaultValue: true,
            validate: assertType('boolean', 'enabled')
        }),
        autoremove: option({
            defaultValue: false,
            validate: assertType('boolean', 'autoremove')
        }),
        autoremoveAll: option({
            defaultValue: false,
            validate: assertType('boolean', 'autoremoveAll')
        }),

    }), { envPrefix: ENV_PREFIX, cliPrefix: CLI_PREFIX });
};

module.exports = (options) => {
    const { env, argv } = process;

    return getParser()({ options, env, argv });
};
