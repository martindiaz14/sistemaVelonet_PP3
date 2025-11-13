import mongoose from "mongoose";

const {Schema, model, models} = mongoose;

const employeeSchema = new Schema({
name:{type:String, required:true},
mail:{type:String, required:true, unique:true},
phone:{type:Number, required:true, unique:true},

})

const employees = models.employees || model('employees',employeeSchema )

export default employees