module.exports = (mongoose) => {
    const schema = new mongoose.Schema({
        TRANSACTION_ID: Number,
        BY: Number
    })

    // schema.loadClass(objectClass)
    schema.pre('save', function (next) {
        next()
    })
    return mongoose.model('Sequence', schema)
}