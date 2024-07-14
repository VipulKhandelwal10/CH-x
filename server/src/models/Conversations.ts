import mongoose, { Document, Schema } from 'mongoose';

interface IConversation extends Document {
    members: string[];
}

const conversationSchema: Schema = new Schema({
    members: {
        type: [String],
        required: true,
    }
});

const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);

export default Conversation;