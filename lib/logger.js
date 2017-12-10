const log4js = require('log4js');

const getLogger = (module) => {
    return log4js.getLogger(module);
};

module.exports = {
    getLogger
};