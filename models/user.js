const mongoose = require('mongoose')

mongoose.connect(process.env.MONGODB_URL);


const userSchema = mongoose.Schema({
        name: String,
        username: String,
        email: String,
        password: String,
        image: String,
        posts: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "posts"
        }]
})


module.exports = mongoose.model('user', userSchema)