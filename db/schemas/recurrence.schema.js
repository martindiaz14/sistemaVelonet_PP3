import mongoose from "mongoose";

const {Schema, model, models} = mongoose;

const recurrenceSchema = new Schema({
name:{type:String, required:true, unique:true}
})

const recurrence = models.recurrence || model('recurrence',recurrenceSchema )

export default recurrence