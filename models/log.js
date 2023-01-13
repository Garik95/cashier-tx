module.exports = (mongoose) => {
    const schema = new mongoose.Schema({
        uuid: String,
        request: Object,
        response: Object,
        success: Boolean,
        createdAt: {
            type: Date,
            default: () => Date.now()
        }
    })

    // schema.loadClass(objectClass)
    schema.pre('save', function (next) {
        next()
    })
    return mongoose.model('Log', schema)
}