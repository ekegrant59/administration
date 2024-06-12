const mongoose = require('mongoose')
const mongodb = process.env.MONGODB
mongoose.connect(mongodb)

const kycSchema = new mongoose.Schema({
    front: String,
    back: String,
    idtype: String,
    country: String,
    fullname: String,
    status: String
})

module.exports = mongoose.model('kyc', kycSchema)