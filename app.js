const express = require('express');
const app = express();
const path = require("path")
const userModel = require('./models/user');
const postModel = require('./models/posts')
const jwt = require("jsonwebtoken")
const bcrypt = require('bcrypt')
const cookieParser = require('cookie-parser')

app.use(cookieParser())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')))
app.set("view engine", "ejs");

app.get('/', (req, res) => {
    res.render('register')
})

// Registration route
app.post('/register', async (req, res) => {
    try {
        const { name, email, password, image, username } = req.body;
        let user = await userModel.findOne({ email });
        if (user) {
            return res.status(400).send("Email already registered");
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await userModel.create({
            name,
            email,
            image,
            username,
            password: hashedPassword
        });
        const token = jwt.sign({ email, id: newUser._id }, process.env.JWT_SECRET);
        res.cookie('token', token);
        res.redirect(`/profile/${newUser._id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});


app.get('/login', (req, res) => {
    res.render('login')
})
// Login route
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(400).send("Invalid email or password");
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(400).send("Invalid email or password");
        }
        const token = jwt.sign({ email, id: user._id }, process.env.JWT_SECRET);
        res.cookie('token', token);
        res.redirect(`/profile/${user._id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});




app.get('/profile/:id', isLoggedIn, async (req, res) => {
    try {
        const user = await userModel.findById(req.params.id);
        if (!user) {
            return res.status(404).send("User not found");
        }
        const userPosts = await postModel.find({ user: user._id });
        res.render('profile', { user, posts: userPosts });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});



app.get('/create-post', isLoggedIn, (req, res) => {
    res.render('create-post')
})


// Create post route
app.post('/create-post', isLoggedIn, async (req, res) => {
    try {
        const user = await userModel.findOne({ email: req.user.email });
        const { title, image, details } = req.body;

        // Preserve newline characters in the 'details' field
        const content = details.replace(/\r\n|\r|\n/g, "<br>");

        const post = await postModel.create({
            title,
            image,
            content, // Use the processed content
            user: user.id
        });

        if (!user.posts) {
            user.posts = [];
        }

        user.posts.push(post._id);
        await user.save();
        res.redirect(`/profile/${user._id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});


// Logout route
app.get('/logout', (req, res) => {
    res.clearCookie("token");
    res.redirect('/login');
});



// Route to display a dedicated post
app.get('/post/:id', async (req, res) => {
    try {
        const post = await postModel.findById(req.params.id);
        if (!post) {
            return res.status(404).send('Post not found');
        }
        res.render('post', { post });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});


// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).send("Unauthorized");
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error(error);
        res.status(401).send("Unauthorized");
    }
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});