import mongoose, { Document, Schema } from 'mongoose';

interface IMessage extends Document {
    conversationId: string;
    senderId: string;
    message: string;
}

const messageSchema: Schema = new Schema({
    conversationId: {
        type: String,
    },
    senderId: {
        type: String
    },
    message: {
        type: String
    }
});

const Messages = mongoose.model<IMessage>('Message', messageSchema);

export default Messages;