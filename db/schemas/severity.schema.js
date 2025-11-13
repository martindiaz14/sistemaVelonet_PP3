import mongoose from "mongoose";

const {Schema, model, models} = mongoose;

const severitySchema = new Schema({
name:{type:String, required:true, unique:true}
})

const severity = models.severity || model('severity',severitySchema )

export default severity