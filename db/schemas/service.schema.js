import mongoose from "mongoose";

const {Schema, model, models} = mongoose;

const serviceSchema = new Schema({
name:{type:String, required:true, unique:true}
})

const service = models.recurrence || model('service',serviceSchema )

export default service