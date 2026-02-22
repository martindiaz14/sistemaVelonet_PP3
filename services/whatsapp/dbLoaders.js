import clients from "../../db/schemas/clients.schema.js";
import types from "../../db/schemas/type.schema.js"; 
import Recurrence from "../../db/schemas/recurrence.schema.js"; 
import Employee from "../../db/schemas/employees.schema.js"; 
import Services from "../../db/schemas/service.schema.js"; 
import mongoose from "mongoose";

export let CLAIM_TYPE_OPTIONS = {};
export let RECURRENCE_OPTIONS = {};
export let SERVICES_OPTIONS = {};

export async function loadClaimTypeOptions() {
    try {
        const claimstypes = await types.find({});
        CLAIM_TYPE_OPTIONS = claimstypes.reduce((acc, type, index) => {
            acc[(index + 1).toString()] = { label: type.name, id: type._id.toString() };
            return acc;
        }, {});
        console.log("✅ Tipos de Reclamo cargados.");
    } catch (error) {
        console.error("❌ Error al cargar los tipos de reclamo:", error);
        throw new Error("Fallo la carga de opciones.");
    }
}

export async function loadRecurrenceOptions() {
    try {
        const recurrences = await Recurrence.find({});
        RECURRENCE_OPTIONS = recurrences.reduce((acc, rec, index) => {
            acc[(index + 1).toString()] = { label: rec.name, id: rec._id.toString() };
            return acc;
        }, {});
        console.log("✅ Opciones de Recurrencia cargadas.");
    } catch (error) {
        console.error("❌ Error al cargar las recurrencias:", error);
        throw new Error("Fallo la carga de opciones.");
    }
}

export async function loadServicesOptions() {
    try {
        const service = await Services.find({});
        SERVICES_OPTIONS = service.reduce((acc, rec, index) => {
            acc[(index + 1).toString()] = { label: rec.name, id: rec._id.toString() };
            return acc;
        }, {});
        console.log("✅ Opciones de Servicios cargadas.");
    } catch (error) {
        console.error("❌ Error al cargar las Servicios:", error);
        throw new Error("Fallo la carga de opciones.");
    }
}

export async function selectRandomEmployeeId() {
    try {
        const allEmployees = await Employee.find({});
        if (allEmployees.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * allEmployees.length);
        const randomEmployee = allEmployees[randomIndex];
        console.log(`✅ Empleado aleatorio seleccionado: ${randomEmployee.name}`);
        return randomEmployee._id;
    } catch (error) {
        console.error("❌ Error al seleccionar un empleado aleatorio:", error);
        return null;
    }
}