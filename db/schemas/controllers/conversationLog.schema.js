import mongoose from "mongoose";

const { Schema, model, models, Date } = mongoose;

const conversationLogSchema = new Schema({
    phone: { type: String, required: true, index: true }, 
    direction: { type: String, enum: ['INBOUND', 'OUTBOUND'], required: true }, 
    messageContent: { type: String, required: true },
    conversationState: { type: String },
    timestamp: { type: Date, default: Date.now },
});

const ConversationLog = models.ConversationLog || model('ConversationLog', conversationLogSchema);

export default ConversationLog;