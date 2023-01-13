// const logger = require('../middleware/customLogger')
const { Log } = require('../models')

exports.successMSG = (req, res, data) => {
    // logger(res, data, 'success')
    Log.create({ uuid: req.headers.uuid, request: req.body, response: data, success: true }).then(r => r)
    return res.status(200).send({
        success: true,
        data,
        // uuid: req.headers.uuid,
        message: 'success'
    })
}

exports.errorMSG = (req, res, data) => {
    // logger(res, data, 'error')
    Log.create({ uuid: req.headers.uuid, request: req.body, response: data, success: false }).then(r => r)
    return res.status(404).send({
        success: false,
        data: 'An error occured!',
        // uuid: req.headers.uuid,
        message: data
    })
}