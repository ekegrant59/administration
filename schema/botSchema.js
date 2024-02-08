const mongoose = require('mongoose')
const mongodb = process.env.MONGODB
mongoose.connect(mongodb)

const botSchema = new mongoose.Schema({
    email: String,
    btcPrice: String,
    time: String,
    amount: Number,
    type: String,
    loss: Boolean
})

module.exports = mongoose.model('bot', botSchema)