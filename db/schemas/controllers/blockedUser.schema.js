import mongoose from "mongoose";

const { Schema, model, models, Date } = mongoose;

const blockedUserSchema = new Schema({
    phone: { type: String, required: true, unique: true }, 
    unblockDate: { type: Date, required: true },
    reason: { type: String, default: 'Lenguaje ofensivo' },
});

const BlockedUser = models.BlockedUser || model('blockeduser', blockedUserSchema);

export default BlockedUser;