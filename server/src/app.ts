import express, { Request, Response, NextFunction } from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import mongoose from 'mongoose';

// Connect DB
import './db/connection';

// Import Files
import Users from './models/Users';
import Conversations from './models/Conversations';
import Messages from './models/Messages';

// app Use
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

const port = process.env.PORT || 8000;

const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: 'http://localhost:3002',
    }
});

// Socket.io
let users: any[] = [];
io.on('connection', (socket) => {
    console.log('User connected', socket.id);
    socket.on('addUser', (userId: string) => {
        const isUserExist = users.find(user => user.userId === userId);
        if (!isUserExist) {
            const user = { userId, socketId: socket.id };
            users.push(user);
            io.emit('getUsers', users);
        }
    });

    socket.on('sendMessage', async ({ senderId, receiverId, message, conversationId }: { senderId: string, receiverId: string, message: string, conversationId: string }) => {
        const receiver = users.find(user => user.userId === receiverId);
        const sender = users.find(user => user.userId === senderId);
        const user = await Users.findById(senderId);
        console.log('sender :>> ', sender, receiver);
        if (receiver) {
            io.to(receiver.socketId).to(sender.socketId).emit('getMessage', {
                senderId,
                message,
                conversationId,
                receiverId,
                user: { id: user?._id, fullName: user?.fullName, email: user?.email }
            });
        } else {
            io.to(sender.socketId).emit('getMessage', {
                senderId,
                message,
                conversationId,
                receiverId,
                user: { id: user?._id, fullName: user?.fullName, email: user?.email }
            });
        }
    });

    socket.on('disconnect', () => {
        users = users.filter(user => user.socketId !== socket.id);
        io.emit('getUsers', users);
    });
});

// Routes
app.get('/', (req: Request, res: Response) => {
    res.send('Welcome');
});

app.post('/api/register', async (req: Request, res: Response) => {
    try {
        const { fullName, email, password, role } = req.body;

        if (!fullName || !email || !password || !role) {
            return res.status(400).json({ message: 'Please fill all required fields' });
        }

        const isAlreadyExist = await Users.findOne({ email });
        if (isAlreadyExist) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcryptjs.hash(password, 10);
        const newUser = new Users({ fullName, email, password: hashedPassword, role });
        await newUser.save();

        return res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ message: 'Server error during registration' });
    }
});

app.post('/api/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).send('Please fill all required fields');
        } else {
            const user = await Users.findOne({ email });
            if (!user) {
                res.status(400).send('User email or password is incorrect');
            } else {
                const validateUser = await bcryptjs.compare(password, user.password);
                if (!validateUser) {
                    res.status(400).send('User email or password is incorrect');
                } else {
                    const payload = {
                        userId: user._id,
                        email: user.email
                    }
                    const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'THIS_IS_A_JWT_SECRET_KEY';

                    jwt.sign(payload, JWT_SECRET_KEY, { expiresIn: 84600 }, async (err, token) => {
                        await Users.updateOne({ _id: user._id }, {
                            $set: { token }
                        })
                        user.save();
                        return res.status(200).json({ user: { id: user._id, email: user.email, fullName: user.fullName, role: user.role }, token: token })
                    })
                }
            }
        }

    } catch (error) {
        console.log(error, 'Error')
    }
});

app.post('/api/conversation', async (req: Request, res: Response) => {
    try {
        const { senderId, receiverId } = req.body;
        const newCoversation = new Conversations({ members: [senderId, receiverId] });
        await newCoversation.save();
        res.status(200).send('Conversation created successfully');
    } catch (error) {
        console.log(error, 'Error')
    }
});

app.get('/api/conversations/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const conversations = await Conversations.find({ members: { $in: [userId] } });
        const conversationUserData = Promise.all(conversations.map(async (conversation) => {
            const receiverId = conversation.members.find((member) => member !== userId);
            const user = await Users.findById(receiverId);
            return { user: { receiverId: user?._id, email: user?.email, fullName: user?.fullName }, conversationId: conversation._id }
        }))
        res.status(200).json(await conversationUserData);
    } catch (error) {
        console.log(error, 'Error')
    }
})

app.post('/api/message', async (req: Request, res: Response) => {
    try {
        const { conversationId, senderId, message, receiverId = '' } = req.body;
        if (!senderId || !message) return res.status(400).send('Please fill all required fields')
        if (conversationId === 'new' && receiverId) {
            const newCoversation = new Conversations({ members: [senderId, receiverId] });
            await newCoversation.save();
            const newMessage = new Messages({ conversationId: newCoversation._id, senderId, message });
            await newMessage.save();
            return res.status(200).send('Message sent successfully');
        } else if (!conversationId && !receiverId) {
            return res.status(400).send('Please fill all required fields')
        }
        const newMessage = new Messages({ conversationId, senderId, message });
        await newMessage.save();
        res.status(200).send('Message sent successfully');
    } catch (error) {
        console.log(error, 'Error')
    }
});

interface IConversationDocument extends Document {
    _id: mongoose.Types.ObjectId;
    members: string[];
  }

  app.get('/api/message/:conversationId', async (req: Request, res: Response) => {
    try {
        const checkMessages = async (conversationId: string) => {
            console.log(conversationId, 'conversationId')
            const messages = await Messages.find({ conversationId });
            const messageUserData = Promise.all(messages.map(async (message) => {
                const user = await Users.findById(message.senderId);
                return { user: { id: user?._id, email: user?.email, fullName: user?.fullName }, message: message.message }
            }));
            res.status(200).json(await messageUserData);
        }
        const conversationId = req.params.conversationId;
        if (conversationId === 'new') {
            const checkConversation = await Conversations.find({ members: { $all: [req.query.senderId, req.query.receiverId] } }) as IConversationDocument[];
            if (checkConversation.length > 0) {
                checkMessages(checkConversation[0]._id.toString());
            } else {
                return res.status(200).json([])
            }
        } else {
            checkMessages(conversationId);
        }
    } catch (error) {
        console.log('Error', error)
        res.status(500).json({ message: 'Internal server error' });
    }
});

server.listen(port, () => {
    console.log('listening on port ' + port);
});

export default app;