"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDriverLocationHistoryTable = createDriverLocationHistoryTable;
const util_1 = require("../util");
function createDriverLocationHistoryTable() {
    return __awaiter(this, void 0, void 0, function* () {
        const createDriverLocationHistoryTableQuery = `
    CREATE TABLE IF NOT EXISTS driver_location_history (
        id SERIAL PRIMARY KEY,
        driver_id INTEGER REFERENCES drivers(id),
        latitude DECIMAL(10, 7),
        longitude DECIMAL(10, 7),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        accuracy DECIMAL(10, 2),
        heading INTEGER,
        speed DECIMAL(6, 2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    `;
        try {
            yield (0, util_1.query)(createDriverLocationHistoryTableQuery);
            console.log('Driver location history table created successfully');
        }
        catch (error) {
            console.error('Error creating driver location history table:', error);
            throw error;
        }
    });
}
