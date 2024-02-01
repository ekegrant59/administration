const mongoose = require('mongoose')
const mongodb = process.env.MONGODB
mongoose.connect(mongodb)

const withdrawSchema = new mongoose.Schema({
    name: String,
    email: String,
    address: String,
    amount: Number,
    coin: String,
    status: String,
    date: String
})

module.exports = mongoose.model('withdraw', withdrawSchema)