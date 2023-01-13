const conf = require('../conf')
const mongoose = require('mongoose');

const db = mongoose
    .connect(conf.db)
    .then(async () => {
        console.log("Successfully connected to database");
    })
    .catch((error) => {
        console.log("database connection failed. exiting now...");
        console.error(error);
        process.exit(1);
    });

const r = async () => {
    db.Sequence = require('./sequence')(mongoose)
    db.Log = require('./log')(mongoose)
    return db
}

r();

module.exports = db;
