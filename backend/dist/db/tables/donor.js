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
exports.createDonorTable = createDonorTable;
const util_1 = require("../util");
function createDonorTable() {
    return __awaiter(this, void 0, void 0, function* () {
        const createDonorTableQuery = `
        CREATE TABLE IF NOT EXISTS donors (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            donor_type VARCHAR(50),
            organization_name VARCHAR(255),
            organization_details TEXT,
            contact_person VARCHAR(255),
            contact_number VARCHAR(50),
            operating_hours VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
        try {
            yield (0, util_1.query)(createDonorTableQuery);
            console.log('Donor table created successfully');
        }
        catch (error) {
            console.error('Error creating donor table:', error);
            throw error;
        }
    });
}
