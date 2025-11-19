import mongoose from "mongoose";

const { Schema, model, models, ObjectId } = mongoose;

const clientsSchema = new Schema({
    img: { type: String },
    name: { type: String, required: true },
    dni: { type: String, required: true, unique: true },
    phone: { type: Number, required: true, unique: true },
    address: { type: String, required: true },
    count_calls: { type: Number, default: 0 },
    last_rating: { type: Number},
    IdType: { type: ObjectId, required: true, ref: "type" },
})

const clients = models.clients || model('clients', clientsSchema)

export default clients