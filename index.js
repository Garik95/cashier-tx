const db = require('./models')
const { errorMSG, successMSG } = require('./components/responseForm')
const {
    v4: uuid
} = require('uuid');
const express = require("express");
const moment = require('moment');
const axios = require('axios');
const cors = require("cors");
const { readFile, writeFile } = require('fs/promises');
var app = express();

var sequencePath = __dirname + '/sequence.json'
var axiosURL = 'http://10.10.12.99:8200'
// var seq = fs.readFileSync(__dirname + '/sequence.json');
var seq = 0
// var cert = fs.readFileSync(__dirname + '/certs/cer.pem');
app.use(cors())
// parse requests of content-type - application/json
app.use(express.json({
    limit: '50mb'
}));

// parse requests of content-type - application/x-www-form-urlencoded
app.use(
    express.urlencoded({
        extended: true,
    })
);

var uid;
app.use('*', async (req, res, next) => {
    try {
        uid = uuid()
        req.headers.uuid = typeof req.headers.uuid == 'undefined' ? uid : req.headers.uuid
        // const mongoose = require('mongoose');
        // mongoose.set('debug', async function (coll, method, query, doc, options) {
        //     var exceptionMethods = ['find', 'findone']
        //     //do your thing
        //     if (!exceptionMethods.includes(method.toLowerCase())) {
        //         req.headers.mongoMethod = method
        //         process.stdout.write(JSON.stringify({
        //             timestamp: moment().unix(),
        //             uuid: uid,
        //             coll,
        //             method,
        //             query,
        //             doc,
        //             options
        //         }) + '\n')
        //     }
        // });
        next()
    } catch (e) {
        console.log(e);
    }
})

app.post('/', async (req, res) => {
    var ids = []
    try {
        if (Object.keys(req.body).includes('process') && Object.keys(req.body).includes('data')) {
            if (Array.isArray(req.body.data)) {
                var items = req.body.data
                var process = req.body.process
                for (var i = 0; i < items.length; i++) {
                    var item = items[i]
                    var { MFO_DT, ACCOUNT_DT, MFO_CR, ACCOUNT_CR, NUM_DOC } = item
                    if (process == 'sequental') {
                        var { accountName, txId, invoice } = await prepareTx({ branch: MFO_CR, account: ACCOUNT_CR, invoice: NUM_DOC }).then(r => r)
                        item['NAME_CR'] = accountName
                        item['TRANSACTION_ID'] = txId
                        item['NUM_DOC'] = invoice
                        var { success, id, msg } = await commitTx(item).then(r => r)
                        ids.push({ branch: MFO_DT, id })
                    }
                    if (i == items.length - 1) {
                        // success
                        // res.send('ok')
                        successMSG(req, res, 'ok')
                    }
                }
            } else {
                // res.send('data is not array')
                errorMSG(req, res, 'data is not array')
            }
        } else {
            // res.send('provided structure does not compatible!')
            errorMSG(req, res, 'provided structure does not compatible!')
        }
    } catch (e) {
        var err = typeof e == 'string' ? e : JSON.stringify(e)
        if (ids.length)
            for (var i = 0; i < ids.length; i++) {
                var { branch, id } = ids[i]
                await rollback({ branch, id }).then(r => r)
                if (i == ids.length - 1) {
                    // res.send({ success: false, msg: `An error occured while processing! ${err}`, })
                    errorMSG(req, res, err)

                }
            }
        else {
            // res.send({ success: false, msg: `An error occured while processing! ${err}`, })
            errorMSG(req, res, err)
        }
    }
})

async function getAccountName(obj) {
    return new Promise((resolve, reject) => {
        var { branch, account } = obj
        axios.get(`${axiosURL}/account/name?branch=${branch}&account=${account}`).then(resp => {
            if (resp.data.length) {
                var { data: [item] } = resp
                resolve(item.name)
            } else {
                reject("Account not found")
            }
        }).catch(e => {
            reject(e)
        })
    })
}

async function prepareTx(obj) {
    return new Promise(async (resolve, reject) => {
        try {
            var { branch, account, invoice } = obj;
            if (typeof branch !== 'undefined' && typeof account !== 'undefined') {
                resolve({ accountName: await getAccountName({ branch, account }).then(r => r), txId: await incr().then(r => r), invoice: typeof invoice == 'undefined' ? 'getInvoice' : invoice })
            } else {
                reject('branch or account undefined!')
            }
        }
        catch (e) {
            reject(e)
        }
    })
}

async function commitTx(obj) {
    return new Promise((resolve, reject) => {
        axios.post(`${axiosURL}/transaction`, obj).then(r => {
            var response = JSON.parse(r.data)
            var { result, docid, resultnote } = response
            if (result == '1') {
                resolve({ success: true, id: docid, msg: resultnote })
            } else {
                reject({ success: false, id: null, msg: JSON.stringify(resultnote) })
            }
        }).catch(e => {
            reject(e)
        })
    })
}

async function rollback(obj) {
    return new Promise((resolve, reject) => {
        var { branch, id } = obj
        axios.delete(`${axiosURL}/transaction`, { data: { TRANSACTION_ID: id, BRANCH: branch } }).then(r => {
            resolve({ success: true, data: { branch, id }, message: '' })
        }).catch(e => {
            console.log(e);
            reject({ success: false, data: {}, message: e })
        })
    })
}

async function incr() {
    return new Promise((resolve, reject) => {
        try {
            const { Sequence } = require('./models')
            Sequence.findOne().then(r => {
                var { TRANSACTION_ID, BY } = r
                Sequence.findOneAndUpdate({}, { $set: { TRANSACTION_ID: TRANSACTION_ID + BY } }, { new: true }).then(newObj => {
                    resolve(newObj.TRANSACTION_ID)
                })
            })
        } catch (e) {
            reject(e)
        }
    })
}

// set port, listen for requests
const PORT = process.env.PORT || 67;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});