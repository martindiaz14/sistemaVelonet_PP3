import mongoose from "mongoose";

const {Schema, model, models} = mongoose;

const typeSchema = new Schema({
name:{type:String, required:true, unique:true}
})

const type = models.type || model('type',typeSchema )

export default type