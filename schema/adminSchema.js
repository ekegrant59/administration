const mongoose = require('mongoose')
const mongodb = process.env.MONGODB
mongoose.connect(mongodb)

const adminSchema = new mongoose.Schema({
    email: String,
    password: String
})

module.exports = mongoose.model('admin', adminSchema)