import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const messageEntrySchema = new Schema({
    direction: { type: String, enum: ['INBOUND', 'OUTBOUND'], required: true },
    content: { type: String, required: true },
    state: { type: String },
    timestamp: { type: Date, default: Date.now },
}, { _id: false });

const chatSessionSchema = new Schema({
    phone: { type: String, required: true, index: true, unique: true }, 
    status: { type: String, default: 'ACTIVE' },
    messages: [messageEntrySchema],
    lastActivity: { type: Date, default: Date.now }
});

const chatSession = models.chatSession || model('chatLogs', chatSessionSchema);

export default chatSession;