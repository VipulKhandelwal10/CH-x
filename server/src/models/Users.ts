import mongoose, { Document, Schema } from 'mongoose';

interface IUser extends Document {
    fullName: string;
    email: string;
    password: string;
    token?: string;
    role: 'student' | 'expert';
}

const userSchema: Schema = new Schema({
    fullName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    token: {
        type: String
    },
    role: {
        type: String,
        enum: ['student', 'expert'],
        required: true
    }
});

const Users = mongoose.model<IUser>('User', userSchema);

export default Users;