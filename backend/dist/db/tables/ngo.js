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
exports.createNGOTable = createNGOTable;
const util_1 = require("../util");
function createNGOTable() {
    return __awaiter(this, void 0, void 0, function* () {
        const createNGOTableQuery = `
  CREATE TABLE IF NOT EXISTS ngos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    ngo_name VARCHAR(255),
    mission_statement TEXT,
    contact_person VARCHAR(255),
    contact_number VARCHAR(50),
    operating_hours VARCHAR(255),
    target_demographics TEXT,
    ngo_type VARCHAR(50),
    registration_number VARCHAR(100),
    registration_certificate VARCHAR(255),
    pan_number VARCHAR(20),
    pan_card_image VARCHAR(255),
    fcra_number VARCHAR(100),
    fcra_certificate VARCHAR(255),
    tax_exemption_certificate VARCHAR(255),
    annual_reports_link VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

    `;
        try {
            yield (0, util_1.query)(createNGOTableQuery);
            console.log('NGO table created successfully');
        }
        catch (error) {
            console.error('Error creating NGO table:', error);
            throw error;
        }
    });
}
