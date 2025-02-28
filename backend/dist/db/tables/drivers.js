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
exports.createDriversTable = createDriversTable;
const util_1 = require("../util");
function createDriversTable() {
    return __awaiter(this, void 0, void 0, function* () {
        const createDriversTableQuery = `
        CREATE TABLE IF NOT EXISTS drivers (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            phone VARCHAR(15) NOT NULL UNIQUE,
            address VARCHAR(255),
            profile_picture VARCHAR(255),
            vehicle_type VARCHAR(50) NOT NULL,
            vehicle_number VARCHAR(50) NOT NULL,
            license_number VARCHAR(50) NOT NULL,
            availability_status VARCHAR(20) DEFAULT 'OFFLINE',
            current_location POINT,
            service_area VARCHAR(255),
            max_delivery_distance INTEGER,
            rating DECIMAL(3,2) DEFAULT 0.00,
            total_deliveries INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
        yield (0, util_1.query)(createDriversTableQuery);
    });
}
