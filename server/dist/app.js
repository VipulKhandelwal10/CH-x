"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const cors_1 = __importDefault(require("cors"));
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
// Connect DB
require("./db/connection");
// Import Files
const Users_1 = __importDefault(require("./models/Users"));
const Conversations_1 = __importDefault(require("./models/Conversations"));
const Messages_1 = __importDefault(require("./models/Messages"));
// app Use
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
app.use((0, cors_1.default)());
const port = process.env.PORT || 8000;
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: 'http://localhost:3002',
    }
});
// Socket.io
let users = [];
io.on('connection', (socket) => {
    console.log('User connected', socket.id);
    socket.on('addUser', (userId) => {
        const isUserExist = users.find(user => user.userId === userId);
        if (!isUserExist) {
            const user = { userId, socketId: socket.id };
            users.push(user);
            io.emit('getUsers', users);
        }
    });
    socket.on('sendMessage', (_a) => __awaiter(void 0, [_a], void 0, function* ({ senderId, receiverId, message, conversationId }) {
        const receiver = users.find(user => user.userId === receiverId);
        const sender = users.find(user => user.userId === senderId);
        const user = yield Users_1.default.findById(senderId);
        console.log('sender :>> ', sender, receiver);
        if (receiver) {
            io.to(receiver.socketId).to(sender.socketId).emit('getMessage', {
                senderId,
                message,
                conversationId,
                receiverId,
                user: { id: user === null || user === void 0 ? void 0 : user._id, fullName: user === null || user === void 0 ? void 0 : user.fullName, email: user === null || user === void 0 ? void 0 : user.email }
            });
        }
        else {
            io.to(sender.socketId).emit('getMessage', {
                senderId,
                message,
                conversationId,
                receiverId,
                user: { id: user === null || user === void 0 ? void 0 : user._id, fullName: user === null || user === void 0 ? void 0 : user.fullName, email: user === null || user === void 0 ? void 0 : user.email }
            });
        }
    }));
    socket.on('disconnect', () => {
        users = users.filter(user => user.socketId !== socket.id);
        io.emit('getUsers', users);
    });
});
// Routes
app.get('/', (req, res) => {
    res.send('Welcome');
});
app.post('/api/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fullName, email, password, role } = req.body;
        if (!fullName || !email || !password || !role) {
            return res.status(400).json({ message: 'Please fill all required fields' });
        }
        const isAlreadyExist = yield Users_1.default.findOne({ email });
        if (isAlreadyExist) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        const newUser = new Users_1.default({ fullName, email, password: hashedPassword, role });
        yield newUser.save();
        return res.status(201).json({ message: 'User registered successfully' });
    }
    catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ message: 'Server error during registration' });
    }
}));
app.post('/api/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).send('Please fill all required fields');
        }
        else {
            const user = yield Users_1.default.findOne({ email });
            if (!user) {
                res.status(400).send('User email or password is incorrect');
            }
            else {
                const validateUser = yield bcryptjs_1.default.compare(password, user.password);
                if (!validateUser) {
                    res.status(400).send('User email or password is incorrect');
                }
                else {
                    const payload = {
                        userId: user._id,
                        email: user.email
                    };
                    const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'THIS_IS_A_JWT_SECRET_KEY';
                    jsonwebtoken_1.default.sign(payload, JWT_SECRET_KEY, { expiresIn: 84600 }, (err, token) => __awaiter(void 0, void 0, void 0, function* () {
                        yield Users_1.default.updateOne({ _id: user._id }, {
                            $set: { token }
                        });
                        user.save();
                        return res.status(200).json({ user: { id: user._id, email: user.email, fullName: user.fullName, role: user.role }, token: token });
                    }));
                }
            }
        }
    }
    catch (error) {
        console.log(error, 'Error');
    }
}));
app.post('/api/conversation', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { senderId, receiverId } = req.body;
        const newCoversation = new Conversations_1.default({ members: [senderId, receiverId] });
        yield newCoversation.save();
        res.status(200).send('Conversation created successfully');
    }
    catch (error) {
        console.log(error, 'Error');
    }
}));
app.get('/api/conversations/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.userId;
        const conversations = yield Conversations_1.default.find({ members: { $in: [userId] } });
        const conversationUserData = Promise.all(conversations.map((conversation) => __awaiter(void 0, void 0, void 0, function* () {
            const receiverId = conversation.members.find((member) => member !== userId);
            const user = yield Users_1.default.findById(receiverId);
            return { user: { receiverId: user === null || user === void 0 ? void 0 : user._id, email: user === null || user === void 0 ? void 0 : user.email, fullName: user === null || user === void 0 ? void 0 : user.fullName }, conversationId: conversation._id };
        })));
        res.status(200).json(yield conversationUserData);
    }
    catch (error) {
        console.log(error, 'Error');
    }
}));
app.post('/api/message', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { conversationId, senderId, message, receiverId = '' } = req.body;
        if (!senderId || !message)
            return res.status(400).send('Please fill all required fields');
        if (conversationId === 'new' && receiverId) {
            const newCoversation = new Conversations_1.default({ members: [senderId, receiverId] });
            yield newCoversation.save();
            const newMessage = new Messages_1.default({ conversationId: newCoversation._id, senderId, message });
            yield newMessage.save();
            return res.status(200).send('Message sent successfully');
        }
        else if (!conversationId && !receiverId) {
            return res.status(400).send('Please fill all required fields');
        }
        const newMessage = new Messages_1.default({ conversationId, senderId, message });
        yield newMessage.save();
        res.status(200).send('Message sent successfully');
    }
    catch (error) {
        console.log(error, 'Error');
    }
}));
app.get('/api/message/:conversationId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const checkMessages = (conversationId) => __awaiter(void 0, void 0, void 0, function* () {
            console.log(conversationId, 'conversationId');
            const messages = yield Messages_1.default.find({ conversationId });
            const messageUserData = Promise.all(messages.map((message) => __awaiter(void 0, void 0, void 0, function* () {
                const user = yield Users_1.default.findById(message.senderId);
                return { user: { id: user === null || user === void 0 ? void 0 : user._id, email: user === null || user === void 0 ? void 0 : user.email, fullName: user === null || user === void 0 ? void 0 : user.fullName }, message: message.message };
            })));
            res.status(200).json(yield messageUserData);
        });
        const conversationId = req.params.conversationId;
        if (conversationId === 'new') {
            const checkConversation = yield Conversations_1.default.find({ members: { $all: [req.query.senderId, req.query.receiverId] } });
            if (checkConversation.length > 0) {
                checkMessages(checkConversation[0]._id.toString());
            }
            else {
                return res.status(200).json([]);
            }
        }
        else {
            checkMessages(conversationId);
        }
    }
    catch (error) {
        console.log('Error', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
server.listen(port, () => {
    console.log('listening on port ' + port);
});
exports.default = app;
