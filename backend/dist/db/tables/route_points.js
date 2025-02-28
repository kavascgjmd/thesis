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
exports.createRoutePointsTable = createRoutePointsTable;
const util_1 = require("../util");
function createRoutePointsTable() {
    return __awaiter(this, void 0, void 0, function* () {
        const createRoutePointsTableQuery = `
        CREATE TABLE IF NOT EXISTS route_points (
            id SERIAL PRIMARY KEY,
            route_id INTEGER REFERENCES delivery_routes(id) ON DELETE CASCADE,
            point_order INTEGER NOT NULL,
            point_type VARCHAR(20) NOT NULL, -- 'pickup' or 'delivery'
            location_id INTEGER, -- ID of the donor or NGO
            latitude DECIMAL(10, 6) NOT NULL,
            longitude DECIMAL(10, 6) NOT NULL,
            address TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
        yield (0, util_1.query)(createRoutePointsTableQuery);
    });
}
